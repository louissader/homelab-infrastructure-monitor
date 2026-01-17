"""
Tests for alerts API endpoints.
"""

import pytest
from uuid import uuid4
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Host, Alert, AlertRule


@pytest.mark.asyncio
async def test_list_alerts_empty(client: AsyncClient):
    """Test listing alerts when none exist."""
    response = await client.get("/api/v1/alerts")

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_list_alert_rules_empty(client: AsyncClient):
    """Test listing alert rules when none exist."""
    response = await client.get("/api/v1/alerts/rules")

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_create_alert_rule(client: AsyncClient):
    """Test creating a new alert rule."""
    rule_data = {
        "name": "High CPU Alert",
        "description": "Alert when CPU exceeds 90%",
        "metric_type": "cpu",
        "condition": {
            "field": "percent",
            "operator": ">",
            "threshold": 90,
        },
        "severity": "warning",
    }

    response = await client.post("/api/v1/alerts/rules", json=rule_data)

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "High CPU Alert"
    assert data["metric_type"] == "cpu"
    assert data["severity"] == "warning"
    assert "id" in data


@pytest.mark.asyncio
async def test_get_alert_rule(client: AsyncClient, test_session: AsyncSession):
    """Test getting a specific alert rule."""
    # Create a rule first
    rule = AlertRule(
        id=uuid4(),
        name="Test Rule",
        metric_type="memory",
        condition={"field": "percent", "operator": ">", "threshold": 80},
        severity="warning",
    )
    test_session.add(rule)
    await test_session.commit()

    # Get the rule
    response = await client.get(f"/api/v1/alerts/rules/{rule.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Rule"


@pytest.mark.asyncio
async def test_update_alert_rule(client: AsyncClient, test_session: AsyncSession):
    """Test updating an alert rule."""
    # Create a rule first
    rule = AlertRule(
        id=uuid4(),
        name="Original Rule",
        metric_type="cpu",
        condition={"field": "percent", "operator": ">", "threshold": 80},
        severity="warning",
    )
    test_session.add(rule)
    await test_session.commit()

    # Update the rule
    update_data = {
        "name": "Updated Rule",
        "severity": "critical",
    }
    response = await client.put(f"/api/v1/alerts/rules/{rule.id}", json=update_data)

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Rule"
    assert data["severity"] == "critical"


@pytest.mark.asyncio
async def test_delete_alert_rule(client: AsyncClient, test_session: AsyncSession):
    """Test deleting an alert rule."""
    # Create a rule first
    rule = AlertRule(
        id=uuid4(),
        name="Rule to Delete",
        metric_type="disk",
        condition={"field": "percent", "operator": ">", "threshold": 90},
        severity="critical",
    )
    test_session.add(rule)
    await test_session.commit()

    # Delete the rule
    response = await client.delete(f"/api/v1/alerts/rules/{rule.id}")
    assert response.status_code == 204

    # Verify it's deleted
    get_response = await client.get(f"/api/v1/alerts/rules/{rule.id}")
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_acknowledge_alert(
    client: AsyncClient,
    test_session: AsyncSession,
    test_host: Host,
):
    """Test acknowledging an alert."""
    # Create an alert
    alert = Alert(
        id=uuid4(),
        host_id=test_host.id,
        severity="warning",
        message="Test alert",
        acknowledged=False,
        resolved=False,
    )
    test_session.add(alert)
    await test_session.commit()

    # Acknowledge the alert
    response = await client.post(f"/api/v1/alerts/{alert.id}/acknowledge")

    assert response.status_code == 200
    data = response.json()
    assert data["acknowledged"] is True


@pytest.mark.asyncio
async def test_resolve_alert(
    client: AsyncClient,
    test_session: AsyncSession,
    test_host: Host,
):
    """Test resolving an alert."""
    # Create an alert
    alert = Alert(
        id=uuid4(),
        host_id=test_host.id,
        severity="critical",
        message="Critical test alert",
        acknowledged=True,
        resolved=False,
    )
    test_session.add(alert)
    await test_session.commit()

    # Resolve the alert
    response = await client.post(f"/api/v1/alerts/{alert.id}/resolve")

    assert response.status_code == 200
    data = response.json()
    assert data["resolved"] is True


@pytest.mark.asyncio
async def test_filter_alerts_by_severity(
    client: AsyncClient,
    test_session: AsyncSession,
    test_host: Host,
):
    """Test filtering alerts by severity."""
    # Create alerts with different severities
    for severity in ["info", "warning", "critical"]:
        alert = Alert(
            id=uuid4(),
            host_id=test_host.id,
            severity=severity,
            message=f"Test {severity} alert",
        )
        test_session.add(alert)
    await test_session.commit()

    # Filter by critical
    response = await client.get("/api/v1/alerts?severity=critical")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["severity"] == "critical"
