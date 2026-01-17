export interface Host {
  id: string;
  hostname: string;
  ip_address: string;
  status: 'online' | 'offline' | 'warning';
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
