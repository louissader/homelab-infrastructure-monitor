export interface Host {
  id: string;
  hostname: string;
  ip_address: string;
  status: 'online' | 'offline' | 'warning' | 'healthy' | 'critical' | 'unknown';
  last_seen: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface Metric {
  id: number;
  host_id: string;
  metric_type: string;
  metric_data: MetricData;
  timestamp: string;
}

export interface MetricData {
  cpu?: CpuMetric;
  memory?: MemoryMetric;
  disk?: DiskMetric;
  network?: NetworkMetric;
  docker?: DockerMetric[];
  services?: ServiceMetric[];
}

export interface CpuMetric {
  percent: number;
  per_cpu: number[];
  load_avg: {
    '1min': number;
    '5min': number;
    '15min': number;
  };
}

export interface MemoryMetric {
  total: number;
  available: number;
  used: number;
  percent: number;
  swap_total: number;
  swap_used: number;
  swap_percent: number;
}

export interface DiskMetric {
  read_bytes: number;
  write_bytes: number;
  read_rate: number;
  write_rate: number;
  partitions: DiskPartition[];
}

export interface DiskPartition {
  device: string;
  mountpoint: string;
  total: number;
  used: number;
  free: number;
  percent: number;
}

export interface NetworkMetric {
  bytes_sent: number;
  bytes_recv: number;
  send_rate: number;
  recv_rate: number;
  interfaces: NetworkInterface[];
}

export interface NetworkInterface {
  name: string;
  bytes_sent: number;
  bytes_recv: number;
}

export interface DockerMetric {
  container_id: string;
  name: string;
  status: string;
  cpu_percent: number;
  memory_usage: number;
  memory_limit: number;
  memory_percent: number;
}

export interface ServiceMetric {
  name: string;
  type: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  response_time?: number;
  message?: string;
}

export interface Alert {
  id: string;
  host_id: string;
  rule_id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  triggered_at: string;
  acknowledged: boolean;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved: boolean;
  resolved_at?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  metric_type: string;
  condition: AlertCondition;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  created_at: string;
}

export interface AlertCondition {
  field: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  environment: string;
}

// ============================================================================
// Kubernetes Types
// ============================================================================

export type ClusterStatus = 'healthy' | 'degraded' | 'unreachable' | 'unknown';

export interface Cluster {
  id: string;
  name: string;
  api_server_url?: string;
  kubeconfig_path?: string;
  status: ClusterStatus;
  version?: string;
  created_at: string;
  updated_at?: string;
  last_sync?: string;
  metadata: Record<string, unknown>;
}

export interface ClusterSummary {
  id: string;
  name: string;
  status: ClusterStatus;
  version?: string;
  node_count: number;
  pod_count: number;
  cpu_percent: number;
  memory_percent: number;
  last_sync?: string;
}

export interface K8sNodeCondition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
}

export interface K8sNodeResources {
  cpu: string;
  memory: string;
  pods?: string;
  storage?: string;
}

export interface K8sNode {
  name: string;
  status: string;
  role: string;
  conditions: K8sNodeCondition[];
  capacity: K8sNodeResources;
  allocatable: K8sNodeResources;
  cpu_percent: number;
  memory_percent: number;
  pod_count: number;
  created_at?: string;
  labels: Record<string, string>;
  taints: Array<{ key: string; value?: string; effect: string }>;
}

export interface K8sContainerStatus {
  name: string;
  ready: boolean;
  restart_count: number;
  state: string;
  image: string;
}

export interface K8sPod {
  name: string;
  namespace: string;
  status: string;
  phase: string;
  ready: boolean;
  restart_count: number;
  cpu_percent: number;
  memory_percent: number;
  memory_bytes: number;
  node_name?: string;
  ip?: string;
  created_at?: string;
  containers: K8sContainerStatus[];
  labels: Record<string, string>;
}

export interface K8sDeployment {
  name: string;
  namespace: string;
  replicas: number;
  ready_replicas: number;
  available_replicas: number;
  updated_replicas: number;
  status: string;
  created_at?: string;
  labels: Record<string, string>;
}

export interface K8sService {
  name: string;
  namespace: string;
  type: string;
  cluster_ip?: string;
  external_ip?: string;
  ports: Array<{
    name?: string;
    port: number;
    target_port: string;
    protocol: string;
    node_port?: number;
  }>;
  created_at?: string;
  labels: Record<string, string>;
}

export interface K8sEvent {
  type: string;
  reason: string;
  message: string;
  involved_object: string;
  namespace: string;
  timestamp: string;
  count: number;
}

export interface ClusterMetrics {
  cluster_id: string;
  timestamp: string;
  total_nodes: number;
  ready_nodes: number;
  total_pods: number;
  running_pods: number;
  total_deployments: number;
  available_deployments: number;
  total_cpu_millicores: number;
  used_cpu_millicores: number;
  cpu_percent: number;
  total_memory_bytes: number;
  used_memory_bytes: number;
  memory_percent: number;
}
