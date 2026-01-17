"""
Alert Evaluation Engine

Evaluates incoming metrics against configured alert rules and triggers alerts.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import AlertRule, Alert
from app.db.base import async_session_factory

logger = logging.getLogger(__name__)


class AlertEngine:
    """
    Evaluates metrics against alert rules and creates alerts when conditions are met.
    """

    def __init__(self):
        self.cooldowns: Dict[str, datetime] = {}  # rule_id:host_id -> last_triggered
        self._running = False
        self._rules_cache: List[AlertRule] = []
        self._cache_time: Optional[datetime] = None
        self._cache_ttl = timedelta(minutes=5)
        self._default_cooldown_minutes = 5

    async def start(self):
        """Start the alert engine background task."""
        self._running = True
        logger.info("Alert engine started")

    async def stop(self):
        """Stop the alert engine."""
        self._running = False
        logger.info("Alert engine stopped")

    async def refresh_rules_cache(self, db: AsyncSession):
        """Refresh the cached alert rules."""
        result = await db.execute(
            select(AlertRule).where(AlertRule.enabled == "true")
        )
        self._rules_cache = list(result.scalars().all())
        self._cache_time = datetime.utcnow()
        logger.debug(f"Refreshed alert rules cache: {len(self._rules_cache)} rules")

    async def get_active_rules(self, db: AsyncSession) -> List[AlertRule]:
        """Get active alert rules, using cache if available."""
        if (
            self._cache_time is None
            or datetime.utcnow() - self._cache_time > self._cache_ttl
        ):
            await self.refresh_rules_cache(db)
        return self._rules_cache

    def _check_cooldown(self, rule_id: str, host_id: str, cooldown_minutes: int) -> bool:
        """Check if an alert is still in cooldown period."""
        key = f"{rule_id}:{host_id}"
        if key in self.cooldowns:
            last_triggered = self.cooldowns[key]
            if datetime.utcnow() - last_triggered < timedelta(minutes=cooldown_minutes):
                return True
        return False

    def _set_cooldown(self, rule_id: str, host_id: str):
        """Set cooldown for a rule/host combination."""
        key = f"{rule_id}:{host_id}"
        self.cooldowns[key] = datetime.utcnow()

    def _extract_metric_value(self, metric_data: Dict[str, Any], field_path: str) -> Optional[float]:
        """
        Extract a value from metric data using dot notation.
        Example: "cpu.percent" extracts metric_data["cpu"]["percent"]
        """
        try:
            value = metric_data
            for key in field_path.split('.'):
                if isinstance(value, dict):
                    value = value.get(key)
                else:
                    return None
            if value is not None:
                return float(value)
        except (KeyError, TypeError, ValueError) as e:
            logger.debug(f"Failed to extract {field_path}: {e}")
        return None

    def _evaluate_condition(
        self,
        value: float,
        operator: str,
        threshold: float
    ) -> bool:
        """Evaluate a condition against a value."""
        operators = {
            '>': lambda v, t: v > t,
            '<': lambda v, t: v < t,
            '>=': lambda v, t: v >= t,
            '<=': lambda v, t: v <= t,
            '==': lambda v, t: v == t,
            '!=': lambda v, t: v != t,
            'gt': lambda v, t: v > t,
            'lt': lambda v, t: v < t,
            'gte': lambda v, t: v >= t,
            'lte': lambda v, t: v <= t,
        }
        op_func = operators.get(operator)
        if op_func:
            return op_func(value, threshold)
        logger.warning(f"Unknown operator: {operator}")
        return False

    async def evaluate_metrics(
        self,
        host_id: UUID,
        metric_type: str,
        metric_data: Dict[str, Any],
        db: AsyncSession
    ) -> List[Alert]:
        """
        Evaluate metrics against all active rules and return triggered alerts.
        """
        triggered_alerts = []

        try:
            rules = await self.get_active_rules(db)
        except Exception as e:
            logger.warning(f"Could not fetch alert rules: {e}")
            return []

        for rule in rules:
            # Skip if metric type doesn't match
            if rule.metric_type != metric_type:
                continue

            # Check cooldown (use default if not specified in rule)
            cooldown = self._default_cooldown_minutes
            if self._check_cooldown(str(rule.id), str(host_id), cooldown):
                continue

            # Extract condition details from JSONB
            condition = rule.condition or {}

            # Support both formats: {"field": "percent", "operator": ">", "threshold": 90}
            # and {"cpu.percent": {"gt": 90}}
            field = condition.get('field')
            operator = condition.get('operator')
            threshold = condition.get('threshold')

            if not all([field, operator, threshold is not None]):
                # Try alternative format
                for key, cond in condition.items():
                    if isinstance(cond, dict):
                        field = key
                        for op, thresh in cond.items():
                            operator = op
                            threshold = thresh
                            break
                        break

            if not all([field, operator, threshold is not None]):
                logger.warning(f"Invalid condition for rule {rule.id}: {condition}")
                continue

            # Extract metric value
            value = self._extract_metric_value(metric_data, field)
            if value is None:
                continue

            # Evaluate condition
            if self._evaluate_condition(value, operator, float(threshold)):
                # Create alert with fields that exist in the model
                alert = Alert(
                    host_id=host_id,
                    rule_id=rule.id,
                    severity=rule.severity,
                    message=f"{rule.name}: {field} is {value:.2f} ({operator} {threshold})",
                    alert_metadata={
                        "metric_value": value,
                        "threshold_value": float(threshold),
                        "field": field,
                        "operator": operator
                    }
                )
                db.add(alert)
                triggered_alerts.append(alert)

                # Set cooldown
                self._set_cooldown(str(rule.id), str(host_id))

                logger.info(
                    f"Alert triggered: {rule.name} for host {host_id} "
                    f"({field}={value:.2f} {operator} {threshold})"
                )

        if triggered_alerts:
            await db.commit()

        return triggered_alerts


# Global alert engine instance
alert_engine = AlertEngine()


async def evaluate_and_alert(
    host_id: UUID,
    metric_type: str,
    metric_data: Dict[str, Any]
):
    """
    Convenience function to evaluate metrics and trigger alerts.
    Called from the metrics ingestion endpoint.
    """
    async with async_session_factory() as db:
        try:
            alerts = await alert_engine.evaluate_metrics(
                host_id, metric_type, metric_data, db
            )

            # Broadcast alerts via WebSocket if any were triggered
            if alerts:
                from app.api.v1.endpoints.websocket import broadcast_alert
                for alert in alerts:
                    await broadcast_alert({
                        "id": str(alert.id),
                        "host_id": str(alert.host_id),
                        "severity": alert.severity.value if hasattr(alert.severity, 'value') else str(alert.severity),
                        "message": alert.message,
                        "triggered_at": alert.triggered_at.isoformat() if alert.triggered_at else None,
                    })

            return alerts
        except Exception as e:
            logger.error(f"Error evaluating alerts: {e}", exc_info=True)
            return []


# Default alert rules to seed the database
DEFAULT_ALERT_RULES = [
    {
        "name": "High CPU Usage",
        "description": "Alert when CPU usage exceeds 90%",
        "metric_type": "cpu",
        "condition": {"field": "percent", "operator": ">", "threshold": 90},
        "severity": "WARNING",
    },
    {
        "name": "Critical CPU Usage",
        "description": "Alert when CPU usage exceeds 95%",
        "metric_type": "cpu",
        "condition": {"field": "percent", "operator": ">", "threshold": 95},
        "severity": "CRITICAL",
    },
    {
        "name": "High Memory Usage",
        "description": "Alert when memory usage exceeds 85%",
        "metric_type": "memory",
        "condition": {"field": "percent", "operator": ">", "threshold": 85},
        "severity": "WARNING",
    },
    {
        "name": "Critical Memory Usage",
        "description": "Alert when memory usage exceeds 95%",
        "metric_type": "memory",
        "condition": {"field": "percent", "operator": ">", "threshold": 95},
        "severity": "CRITICAL",
    },
]
