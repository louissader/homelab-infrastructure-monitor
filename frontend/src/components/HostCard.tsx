import { Link } from 'react-router-dom';
import { Server, Cpu, MemoryStick, HardDrive, Network } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatRelativeTime, formatBytes, formatBytesPerSecond } from '@/lib/utils';
import type { Host, Metric } from '@/types';

interface HostCardProps {
  host: Host;
  latestMetric?: Metric;
}

export function HostCard({ host, latestMetric }: HostCardProps) {
  const cpu = latestMetric?.metric_data.cpu;
  const memory = latestMetric?.metric_data.memory;
  const disk = latestMetric?.metric_data.disk;
  const network = latestMetric?.metric_data.network;

  return (
    <Link to={`/hosts/${host.id}`}>
      <Card className="hover:border-primary-600/50 transition-colors cursor-pointer">
        <CardBody>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-dark-700 flex items-center justify-center">
                <Server className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <h3 className="font-semibold text-dark-100">{host.hostname}</h3>
                <p className="text-sm text-dark-400">{host.ip_address}</p>
              </div>
            </div>
            <StatusBadge status={host.status} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Cpu className="h-4 w-4 text-dark-400" />
              <div className="flex-1">
                <ProgressBar value={cpu?.percent ?? 0} size="sm" />
              </div>
              <span className="text-sm text-dark-300 w-12 text-right">
                {cpu?.percent?.toFixed(1) ?? '0'}%
              </span>
            </div>

            <div className="flex items-center gap-3">
              <MemoryStick className="h-4 w-4 text-dark-400" />
              <div className="flex-1">
                <ProgressBar value={memory?.percent ?? 0} size="sm" />
              </div>
              <span className="text-sm text-dark-300 w-12 text-right">
                {memory?.percent?.toFixed(1) ?? '0'}%
              </span>
            </div>

            <div className="flex items-center gap-3">
              <HardDrive className="h-4 w-4 text-dark-400" />
              <div className="flex-1">
                <ProgressBar
                  value={disk?.partitions?.[0]?.percent ?? 0}
                  size="sm"
                />
              </div>
              <span className="text-sm text-dark-300 w-12 text-right">
                {disk?.partitions?.[0]?.percent?.toFixed(1) ?? '0'}%
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Network className="h-4 w-4 text-dark-400" />
              <div className="flex-1 text-sm text-dark-400">
                <span className="text-green-400">↓</span>{' '}
                {formatBytesPerSecond(network?.recv_rate ?? 0)}
                <span className="mx-2">|</span>
                <span className="text-yellow-400">↑</span>{' '}
                {formatBytesPerSecond(network?.send_rate ?? 0)}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-dark-700 flex items-center justify-between text-xs text-dark-500">
            <span>Last seen: {formatRelativeTime(host.last_seen)}</span>
            {memory && (
              <span>
                {formatBytes(memory.used)} / {formatBytes(memory.total)}
              </span>
            )}
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
