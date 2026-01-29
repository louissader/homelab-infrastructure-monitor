"""
Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict

from app.models.models import HostStatus, AlertSeverity, ClusterStatus


# ============================================================================
# Host Schemas
# ============================================================================

class HostBase(BaseModel):
    """Base host schema."""
    name: str = Field(..., min_length=1, max_length=255)
    hostname: str = Field(..., min_length=1, max_length=255)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class HostCreate(HostBase):
    """Schema for creating a new host."""
    api_key: Optional[str] = None  # If not provided, one will be generated


class HostUpdate(BaseModel):
    """Schema for updating a host."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    hostname: Optional[str] = Field(None, min_length=1, max_length=255)
    status: Optional[HostStatus] = None
    metadata: Optional[Dict[str, Any]] = None


class Host(BaseModel):
    """Schema for host response."""
    id: UUID
    name: str
    hostname: str
    status: HostStatus
    last_seen: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict, alias="host_metadata")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class HostWithKey(Host):
    """Schema for host response with API key (only on creation)."""
    api_key: str


# ============================================================================
# Metric Schemas
# ============================================================================

class MetricBase(BaseModel):
    """Base metric schema."""
    timestamp: datetime
    metric_type: str = Field(..., min_length=1, max_length=50)
    metric_data: Dict[str, Any]


class MetricCreate(MetricBase):
    """Schema for creating a new metric."""
    host_id: UUID


class Metric(MetricBase):
    """Schema for metric response."""
    id: int
    host_id: UUID

    model_config = ConfigDict(from_attributes=True)


class MetricPayload(BaseModel):
    """Schema for metric payload from agent."""
    timestamp: datetime
    system: Dict[str, Any]
    metrics: Dict[str, Any]
    containers: List[Dict[str, Any]] = Field(default_factory=list)
    health_checks: List[Dict[str, Any]] = Field(default_factory=list)


class MetricQuery(BaseModel):
    """Schema for querying metrics."""
    host_id: Optional[UUID] = None
    metric_type: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    aggregation: Optional[str] = Field(None, pattern="^(none|avg|min|max|sum)$")
    interval: Optional[str] = Field(None, pattern="^(1m|5m|15m|1h|6h|1d)$")
    limit: int = Field(default=1000, ge=1, le=10000)
    offset: int = Field(default=0, ge=0)


# ============================================================================
# Alert Schemas
# ============================================================================

class AlertRuleBase(BaseModel):
    """Base alert rule schema."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    metric_type: str = Field(..., min_length=1, max_length=50)
    condition: Dict[str, Any]
    severity: AlertSeverity
    duration_seconds: int = Field(default=0, ge=0)
    enabled: str = "true"  # String to match DB model
    notification_channels: List[str] = Field(default_factory=list)


class AlertRuleCreate(AlertRuleBase):
    """Schema for creating an alert rule."""
    host_id: Optional[UUID] = None


class AlertRuleUpdate(BaseModel):
    """Schema for updating an alert rule."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    condition: Optional[Dict[str, Any]] = None
    severity: Optional[AlertSeverity] = None
    duration_seconds: Optional[int] = Field(None, ge=0)
    enabled: Optional[str] = None  # String to match DB model
    notification_channels: Optional[List[str]] = None


class AlertRule(AlertRuleBase):
    """Schema for alert rule response."""
    id: UUID
    host_id: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AlertBase(BaseModel):
    """Base alert schema."""
    severity: AlertSeverity
    message: str


class AlertCreate(AlertBase):
    """Schema for creating an alert."""
    host_id: UUID
    rule_id: Optional[UUID] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Alert(AlertBase):
    """Schema for alert response."""
    id: UUID
    host_id: UUID
    rule_id: Optional[UUID] = None
    triggered_at: datetime
    resolved_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict, alias="alert_metadata")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AlertAcknowledge(BaseModel):
    """Schema for acknowledging an alert."""
    acknowledged_by: str = Field(..., min_length=1, max_length=255)


# ============================================================================
# Response Schemas
# ============================================================================

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    environment: str


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str


class PaginatedResponse(BaseModel):
    """Paginated response wrapper."""
    items: List[Any]
    total: int
    limit: int
    offset: int
    has_more: bool


# ============================================================================
# WebSocket Schemas
# ============================================================================

