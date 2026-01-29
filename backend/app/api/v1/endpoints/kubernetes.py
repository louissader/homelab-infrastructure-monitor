"""
Kubernetes cluster API endpoints.
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.models.models import Cluster, ClusterStatus, Host
from app.schemas.schemas import (
    Cluster as ClusterSchema,
    ClusterCreate,
    ClusterUpdate,
    ClusterSummary,
    ClusterMetrics,
    K8sNode,
    K8sPod,
    K8sDeployment,
    K8sService,
    K8sEvent,
    MessageResponse,
)
from app.services.k8s_service import KubernetesService

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# Cluster Management Endpoints
# ============================================================================

@router.get("", response_model=list[ClusterSummary])
async def list_clusters(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
):
    """List all Kubernetes clusters with summary metrics."""
    result = await db.execute(
        select(Cluster).offset(skip).limit(limit).order_by(Cluster.name)
    )
    clusters = result.scalars().all()

    summaries = []
    for cluster in clusters:
        # Get metrics from K8s service
        k8s_service = KubernetesService(cluster)
        metrics = k8s_service.get_cluster_metrics()

        summaries.append(ClusterSummary(
            id=cluster.id,
            name=cluster.name,
            status=cluster.status,
            version=cluster.version,
            node_count=metrics["total_nodes"],
            pod_count=metrics["running_pods"],
            cpu_percent=metrics["cpu_percent"],
            memory_percent=metrics["memory_percent"],
            last_sync=cluster.last_sync,
        ))

    return summaries


@router.post("", response_model=ClusterSchema, status_code=status.HTTP_201_CREATED)
async def create_cluster(
    cluster_data: ClusterCreate,
    db: AsyncSession = Depends(get_db),
):
    """Register a new Kubernetes cluster."""
    # Check for duplicate name
    existing = await db.execute(
        select(Cluster).where(Cluster.name == cluster_data.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cluster with name '{cluster_data.name}' already exists"
        )

    # Create cluster
    cluster = Cluster(
        name=cluster_data.name,
        api_server_url=cluster_data.api_server_url,
        kubeconfig_path=cluster_data.kubeconfig_path,
        status=ClusterStatus.UNKNOWN,
        cluster_metadata=cluster_data.metadata,
    )

    db.add(cluster)
    await db.commit()
    await db.refresh(cluster)

    # Try to connect and get version
    try:
        k8s_service = KubernetesService(cluster)
        version = k8s_service.get_cluster_version()
        if version:
            cluster.version = version
            cluster.status = ClusterStatus.HEALTHY
            cluster.last_sync = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(cluster)
    except Exception as e:
        logger.warning(f"Could not connect to cluster {cluster.name}: {e}")
        cluster.status = ClusterStatus.UNREACHABLE
        await db.commit()

    logger.info(f"Created Kubernetes cluster: {cluster.name} (id={cluster.id})")
    return cluster


@router.get("/{cluster_id}", response_model=ClusterSchema)
async def get_cluster(
    cluster_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific Kubernetes cluster by ID."""
    result = await db.execute(select(Cluster).where(Cluster.id == cluster_id))
    cluster = result.scalar_one_or_none()

    if not cluster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cluster not found"
        )

    return cluster


@router.put("/{cluster_id}", response_model=ClusterSchema)
async def update_cluster(
    cluster_id: UUID,
    update_data: ClusterUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a Kubernetes cluster."""
    result = await db.execute(select(Cluster).where(Cluster.id == cluster_id))
    cluster = result.scalar_one_or_none()

    if not cluster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cluster not found"
        )

    update_dict = update_data.model_dump(exclude_unset=True)
    if "metadata" in update_dict:
        update_dict["cluster_metadata"] = update_dict.pop("metadata")

    for key, value in update_dict.items():
        setattr(cluster, key, value)

    await db.commit()
    await db.refresh(cluster)

    logger.info(f"Updated Kubernetes cluster: {cluster.name}")
    return cluster


@router.delete("/{cluster_id}", response_model=MessageResponse)
async def delete_cluster(
    cluster_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a Kubernetes cluster."""
    result = await db.execute(select(Cluster).where(Cluster.id == cluster_id))
    cluster = result.scalar_one_or_none()

    if not cluster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cluster not found"
        )

    cluster_name = cluster.name
    await db.delete(cluster)
    await db.commit()

    logger.info(f"Deleted Kubernetes cluster: {cluster_name}")
    return MessageResponse(message=f"Cluster '{cluster_name}' deleted successfully")


# ============================================================================
# Cluster Sync Endpoint
# ============================================================================

@router.post("/{cluster_id}/sync", response_model=ClusterMetrics)
async def sync_cluster(
    cluster_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Trigger manual sync for a cluster and return current metrics."""
    result = await db.execute(select(Cluster).where(Cluster.id == cluster_id))
    cluster = result.scalar_one_or_none()

    if not cluster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cluster not found"
        )

    try:
        k8s_service = KubernetesService(cluster)
        metrics = k8s_service.get_cluster_metrics()

        # Update cluster status and sync time
        cluster.status = ClusterStatus.HEALTHY
        cluster.last_sync = datetime.now(timezone.utc)

        # Try to update version if not set
        if not cluster.version:
            version = k8s_service.get_cluster_version()
            if version:
                cluster.version = version

        await db.commit()

        logger.info(f"Synced Kubernetes cluster: {cluster.name}")
        return ClusterMetrics(**metrics)

    except Exception as e:
        cluster.status = ClusterStatus.UNREACHABLE
        await db.commit()
        logger.error(f"Failed to sync cluster {cluster.name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to connect to cluster: {str(e)}"
        )


# ============================================================================
# Node Endpoints
# ============================================================================

@router.get("/{cluster_id}/nodes", response_model=list[K8sNode])
async def get_cluster_nodes(
    cluster_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get all nodes in a Kubernetes cluster."""
    result = await db.execute(select(Cluster).where(Cluster.id == cluster_id))
    cluster = result.scalar_one_or_none()

    if not cluster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cluster not found"
        )

    try:
        k8s_service = KubernetesService(cluster)
        nodes = k8s_service.get_nodes()
        return [K8sNode(**node) for node in nodes]
    except Exception as e:
        logger.error(f"Failed to get nodes for cluster {cluster.name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to get nodes: {str(e)}"
        )


