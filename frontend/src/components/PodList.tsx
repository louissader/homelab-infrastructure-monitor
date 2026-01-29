import { Box, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatBytes, formatRelativeTime, cn } from '@/lib/utils';
import type { K8sPod } from '@/types';

interface PodListProps {
  pods: K8sPod[];
  title?: string;
  showNamespace?: boolean;
}

function getPodStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case 'running':
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-400" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-400" />;
    case 'succeeded':
      return <CheckCircle className="h-4 w-4 text-blue-400" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
  }
}

function getPodStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'running':
      return 'text-green-400 bg-green-400/10 border-green-400/20';
    case 'pending':
      return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    case 'failed':
      return 'text-red-400 bg-red-400/10 border-red-400/20';
    case 'succeeded':
      return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    default:
      return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  }
}

export function PodList({ pods, title = 'Pods', showNamespace = true }: PodListProps) {
  if (pods.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="text-center py-8 text-dark-400">
            <Box className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No pods found</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title} ({pods.length})</CardTitle>
          <div className="flex items-center gap-4 text-xs text-dark-400">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-400" />
              {pods.filter(p => p.status === 'Running').length} Running
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-yellow-400" />
              {pods.filter(p => p.status === 'Pending').length} Pending
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-400" />
              {pods.filter(p => p.status === 'Failed').length} Failed
            </span>
          </div>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <div className="divide-y divide-dark-700">
          {pods.map((pod) => (
            <div key={`${pod.namespace}/${pod.name}`} className="p-4 hover:bg-dark-800/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  {getPodStatusIcon(pod.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-dark-100">{pod.name}</span>
                      <span className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium border',
                        getPodStatusColor(pod.status)
                      )}>
                        {pod.status}
                      </span>
                    </div>
                    {showNamespace && (
                      <span className="text-xs text-dark-400">Namespace: {pod.namespace}</span>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs text-dark-400">
                  {pod.node_name && <div>Node: {pod.node_name}</div>}
                  {pod.ip && <div>IP: {pod.ip}</div>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                {/* CPU */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-dark-400">CPU</span>
                    <span className="text-xs text-dark-300">{pod.cpu_percent.toFixed(1)}%</span>
                  </div>
                  <ProgressBar value={pod.cpu_percent} size="sm" showLabel={false} />
                </div>

                {/* Memory */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-dark-400">Memory</span>
                    <span className="text-xs text-dark-300">{formatBytes(pod.memory_bytes)}</span>
                  </div>
                  <ProgressBar value={pod.memory_percent} size="sm" showLabel={false} />
                </div>

                {/* Restarts */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-dark-400">Restarts</span>
                    <span className={cn(
                      'text-xs',
                      pod.restart_count > 5 ? 'text-red-400' :
                      pod.restart_count > 0 ? 'text-yellow-400' : 'text-dark-300'
                    )}>
                      {pod.restart_count}
                    </span>
                  </div>
                  {pod.restart_count > 0 && (
                    <div className="flex items-center gap-1 text-xs text-yellow-400">
                      <RefreshCw className="h-3 w-3" />
                      <span>{pod.restart_count} restart{pod.restart_count !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Containers */}
              {pod.containers.length > 1 && (
                <div className="mt-2 pt-2 border-t border-dark-700">
                  <span className="text-xs text-dark-400">
                    Containers: {pod.containers.map(c => c.name).join(', ')}
                  </span>
                </div>
              )}

              {/* Created time */}
              {pod.created_at && (
                <div className="mt-2 text-xs text-dark-500">
                  Created: {formatRelativeTime(pod.created_at)}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