class WSMessage(BaseModel):
    """WebSocket message schema."""
    type: str
    data: Any
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# Kubernetes Schemas
# ============================================================================

class ClusterBase(BaseModel):
    """Base cluster schema."""
    name: str = Field(..., min_length=1, max_length=255)
    api_server_url: Optional[str] = Field(None, max_length=512)
    kubeconfig_path: Optional[str] = Field(None, max_length=512)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ClusterCreate(ClusterBase):
    """Schema for creating a new cluster."""
    pass


class ClusterUpdate(BaseModel):
    """Schema for updating a cluster."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    api_server_url: Optional[str] = Field(None, max_length=512)
    kubeconfig_path: Optional[str] = Field(None, max_length=512)
    status: Optional[ClusterStatus] = None
    metadata: Optional[Dict[str, Any]] = None


class Cluster(ClusterBase):
    """Schema for cluster response."""
    id: UUID
    status: ClusterStatus
    version: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_sync: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict, alias="cluster_metadata")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ClusterSummary(BaseModel):
    """Schema for cluster summary in list view."""
    id: UUID
    name: str
    status: ClusterStatus
    version: Optional[str] = None
    node_count: int = 0
    pod_count: int = 0
    cpu_percent: float = 0
    memory_percent: float = 0
    last_sync: Optional[datetime] = None


# Kubernetes Resource Schemas

class K8sNodeCondition(BaseModel):
    """Kubernetes node condition."""
    type: str
    status: str
    reason: Optional[str] = None
    message: Optional[str] = None


class K8sNodeResources(BaseModel):
    """Kubernetes node resources."""
    cpu: str
    memory: str
    pods: Optional[str] = None
    storage: Optional[str] = None


class K8sNode(BaseModel):
    """Kubernetes node schema."""
    name: str
    status: str  # Ready, NotReady, Unknown
    role: str  # control-plane, worker
    conditions: List[K8sNodeCondition] = Field(default_factory=list)
    capacity: K8sNodeResources
    allocatable: K8sNodeResources
    cpu_percent: float = 0
    memory_percent: float = 0
    pod_count: int = 0
    created_at: Optional[datetime] = None
    labels: Dict[str, str] = Field(default_factory=dict)
    taints: List[Dict[str, str]] = Field(default_factory=list)


class K8sContainerStatus(BaseModel):
    """Kubernetes container status."""
    name: str
    ready: bool
    restart_count: int = 0
    state: str  # running, waiting, terminated
    image: str


class K8sPod(BaseModel):
    """Kubernetes pod schema."""
    name: str
    namespace: str
    status: str  # Running, Pending, Failed, Succeeded, Unknown
    phase: str
    ready: bool
    restart_count: int = 0
    cpu_percent: float = 0
    memory_percent: float = 0
    memory_bytes: int = 0
    node_name: Optional[str] = None
    ip: Optional[str] = None
    created_at: Optional[datetime] = None
    containers: List[K8sContainerStatus] = Field(default_factory=list)
    labels: Dict[str, str] = Field(default_factory=dict)


class K8sDeployment(BaseModel):
    """Kubernetes deployment schema."""
    name: str
    namespace: str
    replicas: int
    ready_replicas: int = 0
    available_replicas: int = 0
    updated_replicas: int = 0
    status: str  # Available, Progressing, Degraded
    created_at: Optional[datetime] = None
    labels: Dict[str, str] = Field(default_factory=dict)


class K8sService(BaseModel):
    """Kubernetes service schema."""
    name: str
    namespace: str
    type: str  # ClusterIP, NodePort, LoadBalancer, ExternalName
    cluster_ip: Optional[str] = None
    external_ip: Optional[str] = None
    ports: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    labels: Dict[str, str] = Field(default_factory=dict)


class K8sEvent(BaseModel):
    """Kubernetes event schema."""
    type: str  # Normal, Warning
    reason: str
    message: str
    involved_object: str
    namespace: str
    timestamp: datetime
    count: int = 1


class ClusterMetrics(BaseModel):
    """Cluster-wide metrics summary."""
    cluster_id: UUID
    timestamp: datetime
    total_nodes: int
    ready_nodes: int
    total_pods: int
    running_pods: int
    total_deployments: int
    available_deployments: int
    total_cpu_millicores: int
    used_cpu_millicores: int
    cpu_percent: float
    total_memory_bytes: int
    used_memory_bytes: int
    memory_percent: float
