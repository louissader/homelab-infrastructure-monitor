import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getClusters,
  getCluster,
  createCluster,
  deleteCluster,
  syncCluster,
  getClusterNodes,
  getClusterPods,
  getClusterDeployments,
  getClusterServices,
  getClusterEvents,
  getClusterMetrics,
  getClusterNamespaces,
} from '@/api/client';

export function useClusters() {
  return useQuery({
    queryKey: ['clusters'],
    queryFn: getClusters,
    refetchInterval: 30000,
  });
}

export function useCluster(clusterId: string | undefined) {
  return useQuery({
    queryKey: ['cluster', clusterId],
    queryFn: () => getCluster(clusterId!),
    enabled: !!clusterId,
    refetchInterval: 30000,
  });
}

export function useCreateCluster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCluster,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clusters'] });
    },
  });
}

export function useDeleteCluster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCluster,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clusters'] });
    },
  });
}

export function useSyncCluster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncCluster,
    onSuccess: (_, clusterId) => {
      queryClient.invalidateQueries({ queryKey: ['clusters'] });
      queryClient.invalidateQueries({ queryKey: ['cluster', clusterId] });
      queryClient.invalidateQueries({ queryKey: ['clusterMetrics', clusterId] });
    },
  });
}

export function useClusterNodes(clusterId: string | undefined) {
  return useQuery({
    queryKey: ['clusterNodes', clusterId],
    queryFn: () => getClusterNodes(clusterId!),
    enabled: !!clusterId,
    refetchInterval: 15000,
  });
}

export function useClusterPods(
  clusterId: string | undefined,
  params?: { namespace?: string; status?: string }
) {
  return useQuery({
    queryKey: ['clusterPods', clusterId, params],
    queryFn: () => getClusterPods(clusterId!, params),
    enabled: !!clusterId,
    refetchInterval: 10000,
  });
}

export function useClusterDeployments(clusterId: string | undefined, namespace?: string) {
  return useQuery({
    queryKey: ['clusterDeployments', clusterId, namespace],
    queryFn: () => getClusterDeployments(clusterId!, namespace),
    enabled: !!clusterId,
    refetchInterval: 15000,
  });
}

export function useClusterServices(clusterId: string | undefined, namespace?: string) {
  return useQuery({
    queryKey: ['clusterServices', clusterId, namespace],
    queryFn: () => getClusterServices(clusterId!, namespace),
    enabled: !!clusterId,
    refetchInterval: 30000,
  });
}

export function useClusterEvents(
  clusterId: string | undefined,
  params?: { namespace?: string; limit?: number }
) {
  return useQuery({
    queryKey: ['clusterEvents', clusterId, params],
    queryFn: () => getClusterEvents(clusterId!, params),
    enabled: !!clusterId,
    refetchInterval: 10000,
  });
}

export function useClusterMetrics(clusterId: string | undefined) {
  return useQuery({
    queryKey: ['clusterMetrics', clusterId],
    queryFn: () => getClusterMetrics(clusterId!),
    enabled: !!clusterId,
    refetchInterval: 10000,
  });
}

export function useClusterNamespaces(clusterId: string | undefined) {
  return useQuery({
    queryKey: ['clusterNamespaces', clusterId],
    queryFn: () => getClusterNamespaces(clusterId!),
    enabled: !!clusterId,
    refetchInterval: 60000,
  });
}
