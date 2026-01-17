import { useState } from 'react';
import { Activity } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { CpuChart } from '@/components/charts/CpuChart';
import { MemoryChart } from '@/components/charts/MemoryChart';
import { NetworkChart } from '@/components/charts/NetworkChart';
import { Spinner } from '@/components/ui/Spinner';
import { useHosts, useMetricsHistory } from '@/hooks/useMetrics';
import { cn } from '@/lib/utils';

export function Metrics() {
  const { data: hostsData, isLoading: hostsLoading } = useHosts();
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);

  const hosts = hostsData?.items ?? [];
  const activeHostId = selectedHostId || hosts[0]?.id;

  const { data: metricsData, isLoading: metricsLoading } = useMetricsHistory(
    activeHostId || '',
    undefined
  );

  const metrics = metricsData?.items ?? [];

  if (hostsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Metrics" />

      <div className="p-6">
        {hosts.length === 0 ? (
          <div className="card p-12 text-center">
            <Activity className="h-12 w-12 text-dark-500 mx-auto mb-4" />
            <p className="text-dark-300">No hosts available</p>
            <p className="text-sm text-dark-500 mt-1">
              Deploy an agent to start collecting metrics
            </p>
          </div>
        ) : (
          <>
            {/* Host Selector */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
              {hosts.map((host) => (
                <button
                  key={host.id}
                  onClick={() => setSelectedHostId(host.id)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors',
                    activeHostId === host.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                  )}
                >
                  {host.hostname}
                </button>
              ))}
            </div>

            {/* Charts */}
            {metricsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : metrics.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-dark-400">No metrics available for this host</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CpuChart metrics={metrics} />
                <MemoryChart metrics={metrics} />
                <NetworkChart metrics={metrics} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