# ============================================================================
# Pod Endpoints
# ============================================================================

@router.get("/{cluster_id}/pods", response_model=list[K8sPod])
async def get_cluster_pods(
    cluster_id: UUID,
    namespace: Optional[str] = Query(None, description="Filter by namespace"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by pod status"),
    db: AsyncSession = Depends(get_db),
):
    """Get pods in a Kubernetes cluster."""
    result = await db.execute(select(Cluster).where(Cluster.id == cluster_id))
    cluster = result.scalar_one_or_none()

    if not cluster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cluster not found"
        )

    try:
        k8s_service = KubernetesService(cluster)
        pods = k8s_service.get_pods(namespace)

        # Apply status filter if provided
        if status_filter:
            pods = [p for p in pods if p["status"].lower() == status_filter.lower()]

        return [K8sPod(**pod) for pod in pods]
    except Exception as e:
        logger.error(f"Failed to get pods for cluster {cluster.name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to get pods: {str(e)}"
        )


# ============================================================================
# Deployment Endpoints
# ============================================================================

@router.get("/{cluster_id}/deployments", response_model=list[K8sDeployment])
async def get_cluster_deployments(
    cluster_id: UUID,
    namespace: Optional[str] = Query(None, description="Filter by namespace"),
    db: AsyncSession = Depends(get_db),
):
    """Get deployments in a Kubernetes cluster."""
    result = await db.execute(select(Cluster).where(Cluster.id == cluster_id))
    cluster = result.scalar_one_or_none()

    if not cluster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cluster not found"
        )

    try:
        k8s_service = KubernetesService(cluster)
        deployments = k8s_service.get_deployments(namespace)
        return [K8sDeployment(**d) for d in deployments]
    except Exception as e:
        logger.error(f"Failed to get deployments for cluster {cluster.name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to get deployments: {str(e)}"
        )


# ============================================================================
# Service Endpoints
# ============================================================================

@router.get("/{cluster_id}/services", response_model=list[K8sService])
async def get_cluster_services(
    cluster_id: UUID,
    namespace: Optional[str] = Query(None, description="Filter by namespace"),
    db: AsyncSession = Depends(get_db),
):
    """Get services in a Kubernetes cluster."""
    result = await db.execute(select(Cluster).where(Cluster.id == cluster_id))
    cluster = result.scalar_one_or_none()

    if not cluster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cluster not found"
        )

    try:
        k8s_service = KubernetesService(cluster)
        services = k8s_service.get_services(namespace)
        return [K8sService(**s) for s in services]
    except Exception as e:
        logger.error(f"Failed to get services for cluster {cluster.name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to get services: {str(e)}"
        )


# ============================================================================
# Events Endpoint
# ============================================================================

@router.get("/{cluster_id}/events", response_model=list[K8sEvent])
async def get_cluster_events(
    cluster_id: UUID,
    namespace: Optional[str] = Query(None, description="Filter by namespace"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of events"),
    db: AsyncSession = Depends(get_db),
):
    """Get recent events from a Kubernetes cluster."""
    result = await db.execute(select(Cluster).where(Cluster.id == cluster_id))
    cluster = result.scalar_one_or_none()

    if not cluster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cluster not found"
        )

    try:
        k8s_service = KubernetesService(cluster)
        events = k8s_service.get_events(namespace, limit)
        return [K8sEvent(**e) for e in events]
    except Exception as e:
        logger.error(f"Failed to get events for cluster {cluster.name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to get events: {str(e)}"
        )


# ============================================================================
# Metrics Endpoint
# ============================================================================

@router.get("/{cluster_id}/metrics", response_model=ClusterMetrics)
async def get_cluster_metrics(
    cluster_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated metrics for a Kubernetes cluster."""
    result = await db.execute(select(Cluster).where(Cluster.id == cluster_id))
    cluster = result.scalar_one_or_none()

    if not cluster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cluster not found"
        )

    try:
        k8s_service = KubernetesService(cluster)
        metrics = k8s_service.get_cluster_metrics()
        return ClusterMetrics(**metrics)
    except Exception as e:
        logger.error(f"Failed to get metrics for cluster {cluster.name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to get metrics: {str(e)}"
        )


# ============================================================================
# Namespaces Endpoint
# ============================================================================

@router.get("/{cluster_id}/namespaces", response_model=list[str])
async def get_cluster_namespaces(
    cluster_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get all namespaces in a Kubernetes cluster."""
    result = await db.execute(select(Cluster).where(Cluster.id == cluster_id))
    cluster = result.scalar_one_or_none()

    if not cluster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cluster not found"
        )

    try:
        k8s_service = KubernetesService(cluster)
        pods = k8s_service.get_pods()
        namespaces = sorted(set(p["namespace"] for p in pods))
        return namespaces
    except Exception as e:
        logger.error(f"Failed to get namespaces for cluster {cluster.name}: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to get namespaces: {str(e)}"
        )
