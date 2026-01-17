"""Initial schema creation

Revision ID: 001
Revises:
Create Date: 2024-01-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create hosts table
    op.create_table(
        'hosts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False, unique=True),
        sa.Column('hostname', sa.String(255), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='unknown'),
        sa.Column('last_seen', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column('metadata', postgresql.JSONB, nullable=True, server_default='{}'),
    )
    op.create_index('ix_hosts_name', 'hosts', ['name'])
    op.create_index('ix_hosts_status', 'hosts', ['status'])

    # Create api_keys table
    op.create_table(
        'api_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('host_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('hosts.id', ondelete='CASCADE'), nullable=True),
        sa.Column('key_hash', sa.String(128), nullable=False, unique=True),
        sa.Column('key_type', sa.String(20), nullable=False, server_default='agent'),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_used', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_api_keys_key_hash', 'api_keys', ['key_hash'])
    op.create_index('ix_api_keys_host_id', 'api_keys', ['host_id'])

    # Create metrics table
    op.create_table(
        'metrics',
        sa.Column('id', sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column('host_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('hosts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('metric_type', sa.String(50), nullable=False),
        sa.Column('metric_data', postgresql.JSONB, nullable=False),
    )
    op.create_index('ix_metrics_host_id', 'metrics', ['host_id'])
    op.create_index('ix_metrics_timestamp', 'metrics', ['timestamp'])
    op.create_index('ix_metrics_metric_type', 'metrics', ['metric_type'])
    op.create_index('ix_metrics_host_timestamp', 'metrics', ['host_id', 'timestamp'])

    # Create alert_rules table
    op.create_table(
        'alert_rules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('metric_type', sa.String(50), nullable=False),
        sa.Column('condition', postgresql.JSONB, nullable=False),
        sa.Column('severity', sa.String(20), nullable=False, server_default='warning'),
        sa.Column('is_enabled', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('cooldown_minutes', sa.Integer, nullable=False, server_default='5'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
    )
    op.create_index('ix_alert_rules_metric_type', 'alert_rules', ['metric_type'])
    op.create_index('ix_alert_rules_is_enabled', 'alert_rules', ['is_enabled'])

    # Create alerts table
    op.create_table(
        'alerts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('host_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('hosts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('rule_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('alert_rules.id', ondelete='SET NULL'), nullable=True),
        sa.Column('severity', sa.String(20), nullable=False),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('metric_value', sa.Float, nullable=True),
        sa.Column('threshold_value', sa.Float, nullable=True),
        sa.Column('triggered_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('acknowledged', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('acknowledged_by', sa.String(255), nullable=True),
        sa.Column('resolved', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_alerts_host_id', 'alerts', ['host_id'])
    op.create_index('ix_alerts_severity', 'alerts', ['severity'])
    op.create_index('ix_alerts_resolved', 'alerts', ['resolved'])
    op.create_index('ix_alerts_triggered_at', 'alerts', ['triggered_at'])


def downgrade() -> None:
    op.drop_table('alerts')
    op.drop_table('alert_rules')
    op.drop_table('metrics')
    op.drop_table('api_keys')
    op.drop_table('hosts')
