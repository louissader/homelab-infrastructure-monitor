"""
Kubernetes service for interacting with K8s clusters.
Supports both real cluster connections and mock mode for testing.
"""

import logging
import random
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from app.models.models import Cluster

logger = logging.getLogger(__name__)


class KubernetesService:
    """Service for interacting with Kubernetes clusters."""

    def __init__(self, cluster: Cluster):
        """
        Initialize the Kubernetes service.

        Args:
            cluster: The Cluster model instance
        """
        self.cluster = cluster
        self.mock_mode = cluster.kubeconfig_path == "mock"

        if not self.mock_mode:
            try:
                from kubernetes import client, config

                if cluster.kubeconfig_path:
                    config.load_kube_config(config_file=cluster.kubeconfig_path)
                else:
                    # Try in-cluster config for running inside K8s
                    config.load_incluster_config()

                self.core_v1 = client.CoreV1Api()
                self.apps_v1 = client.AppsV1Api()
                logger.info(f"Connected to Kubernetes cluster: {cluster.name}")
            except Exception as e:
                logger.error(f"Failed to connect to Kubernetes cluster {cluster.name}: {e}")
                # Fall back to mock mode if connection fails
                self.mock_mode = True
                logger.info(f"Falling back to mock mode for cluster: {cluster.name}")

    def get_cluster_version(self) -> Optional[str]:
        """Get the Kubernetes cluster version."""
        if self.mock_mode:
            return "v1.28.2"

        try:
            from kubernetes import client
            version_api = client.VersionApi()
            version_info = version_api.get_code()
            return version_info.git_version
        except Exception as e:
            logger.error(f"Failed to get cluster version: {e}")
            return None

    def get_nodes(self) -> list[dict]:
        """Get all nodes with status and resources."""
        if self.mock_mode:
            return self._get_mock_nodes()

        try:
            nodes = self.core_v1.list_node()
            return [self._parse_node(n) for n in nodes.items]
        except Exception as e:
            logger.error(f"Failed to get nodes: {e}")
            return []

    def get_pods(self, namespace: Optional[str] = None) -> list[dict]:
        """Get pods with status, restarts, resource usage."""
        if self.mock_mode:
            return self._get_mock_pods(namespace)

        try:
            if namespace:
                pods = self.core_v1.list_namespaced_pod(namespace)
            else:
                pods = self.core_v1.list_pod_for_all_namespaces()
            return [self._parse_pod(p) for p in pods.items]
        except Exception as e:
            logger.error(f"Failed to get pods: {e}")
            return []

    def get_deployments(self, namespace: Optional[str] = None) -> list[dict]:
        """Get deployments with replica status."""
        if self.mock_mode:
            return self._get_mock_deployments(namespace)

        try:
            if namespace:
                deployments = self.apps_v1.list_namespaced_deployment(namespace)
            else:
                deployments = self.apps_v1.list_deployment_for_all_namespaces()
            return [self._parse_deployment(d) for d in deployments.items]
        except Exception as e:
            logger.error(f"Failed to get deployments: {e}")
            return []

    def get_services(self, namespace: Optional[str] = None) -> list[dict]:
        """Get services with their endpoints."""
        if self.mock_mode:
            return self._get_mock_services(namespace)

        try:
            if namespace:
                services = self.core_v1.list_namespaced_service(namespace)
            else:
                services = self.core_v1.list_service_for_all_namespaces()
            return [self._parse_service(s) for s in services.items]
        except Exception as e:
            logger.error(f"Failed to get services: {e}")
            return []

    def get_events(self, namespace: Optional[str] = None, limit: int = 50) -> list[dict]:
        """Get recent cluster events."""
        if self.mock_mode:
            return self._get_mock_events(namespace)

        try:
            if namespace:
                events = self.core_v1.list_namespaced_event(namespace, limit=limit)
            else:
                events = self.core_v1.list_event_for_all_namespaces(limit=limit)
            return [self._parse_event(e) for e in events.items]
        except Exception as e:
            logger.error(f"Failed to get events: {e}")
            return []

    def get_cluster_metrics(self) -> dict:
        """Aggregate cluster-wide metrics."""
        nodes = self.get_nodes()
        pods = self.get_pods()
        deployments = self.get_deployments()

        total_nodes = len(nodes)
        ready_nodes = sum(1 for n in nodes if n["status"] == "Ready")
        total_pods = len(pods)
        running_pods = sum(1 for p in pods if p["status"] == "Running")
        total_deployments = len(deployments)
        available_deployments = sum(1 for d in deployments if d["status"] == "Available")

        # Calculate aggregate resource usage
        total_cpu_percent = sum(n["cpu_percent"] for n in nodes) / max(total_nodes, 1)
        total_memory_percent = sum(n["memory_percent"] for n in nodes) / max(total_nodes, 1)

        return {
            "cluster_id": str(self.cluster.id),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "total_nodes": total_nodes,
            "ready_nodes": ready_nodes,
            "total_pods": total_pods,
            "running_pods": running_pods,
            "total_deployments": total_deployments,
            "available_deployments": available_deployments,
            "total_cpu_millicores": total_nodes * 4000,  # Placeholder
            "used_cpu_millicores": int(total_nodes * 4000 * total_cpu_percent / 100),
            "cpu_percent": round(total_cpu_percent, 1),
            "total_memory_bytes": total_nodes * 16 * 1024 * 1024 * 1024,  # Placeholder
            "used_memory_bytes": int(total_nodes * 16 * 1024 * 1024 * 1024 * total_memory_percent / 100),
            "memory_percent": round(total_memory_percent, 1),
        }

    # =========================================================================
    # Parser methods for real K8s objects
    # =========================================================================

    def _parse_node(self, node) -> dict:
        """Parse a K8s Node object into a dict."""
        conditions = node.status.conditions or []
        ready_condition = next((c for c in conditions if c.type == "Ready"), None)
        status = "Ready" if ready_condition and ready_condition.status == "True" else "NotReady"

        labels = node.metadata.labels or {}
        role = "control-plane" if any("control-plane" in k or "master" in k for k in labels) else "worker"

        capacity = node.status.capacity or {}
        allocatable = node.status.allocatable or {}

        return {
            "name": node.metadata.name,
            "status": status,
            "role": role,
            "conditions": [
                {
                    "type": c.type,
                    "status": c.status,
                    "reason": c.reason,
                    "message": c.message,
                }
                for c in conditions
            ],
            "capacity": {
                "cpu": capacity.get("cpu", "0"),
                "memory": capacity.get("memory", "0"),
                "pods": capacity.get("pods", "0"),
                "storage": capacity.get("ephemeral-storage", "0"),
            },
            "allocatable": {
                "cpu": allocatable.get("cpu", "0"),
                "memory": allocatable.get("memory", "0"),
                "pods": allocatable.get("pods", "0"),
                "storage": allocatable.get("ephemeral-storage", "0"),
            },
            "cpu_percent": 0,  # Would need metrics-server for actual values
            "memory_percent": 0,
            "pod_count": 0,
            "created_at": node.metadata.creation_timestamp.isoformat() if node.metadata.creation_timestamp else None,
            "labels": labels,
            "taints": [
                {"key": t.key, "value": t.value, "effect": t.effect}
                for t in (node.spec.taints or [])
            ],
        }

    def _parse_pod(self, pod) -> dict:
        """Parse a K8s Pod object into a dict."""
        container_statuses = pod.status.container_statuses or []
        restart_count = sum(cs.restart_count for cs in container_statuses)
        ready = all(cs.ready for cs in container_statuses) if container_statuses else False

        phase = pod.status.phase or "Unknown"
        status = phase
        if phase == "Running" and not ready:
            status = "NotReady"

        containers = []
        for cs in container_statuses:
            state = "unknown"
            if cs.state.running:
                state = "running"
            elif cs.state.waiting:
                state = "waiting"
            elif cs.state.terminated:
                state = "terminated"

            containers.append({
                "name": cs.name,
                "ready": cs.ready,
                "restart_count": cs.restart_count,
                "state": state,
                "image": cs.image,
            })

        return {
            "name": pod.metadata.name,
            "namespace": pod.metadata.namespace,
            "status": status,
            "phase": phase,
            "ready": ready,
            "restart_count": restart_count,
            "cpu_percent": 0,  # Would need metrics-server
            "memory_percent": 0,
            "memory_bytes": 0,
            "node_name": pod.spec.node_name,
            "ip": pod.status.pod_ip,
            "created_at": pod.metadata.creation_timestamp.isoformat() if pod.metadata.creation_timestamp else None,
            "containers": containers,
            "labels": pod.metadata.labels or {},
        }

    def _parse_deployment(self, deployment) -> dict:
        """Parse a K8s Deployment object into a dict."""
        spec_replicas = deployment.spec.replicas or 0
        status_obj = deployment.status
        ready_replicas = status_obj.ready_replicas or 0
        available_replicas = status_obj.available_replicas or 0
        updated_replicas = status_obj.updated_replicas or 0

        if available_replicas == spec_replicas:
            status = "Available"
        elif updated_replicas < spec_replicas:
            status = "Progressing"
        else:
            status = "Degraded"

        return {
            "name": deployment.metadata.name,
            "namespace": deployment.metadata.namespace,
            "replicas": spec_replicas,
            "ready_replicas": ready_replicas,
            "available_replicas": available_replicas,
            "updated_replicas": updated_replicas,
            "status": status,
            "created_at": deployment.metadata.creation_timestamp.isoformat() if deployment.metadata.creation_timestamp else None,
            "labels": deployment.metadata.labels or {},
        }

    def _parse_service(self, service) -> dict:
        """Parse a K8s Service object into a dict."""
        spec = service.spec
        ports = [
            {
                "name": p.name,
                "port": p.port,
                "target_port": str(p.target_port),
                "protocol": p.protocol,
                "node_port": p.node_port,
            }
            for p in (spec.ports or [])
        ]

        external_ips = spec.external_i_ps or []

        return {
            "name": service.metadata.name,
            "namespace": service.metadata.namespace,
            "type": spec.type,
            "cluster_ip": spec.cluster_ip,
            "external_ip": external_ips[0] if external_ips else None,
            "ports": ports,
            "created_at": service.metadata.creation_timestamp.isoformat() if service.metadata.creation_timestamp else None,
            "labels": service.metadata.labels or {},
        }

    def _parse_event(self, event) -> dict:
        """Parse a K8s Event object into a dict."""
        return {
            "type": event.type,
            "reason": event.reason,
            "message": event.message,
            "involved_object": f"{event.involved_object.kind}/{event.involved_object.name}",
            "namespace": event.metadata.namespace or "default",
            "timestamp": (event.last_timestamp or event.metadata.creation_timestamp).isoformat(),
            "count": event.count or 1,
        }

    # =========================================================================
    # Mock data methods
    # =========================================================================

    def _get_mock_nodes(self) -> list[dict]:
        """Generate mock node data."""
        return [
            {
                "name": "node-1",
                "status": "Ready",
                "role": "control-plane",
                "conditions": [
                    {"type": "Ready", "status": "True", "reason": None, "message": None},
                    {"type": "MemoryPressure", "status": "False", "reason": None, "message": None},
                    {"type": "DiskPressure", "status": "False", "reason": None, "message": None},
                ],
                "capacity": {"cpu": "4", "memory": "16Gi", "pods": "110", "storage": "100Gi"},
                "allocatable": {"cpu": "3800m", "memory": "15Gi", "pods": "110", "storage": "95Gi"},
                "cpu_percent": round(random.uniform(35, 55), 1),
                "memory_percent": round(random.uniform(50, 70), 1),
                "pod_count": 15,
                "created_at": "2024-01-15T10:30:00Z",
                "labels": {"kubernetes.io/hostname": "node-1", "node-role.kubernetes.io/control-plane": ""},
                "taints": [{"key": "node-role.kubernetes.io/control-plane", "value": None, "effect": "NoSchedule"}],
            },
            {
                "name": "node-2",
                "status": "Ready",
                "role": "worker",
                "conditions": [
                    {"type": "Ready", "status": "True", "reason": None, "message": None},
                    {"type": "MemoryPressure", "status": "False", "reason": None, "message": None},
                    {"type": "DiskPressure", "status": "False", "reason": None, "message": None},
                ],
                "capacity": {"cpu": "8", "memory": "32Gi", "pods": "110", "storage": "200Gi"},
                "allocatable": {"cpu": "7800m", "memory": "31Gi", "pods": "110", "storage": "195Gi"},
                "cpu_percent": round(random.uniform(25, 45), 1),
                "memory_percent": round(random.uniform(40, 60), 1),
                "pod_count": 22,
                "created_at": "2024-01-15T10:35:00Z",
                "labels": {"kubernetes.io/hostname": "node-2", "node-role.kubernetes.io/worker": ""},
                "taints": [],
            },
            {
                "name": "node-3",
                "status": "Ready",
                "role": "worker",
                "conditions": [
                    {"type": "Ready", "status": "True", "reason": None, "message": None},
                    {"type": "MemoryPressure", "status": "False", "reason": None, "message": None},
                    {"type": "DiskPressure", "status": "False", "reason": None, "message": None},
                ],
                "capacity": {"cpu": "8", "memory": "32Gi", "pods": "110", "storage": "200Gi"},
                "allocatable": {"cpu": "7800m", "memory": "31Gi", "pods": "110", "storage": "195Gi"},
                "cpu_percent": round(random.uniform(15, 35), 1),
                "memory_percent": round(random.uniform(35, 55), 1),
                "pod_count": 18,
                "created_at": "2024-01-15T10:40:00Z",
                "labels": {"kubernetes.io/hostname": "node-3", "node-role.kubernetes.io/worker": ""},
                "taints": [],
            },
        ]

    def _get_mock_pods(self, namespace: Optional[str] = None) -> list[dict]:
        """Generate mock pod data."""
        pods = [
            # kube-system namespace
            {
                "name": "coredns-5dd5756b68-x7j2p",
                "namespace": "kube-system",
                "status": "Running",
                "phase": "Running",
                "ready": True,
                "restart_count": 0,
                "cpu_percent": round(random.uniform(1, 5), 1),
                "memory_percent": round(random.uniform(5, 15), 1),
                "memory_bytes": 50 * 1024 * 1024,
                "node_name": "node-1",
                "ip": "10.244.0.5",
                "created_at": "2024-01-15T10:35:00Z",
                "containers": [{"name": "coredns", "ready": True, "restart_count": 0, "state": "running", "image": "coredns/coredns:v1.10.1"}],
                "labels": {"k8s-app": "kube-dns"},
            },
            {
                "name": "kube-proxy-abc12",
                "namespace": "kube-system",
                "status": "Running",
                "phase": "Running",
                "ready": True,
                "restart_count": 0,
                "cpu_percent": round(random.uniform(0.5, 2), 1),
                "memory_percent": round(random.uniform(2, 8), 1),
                "memory_bytes": 30 * 1024 * 1024,
                "node_name": "node-1",
                "ip": "192.168.1.10",
                "created_at": "2024-01-15T10:31:00Z",
                "containers": [{"name": "kube-proxy", "ready": True, "restart_count": 0, "state": "running", "image": "registry.k8s.io/kube-proxy:v1.28.2"}],
                "labels": {"k8s-app": "kube-proxy"},
            },
            # default namespace
            {
                "name": "nginx-deployment-7d4b8c4f5-x2k9p",
                "namespace": "default",
                "status": "Running",
                "phase": "Running",
                "ready": True,
                "restart_count": 0,
                "cpu_percent": round(random.uniform(2, 10), 1),
                "memory_percent": round(random.uniform(5, 15), 1),
                "memory_bytes": 64 * 1024 * 1024,
                "node_name": "node-2",
                "ip": "10.244.1.10",
                "created_at": "2024-01-20T14:00:00Z",
                "containers": [{"name": "nginx", "ready": True, "restart_count": 0, "state": "running", "image": "nginx:1.25"}],
                "labels": {"app": "nginx"},
            },
            {
                "name": "nginx-deployment-7d4b8c4f5-a3m1n",
                "namespace": "default",
                "status": "Running",
                "phase": "Running",
                "ready": True,
                "restart_count": 0,
                "cpu_percent": round(random.uniform(2, 10), 1),
                "memory_percent": round(random.uniform(5, 15), 1),
                "memory_bytes": 62 * 1024 * 1024,
                "node_name": "node-3",
                "ip": "10.244.2.8",
                "created_at": "2024-01-20T14:00:00Z",
                "containers": [{"name": "nginx", "ready": True, "restart_count": 0, "state": "running", "image": "nginx:1.25"}],
                "labels": {"app": "nginx"},
            },
            {
                "name": "api-server-6f8b9c7d4e-b5k2p",
                "namespace": "default",
                "status": "Running",
                "phase": "Running",
                "ready": True,
                "restart_count": 2,
                "cpu_percent": round(random.uniform(10, 30), 1),
                "memory_percent": round(random.uniform(15, 35), 1),
                "memory_bytes": 256 * 1024 * 1024,
                "node_name": "node-2",
                "ip": "10.244.1.15",
                "created_at": "2024-01-18T09:00:00Z",
                "containers": [{"name": "api", "ready": True, "restart_count": 2, "state": "running", "image": "myapp/api:v2.1.0"}],
                "labels": {"app": "api-server"},
            },
            # monitoring namespace
            {
                "name": "prometheus-server-0",
                "namespace": "monitoring",
                "status": "Running",
                "phase": "Running",
                "ready": True,
                "restart_count": 0,
                "cpu_percent": round(random.uniform(5, 15), 1),
                "memory_percent": round(random.uniform(20, 40), 1),
                "memory_bytes": 512 * 1024 * 1024,
                "node_name": "node-3",
                "ip": "10.244.2.20",
                "created_at": "2024-01-16T12:00:00Z",
                "containers": [{"name": "prometheus", "ready": True, "restart_count": 0, "state": "running", "image": "prom/prometheus:v2.48.0"}],
                "labels": {"app": "prometheus"},
            },
            {
                "name": "grafana-5b9f8c7d6e-k8m2p",
                "namespace": "monitoring",
                "status": "Running",
                "phase": "Running",
                "ready": True,
                "restart_count": 0,
                "cpu_percent": round(random.uniform(3, 10), 1),
                "memory_percent": round(random.uniform(10, 25), 1),
                "memory_bytes": 200 * 1024 * 1024,
                "node_name": "node-2",
                "ip": "10.244.1.25",
                "created_at": "2024-01-16T12:05:00Z",
                "containers": [{"name": "grafana", "ready": True, "restart_count": 0, "state": "running", "image": "grafana/grafana:10.2.0"}],
                "labels": {"app": "grafana"},
            },
            # A pending pod
            {
                "name": "batch-job-xyz123",
                "namespace": "default",
                "status": "Pending",
                "phase": "Pending",
                "ready": False,
                "restart_count": 0,
                "cpu_percent": 0,
                "memory_percent": 0,
                "memory_bytes": 0,
                "node_name": None,
                "ip": None,
                "created_at": "2024-01-25T08:00:00Z",
                "containers": [{"name": "batch", "ready": False, "restart_count": 0, "state": "waiting", "image": "myapp/batch:v1.0"}],
                "labels": {"app": "batch-job"},
            },
        ]

        if namespace:
            return [p for p in pods if p["namespace"] == namespace]
        return pods

    def _get_mock_deployments(self, namespace: Optional[str] = None) -> list[dict]:
        """Generate mock deployment data."""
        deployments = [
            {
                "name": "nginx-deployment",
                "namespace": "default",
                "replicas": 2,
                "ready_replicas": 2,
                "available_replicas": 2,
                "updated_replicas": 2,
                "status": "Available",
                "created_at": "2024-01-20T14:00:00Z",
                "labels": {"app": "nginx"},
            },
            {
                "name": "api-server",
                "namespace": "default",
                "replicas": 3,
                "ready_replicas": 3,
                "available_replicas": 3,
                "updated_replicas": 3,
                "status": "Available",
                "created_at": "2024-01-18T09:00:00Z",
                "labels": {"app": "api-server"},
            },
            {
                "name": "frontend",
                "namespace": "default",
                "replicas": 2,
                "ready_replicas": 1,
                "available_replicas": 1,
                "updated_replicas": 2,
                "status": "Degraded",
                "created_at": "2024-01-22T10:00:00Z",
                "labels": {"app": "frontend"},
            },
            {
                "name": "prometheus",
                "namespace": "monitoring",
                "replicas": 1,
                "ready_replicas": 1,
                "available_replicas": 1,
                "updated_replicas": 1,
                "status": "Available",
                "created_at": "2024-01-16T12:00:00Z",
                "labels": {"app": "prometheus"},
            },
            {
                "name": "grafana",
                "namespace": "monitoring",
                "replicas": 1,
                "ready_replicas": 1,
                "available_replicas": 1,
                "updated_replicas": 1,
                "status": "Available",
                "created_at": "2024-01-16T12:05:00Z",
                "labels": {"app": "grafana"},
            },
        ]

        if namespace:
            return [d for d in deployments if d["namespace"] == namespace]
        return deployments

    def _get_mock_services(self, namespace: Optional[str] = None) -> list[dict]:
        """Generate mock service data."""
        services = [
            {
                "name": "kubernetes",
                "namespace": "default",
                "type": "ClusterIP",
                "cluster_ip": "10.96.0.1",
                "external_ip": None,
                "ports": [{"name": "https", "port": 443, "target_port": "6443", "protocol": "TCP", "node_port": None}],
                "created_at": "2024-01-15T10:30:00Z",
                "labels": {"component": "apiserver", "provider": "kubernetes"},
            },
            {
                "name": "nginx-service",
                "namespace": "default",
                "type": "LoadBalancer",
                "cluster_ip": "10.96.45.123",
                "external_ip": "192.168.1.100",
                "ports": [{"name": "http", "port": 80, "target_port": "80", "protocol": "TCP", "node_port": 30080}],
                "created_at": "2024-01-20T14:05:00Z",
                "labels": {"app": "nginx"},
            },
            {
                "name": "api-service",
                "namespace": "default",
                "type": "ClusterIP",
                "cluster_ip": "10.96.50.200",
                "external_ip": None,
                "ports": [{"name": "http", "port": 8080, "target_port": "8080", "protocol": "TCP", "node_port": None}],
                "created_at": "2024-01-18T09:05:00Z",
                "labels": {"app": "api-server"},
            },
            {
                "name": "prometheus-service",
                "namespace": "monitoring",
                "type": "NodePort",
                "cluster_ip": "10.96.60.100",
                "external_ip": None,
                "ports": [{"name": "web", "port": 9090, "target_port": "9090", "protocol": "TCP", "node_port": 30090}],
                "created_at": "2024-01-16T12:10:00Z",
                "labels": {"app": "prometheus"},
            },
            {
                "name": "grafana-service",
                "namespace": "monitoring",
                "type": "NodePort",
                "cluster_ip": "10.96.60.110",
                "external_ip": None,
                "ports": [{"name": "web", "port": 3000, "target_port": "3000", "protocol": "TCP", "node_port": 30030}],
                "created_at": "2024-01-16T12:15:00Z",
                "labels": {"app": "grafana"},
            },
        ]

        if namespace:
            return [s for s in services if s["namespace"] == namespace]
        return services

    def _get_mock_events(self, namespace: Optional[str] = None) -> list[dict]:
        """Generate mock event data."""
        now = datetime.now(timezone.utc)
        events = [
            {
                "type": "Normal",
                "reason": "Scheduled",
                "message": "Successfully assigned default/nginx-deployment-7d4b8c4f5-x2k9p to node-2",
                "involved_object": "Pod/nginx-deployment-7d4b8c4f5-x2k9p",
                "namespace": "default",
                "timestamp": (now.replace(minute=now.minute - 5)).isoformat(),
                "count": 1,
            },
            {
                "type": "Normal",
                "reason": "Pulled",
                "message": "Container image \"nginx:1.25\" already present on machine",
                "involved_object": "Pod/nginx-deployment-7d4b8c4f5-x2k9p",
                "namespace": "default",
                "timestamp": (now.replace(minute=now.minute - 4)).isoformat(),
                "count": 1,
            },
            {
                "type": "Normal",
                "reason": "Started",
                "message": "Started container nginx",
                "involved_object": "Pod/nginx-deployment-7d4b8c4f5-x2k9p",
                "namespace": "default",
                "timestamp": (now.replace(minute=now.minute - 3)).isoformat(),
                "count": 1,
            },
            {
                "type": "Normal",
                "reason": "ScalingReplicaSet",
                "message": "Scaled up replica set api-server-6f8b9c7d4e to 3",
                "involved_object": "Deployment/api-server",
                "namespace": "default",
                "timestamp": (now.replace(minute=now.minute - 10)).isoformat(),
                "count": 1,
            },
            {
                "type": "Warning",
                "reason": "FailedScheduling",
                "message": "0/3 nodes are available: insufficient memory",
                "involved_object": "Pod/batch-job-xyz123",
                "namespace": "default",
                "timestamp": (now.replace(minute=now.minute - 2)).isoformat(),
                "count": 3,
            },
            {
                "type": "Normal",
                "reason": "SuccessfulCreate",
                "message": "Created pod: prometheus-server-0",
                "involved_object": "StatefulSet/prometheus-server",
                "namespace": "monitoring",
                "timestamp": (now.replace(hour=now.hour - 1)).isoformat(),
                "count": 1,
            },
        ]

        if namespace:
            return [e for e in events if e["namespace"] == namespace]
        return events
