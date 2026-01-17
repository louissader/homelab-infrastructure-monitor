"""
Tests for the alert evaluation engine.
"""

import pytest
from uuid import uuid4

from app.core.alert_engine import AlertEngine


class TestAlertEngine:
    """Test cases for AlertEngine class."""

    def test_extract_metric_value_simple(self):
        """Test extracting simple metric values."""
        engine = AlertEngine()
        metric_data = {"percent": 85.5}

        value = engine._extract_metric_value(metric_data, "percent")

        assert value == 85.5

    def test_extract_metric_value_nested(self):
        """Test extracting nested metric values."""
        engine = AlertEngine()
        metric_data = {
            "cpu": {
                "percent": 45.0,
                "load_avg": {"1min": 1.5},
            }
        }

        value = engine._extract_metric_value(metric_data, "cpu.percent")
        assert value == 45.0

        load_value = engine._extract_metric_value(metric_data, "cpu.load_avg.1min")
        assert load_value == 1.5

    def test_extract_metric_value_missing(self):
        """Test extracting non-existent metric values."""
        engine = AlertEngine()
        metric_data = {"percent": 50.0}

        value = engine._extract_metric_value(metric_data, "nonexistent")

        assert value is None

    def test_evaluate_condition_greater_than(self):
        """Test > condition evaluation."""
        engine = AlertEngine()

        assert engine._evaluate_condition(95.0, ">", 90.0) is True
        assert engine._evaluate_condition(85.0, ">", 90.0) is False
        assert engine._evaluate_condition(90.0, ">", 90.0) is False

    def test_evaluate_condition_less_than(self):
        """Test < condition evaluation."""
        engine = AlertEngine()

        assert engine._evaluate_condition(5.0, "<", 10.0) is True
        assert engine._evaluate_condition(15.0, "<", 10.0) is False
        assert engine._evaluate_condition(10.0, "<", 10.0) is False

    def test_evaluate_condition_greater_equal(self):
        """Test >= condition evaluation."""
        engine = AlertEngine()

        assert engine._evaluate_condition(95.0, ">=", 90.0) is True
        assert engine._evaluate_condition(90.0, ">=", 90.0) is True
        assert engine._evaluate_condition(85.0, ">=", 90.0) is False

    def test_evaluate_condition_less_equal(self):
        """Test <= condition evaluation."""
        engine = AlertEngine()

        assert engine._evaluate_condition(5.0, "<=", 10.0) is True
        assert engine._evaluate_condition(10.0, "<=", 10.0) is True
        assert engine._evaluate_condition(15.0, "<=", 10.0) is False

    def test_evaluate_condition_equal(self):
        """Test == condition evaluation."""
        engine = AlertEngine()

        assert engine._evaluate_condition(10.0, "==", 10.0) is True
        assert engine._evaluate_condition(10.0, "==", 5.0) is False

    def test_evaluate_condition_not_equal(self):
        """Test != condition evaluation."""
        engine = AlertEngine()

        assert engine._evaluate_condition(10.0, "!=", 5.0) is True
        assert engine._evaluate_condition(10.0, "!=", 10.0) is False

    def test_evaluate_condition_invalid_operator(self):
        """Test invalid operator returns False."""
        engine = AlertEngine()

        assert engine._evaluate_condition(10.0, "invalid", 5.0) is False

    def test_cooldown_management(self):
        """Test cooldown tracking."""
        engine = AlertEngine()
        rule_id = str(uuid4())
        host_id = str(uuid4())

        # Initially no cooldown
        assert engine._check_cooldown(rule_id, host_id, 5) is False

        # Set cooldown
        engine._set_cooldown(rule_id, host_id)

        # Now should be in cooldown
        assert engine._check_cooldown(rule_id, host_id, 5) is True

    def test_cooldown_different_hosts(self):
        """Test cooldowns are per-host."""
        engine = AlertEngine()
        rule_id = str(uuid4())
        host_id_1 = str(uuid4())
        host_id_2 = str(uuid4())

        # Set cooldown for host 1
        engine._set_cooldown(rule_id, host_id_1)

        # Host 1 should be in cooldown
        assert engine._check_cooldown(rule_id, host_id_1, 5) is True

        # Host 2 should not be in cooldown
        assert engine._check_cooldown(rule_id, host_id_2, 5) is False
