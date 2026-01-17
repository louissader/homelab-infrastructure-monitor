import { useQuery } from '@tanstack/react-query';
import { getLatestMetrics, getMetrics, getHosts, getAlerts } from '@/api/client';

export function useLatestMetrics() {
  return useQuery({
    queryKey: ['metrics', 'latest'],
    queryFn: getLatestMetrics,
    refetchInterval: 5000,
  });
}

export function useMetricsHistory(hostId: string, metricType?: string) {
  return useQuery({
    queryKey: ['metrics', 'history', hostId, metricType],
    queryFn: () => getMetrics({
      host_id: hostId,
      metric_type: metricType,
      size: 100
    }),
    refetchInterval: 30000,
  });
}

export function useHosts() {
  return useQuery({
    queryKey: ['hosts'],
    queryFn: () => getHosts(1, 100),
    refetchInterval: 10000,
  });
}

export function useAlerts(resolved = false) {
  return useQuery({
    queryKey: ['alerts', { resolved }],
    queryFn: () => getAlerts({ resolved, size: 50 }),
    refetchInterval: 10000,
  });
}
