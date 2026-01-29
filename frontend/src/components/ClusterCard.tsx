import { Link } from 'react-router-dom';
import { Box, Cpu, MemoryStick, Server, AlertTriangle } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatRelativeTime } from '@/lib/utils';
import type { ClusterSummary } from '@/types';

interface ClusterCardProps {
  cluster: ClusterSummary;
}

export function ClusterCard({ cluster }: ClusterCardProps) {
  const isDegraded = cluster.status === 'degraded';
  const isUnreachable = cluster.status === 'unreachable';

  return (
    <Link to={`/kubernetes/${cluster.id}`}>
      <Card className="hover:border-primary-600/50 transition-colors cursor-pointer">
        <CardBody>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-dark-700 flex items-center justify-center">
                <Box className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-dark-100">{cluster.name}</h3>
                <p className="text-sm text-dark-400">
                  {cluster.version || 'Version unknown'}
                </p>
              </div>
            </div>
            <StatusBadge status={cluster.status} />
          </div>

          {isUnreachable ? (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-sm text-red-400">Cluster unreachable</span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Node & Pod counts */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-dark-400">
                  <Server className="h-4 w-4" />
                  <span>Nodes: {cluster.node_count}</span>
                </div>
                <div className="flex items-center gap-2 text-dark-400">
                  <Box className="h-4 w-4" />
                  <span>Pods: {cluster.pod_count}</span>
                </div>
              </div>

              {/* CPU Usage */}
              <div className="flex items-center gap-3">
                <Cpu className="h-4 w-4 text-dark-400" />
                <div className="flex-1">
                  <ProgressBar value={cluster.cpu_percent} size="sm" />
                </div>
                <span className="text-sm text-dark-300 w-12 text-right">
                  {cluster.cpu_percent.toFixed(1)}%
                </span>
              </div>

              {/* Memory Usage */}
              <div className="flex items-center gap-3">
                <MemoryStick className="h-4 w-4 text-dark-400" />
                <div className="flex-1">
                  <ProgressBar value={cluster.memory_percent} size="sm" />
                </div>
                <span className="text-sm text-dark-300 w-12 text-right">
                  {cluster.memory_percent.toFixed(1)}%
                </span>
              </div>

              {/* Warning for degraded status */}
              {isDegraded && (
                <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                  <AlertTriangle className="h-3 w-3 text-yellow-400" />
                  <span className="text-xs text-yellow-400">Some nodes may be unhealthy</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-dark-700 flex items-center justify-between text-xs text-dark-500">
            <span>
              Last sync: {cluster.last_sync ? formatRelativeTime(cluster.last_sync) : 'Never'}
            </span>
            <span className="text-primary-400">View Details</span>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
