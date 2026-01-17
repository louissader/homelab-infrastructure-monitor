import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Server } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardBody } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CpuChart } from '@/components/charts/CpuChart';
import { MemoryChart } from '@/components/charts/MemoryChart';
import { NetworkChart } from '@/components/charts/NetworkChart';
import { DiskChart } from '@/components/charts/DiskChart';
import { Spinner } from '@/components/ui/Spinner';
import { useMetricsHistory } from '@/hooks/useMetrics';
import { formatBytes, formatRelativeTime } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getHost } from '@/api/client';

export function HostDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: host, isLoading: hostLoading } = useQuery({
    queryKey: ['host', id],
    queryFn: () => getHost(id!),
    enabled: !!id,
  });

  const { data: metricsData, isLoading: metricsLoading } = useMetricsHistory(id!, undefined);

  if (hostLoading || metricsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!host) {
    return (
      <div className="p-6">
        <div className="card p-12 text-center">
          <p className="text-dark-400">Host not found</p>
          <Link to="/hosts" className="text-primary-400 hover:underline mt-2 block">
            Back to hosts
          </Link>
        </div>
      </div>
    );
  }

  const metrics = metricsData?.items ?? [];
  const latestMetric = metrics[0];
  const cpu = latestMetric?.metric_data.cpu;
  const memory = latestMetric?.metric_data.memory;
  const disk = latestMetric?.metric_data.disk;

  return (
    <div className="min-h-screen">
      <Header title={host.hostname} />

      <div className="p-6">
        {/* Back Link */}
        <Link
          to="/hosts"
          className="inline-flex items-center gap-2 text-dark-400 hover:text-dark-100 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Hosts
        </Link>

        {/* Host Info Card */}
        <Card className="mb-6">
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-dark-700 flex items-center justify-center">
                  <Server className="h-8 w-8 text-primary-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-dark-100">{host.hostname}</h1>
                  <p className="text-dark-400">{host.ip_address}</p>
                  <p className="text-sm text-dark-500">
                    Last seen: {formatRelativeTime(host.last_seen)}
                  </p>
                </div>
              </div>
              <StatusBadge status={host.status} size="lg" />
            </div>
          </CardBody>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardBody>
              <p className="text-sm text-dark-400 mb-2">CPU Usage</p>
              <p className="text-3xl font-bold text-dark-100 mb-2">
                {cpu?.percent?.toFixed(1) ?? 0}%
              </p>
              <ProgressBar value={cpu?.percent ?? 0} showLabel={false} />
              {cpu?.load_avg && (
                <p className="text-xs text-dark-500 mt-2">
                  Load: {cpu.load_avg['1min'].toFixed(2)} / {cpu.load_avg['5min'].toFixed(2)} /{' '}
                  {cpu.load_avg['15min'].toFixed(2)}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="text-sm text-dark-400 mb-2">Memory Usage</p>
              <p className="text-3xl font-bold text-dark-100 mb-2">
                {memory?.percent?.toFixed(1) ?? 0}%
              </p>
              <ProgressBar value={memory?.percent ?? 0} showLabel={false} />
              {memory && (
                <p className="text-xs text-dark-500 mt-2">
                  {formatBytes(memory.used)} / {formatBytes(memory.total)}
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <p className="text-sm text-dark-400 mb-2">Primary Disk</p>
              <p className="text-3xl font-bold text-dark-100 mb-2">
                {disk?.partitions?.[0]?.percent?.toFixed(1) ?? 0}%
              </p>
              <ProgressBar value={disk?.partitions?.[0]?.percent ?? 0} showLabel={false} />
              {disk?.partitions?.[0] && (
                <p className="text-xs text-dark-500 mt-2">
                  {formatBytes(disk.partitions[0].used)} / {formatBytes(disk.partitions[0].total)}
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CpuChart metrics={metrics} />
          <MemoryChart metrics={metrics} />
          <NetworkChart metrics={metrics} />
          {disk?.partitions && <DiskChart partitions={disk.partitions} />}
        </div>
      </div>
    </div>
  );
}
