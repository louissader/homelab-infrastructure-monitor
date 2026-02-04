import axios from 'axios';
import type {
  Host,
  Metric,
  Alert,
  AlertRule,
  PaginatedResponse,
  HealthResponse,
  Cluster,
  ClusterSummary,
  ClusterMetrics,
  K8sNode,
  K8sPod,
  K8sDeployment,
  K8sService,
  K8sEvent,
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health
export const getHealth = async (): Promise<HealthResponse> => {
  const response = await axios.get('/health');
  return response.data;
};

// Hosts
export const getHosts = async (page = 1, size = 50): Promise<PaginatedResponse<Host>> => {
  const response = await apiClient.get('/hosts', { params: { page, size } });
  const data = response.data;
  if (Array.isArray(data)) {
    return { items: data, total: data.length, page: 1, size: data.length, pages: 1 };
  }
  return data;
};

export const getHost = async (id: string): Promise<Host> => {
  const response = await apiClient.get(`/hosts/${id}`);
  return response.data;
};

export const createHost = async (data: { hostname: string; ip_address: string; metadata?: Record<string, unknown> }): Promise<Host & { api_key: string }> => {
  const response = await apiClient.post('/hosts', data);
  return response.data;
};

export const updateHost = async (id: string, data: Partial<Host>): Promise<Host> => {
  const response = await apiClient.put(`/hosts/${id}`, data);
  return response.data;
};

export const deleteHost = async (id: string): Promise<void> => {
  await apiClient.delete(`/hosts/${id}`);
};

// Metrics
export const getMetrics = async (params: {
  host_id?: string;
  metric_type?: string;
  start_time?: string;
  end_time?: string;
  page?: number;
  size?: number;
}): Promise<PaginatedResponse<Metric>> => {
  const response = await apiClient.get('/metrics', { params });
  return response.data;
};

export const getLatestMetrics = async (): Promise<Record<string, any>> => {
  const response = await apiClient.get('/metrics/latest');
  const data = response.data;

  const entries = Array.isArray(data) ? data : Object.values(data);
  const result: Record<string, any> = {};

  for (const entry of entries) {
    const hostId = entry.host_id;
    const metrics = entry.metrics || [];

    // Transform separate metric entries into a single metric_data object
    // that matches the MetricData interface the frontend components expect
    const metric_data: Record<string, any> = {};

    for (const m of metrics) {
      switch (m.type) {
        case 'cpu': {
          const cpuData = m.data;
          const percentArray = cpuData.percent || [];
          // Agent sends per-cpu array; frontend expects a single average percent
          const avgPercent = Array.isArray(percentArray)
            ? percentArray.reduce((a: number, b: number) => a + b, 0) / (percentArray.length || 1)
            : percentArray;
          const loadAvg = cpuData.load_avg || [0, 0, 0];
          metric_data.cpu = {
            percent: avgPercent,
            per_cpu: Array.isArray(percentArray) ? percentArray : [percentArray],
            load_avg: Array.isArray(loadAvg)
              ? { '1min': loadAvg[0], '5min': loadAvg[1], '15min': loadAvg[2] }
              : loadAvg,
          };
          break;
        }
        case 'memory':
          metric_data.memory = m.data;
          break;
        case 'disks': {
          // Agent sends [{mount, total, used, free, percent}, ...]
          // Frontend DiskMetric expects partitions: [{device, mountpoint, total, used, free, percent}]
          const partitions = (Array.isArray(m.data) ? m.data : []).map((d: any) => ({
            device: d.device || d.mount || '',
            mountpoint: d.mount || d.mountpoint || '',
            total: d.total || 0,
            used: d.used || 0,
            free: d.free || 0,
            percent: d.percent || 0,
          }));
          metric_data.disk = { ...metric_data.disk, partitions };
          break;
        }
        case 'disk_io': {
          // Agent sends read_bytes_per_sec/write_bytes_per_sec
          // Frontend expects read_rate/write_rate
          metric_data.disk = {
            ...metric_data.disk,
            read_bytes: m.data.read_bytes || 0,
            write_bytes: m.data.write_bytes || 0,
            read_rate: m.data.read_bytes_per_sec || 0,
            write_rate: m.data.write_bytes_per_sec || 0,
          };
          break;
        }
        case 'network': {
          // Agent sends bytes_sent_per_sec/bytes_recv_per_sec
          // Frontend expects send_rate/recv_rate
          metric_data.network = {
            bytes_sent: m.data.bytes_sent || 0,
            bytes_recv: m.data.bytes_recv || 0,
            send_rate: m.data.bytes_sent_per_sec || 0,
            recv_rate: m.data.bytes_recv_per_sec || 0,
            interfaces: [],
          };
          break;
        }
        case 'containers': {
          // Stored as {containers: [...]}; frontend expects docker: DockerMetric[]
          const containers = m.data.containers || [];
          metric_data.docker = containers.map((c: any) => ({
            container_id: c.id || '',
            name: c.name || '',
            status: c.status || '',
            cpu_percent: c.cpu_percent || 0,
            memory_usage: c.memory_usage || 0,
            memory_limit: c.memory_limit || 0,
            memory_percent: c.memory_percent || 0,
          }));
          break;
        }
        case 'health_checks': {
          // Stored as {checks: [...]} with healthy boolean
          // Frontend expects services: ServiceMetric[] with status string
          const checks = m.data.checks || [];
          metric_data.services = checks.map((c: any) => ({
            name: c.name || '',
            type: c.type || '',
            status: c.healthy ? 'healthy' : 'unhealthy',
            response_time: c.response_time_ms,
            message: c.message,
          }));
          break;
        }
      }
    }

    result[hostId] = {
      host_id: hostId,
      metric_type: 'combined',
      metric_data,
      timestamp: entry.last_seen,
    };
  }

  return result;
};

// Alerts
export const getAlerts = async (params: {
  host_id?: string;
  severity?: string;
  resolved?: boolean;
  page?: number;
  size?: number;
}): Promise<PaginatedResponse<Alert>> => {
  const response = await apiClient.get('/alerts', { params });
  const data = response.data;
  if (Array.isArray(data)) {
    return { items: data, total: data.length, page: 1, size: data.length, pages: 1 };
  }
  return data;
};

export const acknowledgeAlert = async (id: string): Promise<Alert> => {
  const response = await apiClient.post(`/alerts/${id}/acknowledge`);
  return response.data;
};

export const resolveAlert = async (id: string): Promise<Alert> => {
  const response = await apiClient.post(`/alerts/${id}/resolve`);
  return response.data;
};

// Alert Rules
export const getAlertRules = async (): Promise<AlertRule[]> => {
  const response = await apiClient.get('/alerts/rules');
  return response.data;
};

export const createAlertRule = async (data: Omit<AlertRule, 'id' | 'created_at'>): Promise<AlertRule> => {
  const response = await apiClient.post('/alerts/rules', data);
  return response.data;
};

export const updateAlertRule = async (id: string, data: Partial<AlertRule>): Promise<AlertRule> => {
  const response = await apiClient.put(`/alerts/rules/${id}`, data);
  return response.data;
};

export const deleteAlertRule = async (id: string): Promise<void> => {
  await apiClient.delete(`/alerts/rules/${id}`);
};

// ============================================================================
// Kubernetes Clusters
// ============================================================================

export const getClusters = async (): Promise<ClusterSummary[]> => {
  const response = await apiClient.get('/clusters');
  return response.data;
};

export const getCluster = async (id: string): Promise<Cluster> => {
  const response = await apiClient.get(`/clusters/${id}`);
  return response.data;
};

export const createCluster = async (data: {
  name: string;
  api_server_url?: string;
  kubeconfig_path?: string;
  metadata?: Record<string, unknown>;
}): Promise<Cluster> => {
  const response = await apiClient.post('/clusters', data);
  return response.data;
};

export const updateCluster = async (id: string, data: Partial<Cluster>): Promise<Cluster> => {
  const response = await apiClient.put(`/clusters/${id}`, data);
  return response.data;
};

export const deleteCluster = async (id: string): Promise<void> => {
  await apiClient.delete(`/clusters/${id}`);
};

export const syncCluster = async (id: string): Promise<ClusterMetrics> => {
  const response = await apiClient.post(`/clusters/${id}/sync`);
  return response.data;
};

// Kubernetes Nodes
export const getClusterNodes = async (clusterId: string): Promise<K8sNode[]> => {
  const response = await apiClient.get(`/clusters/${clusterId}/nodes`);
  return response.data;
};

// Kubernetes Pods
export const getClusterPods = async (
  clusterId: string,
  params?: { namespace?: string; status?: string }
): Promise<K8sPod[]> => {
  const response = await apiClient.get(`/clusters/${clusterId}/pods`, { params });
  return response.data;
};

// Kubernetes Deployments
export const getClusterDeployments = async (
  clusterId: string,
  namespace?: string
): Promise<K8sDeployment[]> => {
  const response = await apiClient.get(`/clusters/${clusterId}/deployments`, {
    params: namespace ? { namespace } : undefined,
  });
  return response.data;
};

// Kubernetes Services
export const getClusterServices = async (
  clusterId: string,
  namespace?: string
): Promise<K8sService[]> => {
  const response = await apiClient.get(`/clusters/${clusterId}/services`, {
    params: namespace ? { namespace } : undefined,
  });
  return response.data;
};

// Kubernetes Events
export const getClusterEvents = async (
  clusterId: string,
  params?: { namespace?: string; limit?: number }
): Promise<K8sEvent[]> => {
  const response = await apiClient.get(`/clusters/${clusterId}/events`, { params });
  return response.data;
};

// Kubernetes Metrics
export const getClusterMetrics = async (clusterId: string): Promise<ClusterMetrics> => {
  const response = await apiClient.get(`/clusters/${clusterId}/metrics`);
  return response.data;
};

// Kubernetes Namespaces
export const getClusterNamespaces = async (clusterId: string): Promise<string[]> => {
  const response = await apiClient.get(`/clusters/${clusterId}/namespaces`);
  return response.data;
};
