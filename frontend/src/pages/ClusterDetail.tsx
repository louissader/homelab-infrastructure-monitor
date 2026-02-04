import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Box,
  Server,
  Cpu,
  MemoryStick,
  RefreshCw,
  Layers,
  Network,
  Clock,
  AlertTriangle,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { PodList } from '@/components/PodList';
import { Spinner } from '@/components/ui/Spinner';
import { formatRelativeTime, cn } from '@/lib/utils';
import {
  useCluster,
  useClusterNodes,
  useClusterPods,
  useClusterDeployments,
  useClusterServices,
  useClusterEvents,
  useClusterMetrics,
  useClusterNamespaces,
  useSyncCluster,
  useDeleteCluster,
} from '@/hooks/useKubernetes';
import { useNavigate } from 'react-router-dom';

type TabType = 'overview' | 'nodes' | 'pods' | 'deployments' | 'services';

export function ClusterDetail() {
  const { clusterId } = useParams<{ clusterId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');

  const { data: cluster, isLoading: clusterLoading } = useCluster(clusterId);
  const { data: metrics } = useClusterMetrics(clusterId);
  const { data: nodes, isLoading: nodesLoading } = useClusterNodes(clusterId);
  const { data: pods, isLoading: podsLoading } = useClusterPods(clusterId, {
    namespace: selectedNamespace || undefined,
  });
  const { data: deployments, isLoading: deploymentsLoading } = useClusterDeployments(
    clusterId,
    selectedNamespace || undefined
  );
  const { data: services, isLoading: servicesLoading } = useClusterServices(
    clusterId,
    selectedNamespace || undefined
  );
  const { data: events } = useClusterEvents(clusterId, { limit: 10 });
  const { data: namespaces } = useClusterNamespaces(clusterId);

  const syncCluster = useSyncCluster();
  const deleteCluster = useDeleteCluster();

  const handleSync = async () => {
    if (clusterId) {
      await syncCluster.mutateAsync(clusterId);
    }
  };

  const handleDelete = async () => {
    if (clusterId && confirm('Are you sure you want to delete this cluster?')) {
      await deleteCluster.mutateAsync(clusterId);
      navigate('/kubernetes');
    }
  };

  if (clusterLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!cluster) {
    return (
      <div className="p-6">
        <Card>
          <CardBody className="py-12 text-center">
            <p className="text-dark-400">Cluster not found</p>
            <Link to="/kubernetes" className="text-primary-400 hover:underline mt-2 block">
              Back to clusters
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Box },
    { id: 'nodes', label: 'Nodes', icon: Server },
    { id: 'pods', label: 'Pods', icon: Layers },
    { id: 'deployments', label: 'Deployments', icon: Layers },
    { id: 'services', label: 'Services', icon: Network },
  ];

  return (
    <div className="min-h-screen">
      <Header title={cluster.name} onRefresh={handleSync} />

      <div className="p-6">
        {/* Back Link & Actions */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/kubernetes"
            className="inline-flex items-center gap-2 text-dark-400 hover:text-dark-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clusters
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncCluster.isPending}
              className="btn btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={cn('h-4 w-4', syncCluster.isPending && 'animate-spin')} />
              Sync
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteCluster.isPending}
              className="btn btn-secondary text-red-400 hover:text-red-300 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>

        {/* Cluster Info Card */}
        <Card className="mb-6">
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-dark-700 flex items-center justify-center">
                  <Box className="h-8 w-8 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-dark-100">{cluster.name}</h1>
                  <p className="text-dark-400">{cluster.version || 'Version unknown'}</p>
                  <p className="text-sm text-dark-500">
                    Last sync: {cluster.last_sync ? formatRelativeTime(cluster.last_sync) : 'Never'}
                  </p>
                </div>
              </div>
              <StatusBadge status={cluster.status} size="lg" />
            </div>
          </CardBody>
        </Card>

        {/* Quick Stats */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardBody>
                <div className="flex items-center gap-3 mb-2">
                  <Server className="h-5 w-5 text-dark-400" />
                  <span className="text-sm text-dark-400">Nodes</span>
                </div>
                <p className="text-3xl font-bold text-dark-100">
                  {metrics.ready_nodes}/{metrics.total_nodes}
                </p>
                <p className="text-xs text-dark-500">Ready</p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="flex items-center gap-3 mb-2">
                  <Layers className="h-5 w-5 text-dark-400" />
                  <span className="text-sm text-dark-400">Pods</span>
                </div>
                <p className="text-3xl font-bold text-dark-100">
                  {metrics.running_pods}/{metrics.total_pods}
                </p>
                <p className="text-xs text-dark-500">Running</p>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <p className="text-sm text-dark-400 mb-2">CPU Usage</p>
                <p className="text-3xl font-bold text-dark-100 mb-2">
                  {metrics.cpu_percent.toFixed(1)}%
                </p>
                <ProgressBar value={metrics.cpu_percent} showLabel={false} />
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <p className="text-sm text-dark-400 mb-2">Memory Usage</p>
                <p className="text-3xl font-bold text-dark-100 mb-2">
                  {metrics.memory_percent.toFixed(1)}%
                </p>
                <ProgressBar value={metrics.memory_percent} showLabel={false} />
              </CardBody>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-dark-700 mb-6">
          <nav className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-400'
                    : 'border-transparent text-dark-400 hover:text-dark-200'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Namespace Filter (for pods, deployments, services) */}
        {['pods', 'deployments', 'services'].includes(activeTab) && namespaces && (
          <div className="mb-4">
            <select
              value={selectedNamespace}
              onChange={(e) => setSelectedNamespace(e.target.value)}
              className="input w-48"
            >
              <option value="">All Namespaces</option>
              {namespaces.map((ns) => (
                <option key={ns} value={ns}>
                  {ns}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Events */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Events</CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                {events && events.length > 0 ? (
                  <div className="divide-y divide-dark-700">
                    {events.map((event, idx) => (
                      <div key={idx} className="p-4">
                        <div className="flex items-start gap-3">
                          {event.type === 'Warning' ? (
                            <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-dark-200 font-medium">{event.reason}</p>
                            <p className="text-xs text-dark-400 truncate">{event.message}</p>
                            <p className="text-xs text-dark-500 mt-1">
                              {event.involved_object} ({event.namespace})
                            </p>
                          </div>
                          <span className="text-xs text-dark-500 whitespace-nowrap">
                            {formatRelativeTime(event.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-dark-400">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No recent events</p>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Deployments Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Deployments</CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                {deploymentsLoading ? (
                  <div className="p-8 flex justify-center">
                    <Spinner />
                  </div>
                ) : deployments && deployments.length > 0 ? (
                  <div className="divide-y divide-dark-700">
                    {deployments.slice(0, 5).map((deployment) => (
                      <div key={`${deployment.namespace}/${deployment.name}`} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-dark-200">{deployment.name}</p>
                            <p className="text-xs text-dark-500">{deployment.namespace}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                'px-2 py-1 rounded text-xs',
                                deployment.status === 'Available'
                                  ? 'bg-green-400/10 text-green-400'
                                  : deployment.status === 'Progressing'
                                  ? 'bg-yellow-400/10 text-yellow-400'
                                  : 'bg-red-400/10 text-red-400'
                              )}
                            >
                              {deployment.ready_replicas}/{deployment.replicas} ready
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-dark-400">
                    <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No deployments found</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {activeTab === 'nodes' && (
          <div className="space-y-4">
            {nodesLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : nodes && nodes.length > 0 ? (
              nodes.map((node) => (
                <Card key={node.name}>
                  <CardBody>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-dark-700 flex items-center justify-center">
                          <Server className="h-5 w-5 text-primary-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-dark-100">{node.name}</h3>
                            <span className="px-2 py-0.5 rounded text-xs bg-dark-700 text-dark-300">
                              {node.role}
                            </span>
                          </div>
                          <p className="text-sm text-dark-400">
                            {node.capacity.cpu} CPU, {node.capacity.memory} Memory
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={node.status === 'Ready' ? 'healthy' : 'critical'} />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Cpu className="h-4 w-4 text-dark-400" />
                          <span className="text-sm text-dark-400">CPU</span>
                        </div>
                        <ProgressBar value={node.cpu_percent} size="sm" />
                        <span className="text-xs text-dark-500">{node.cpu_percent.toFixed(1)}%</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <MemoryStick className="h-4 w-4 text-dark-400" />
                          <span className="text-sm text-dark-400">Memory</span>
                        </div>
                        <ProgressBar value={node.memory_percent} size="sm" />
                        <span className="text-xs text-dark-500">{node.memory_percent.toFixed(1)}%</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Layers className="h-4 w-4 text-dark-400" />
                          <span className="text-sm text-dark-400">Pods</span>
                        </div>
                        <p className="text-lg font-semibold text-dark-200">{node.pod_count}</p>
                      </div>
                    </div>

                    {node.taints.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-dark-700">
                        <span className="text-xs text-dark-500">
                          Taints: {node.taints.map((t) => `${t.key}:${t.effect}`).join(', ')}
                        </span>
                      </div>
                    )}
                  </CardBody>
                </Card>
              ))
            ) : (
              <Card>
                <CardBody className="py-12 text-center text-dark-400">
                  <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No nodes found</p>
                </CardBody>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'pods' && (
          podsLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <PodList pods={pods || []} showNamespace={!selectedNamespace} />
          )
        )}

        {activeTab === 'deployments' && (
          <Card>
            <CardHeader>
              <CardTitle>Deployments</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {deploymentsLoading ? (
                <div className="p-8 flex justify-center">
                  <Spinner />
                </div>
              ) : deployments && deployments.length > 0 ? (
                <div className="divide-y divide-dark-700">
                  {deployments.map((deployment) => (
                    <div key={`${deployment.namespace}/${deployment.name}`} className="p-4 hover:bg-dark-800/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-dark-200">{deployment.name}</p>
                          <p className="text-sm text-dark-500">{deployment.namespace}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-dark-300">
                              {deployment.ready_replicas}/{deployment.replicas} ready
                            </p>
                            <p className="text-xs text-dark-500">
                              {deployment.available_replicas} available
                            </p>
                          </div>
                          <span
                            className={cn(
                              'px-3 py-1 rounded text-sm font-medium',
                              deployment.status === 'Available'
                                ? 'bg-green-400/10 text-green-400'
                                : deployment.status === 'Progressing'
                                ? 'bg-yellow-400/10 text-yellow-400'
                                : 'bg-red-400/10 text-red-400'
                            )}
                          >
                            {deployment.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-dark-400">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No deployments found</p>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {activeTab === 'services' && (
          <Card>
            <CardHeader>
              <CardTitle>Services</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              {servicesLoading ? (
                <div className="p-8 flex justify-center">
                  <Spinner />
                </div>
              ) : services && services.length > 0 ? (
                <div className="divide-y divide-dark-700">
                  {services.map((service) => (
                    <div key={`${service.namespace}/${service.name}`} className="p-4 hover:bg-dark-800/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-dark-200">{service.name}</p>
                          <p className="text-sm text-dark-500">{service.namespace}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm">
                            <p className="text-dark-300">{service.cluster_ip || '-'}</p>
                            {service.external_ip && (
                              <p className="text-xs text-primary-400">{service.external_ip}</p>
                            )}
                          </div>
                          <span className="px-3 py-1 rounded text-sm bg-dark-700 text-dark-300">
                            {service.type}
                          </span>
                        </div>
                      </div>
                      {service.ports.length > 0 && (
                        <div className="mt-2 text-xs text-dark-500">
                          Ports: {service.ports.map((p) => `${p.port}${p.node_port ? `:${p.node_port}` : ''}/${p.protocol}`).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-dark-400">
                  <Network className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No services found</p>
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
