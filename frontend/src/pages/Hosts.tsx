import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { HostCard } from '@/components/HostCard';
import { Spinner } from '@/components/ui/Spinner';
import { useHosts, useLatestMetrics } from '@/hooks/useMetrics';

export function Hosts() {
  const [search, setSearch] = useState('');
  const { data: hostsData, isLoading, refetch } = useHosts();
  const { data: latestMetrics } = useLatestMetrics();

  const hosts = hostsData?.items ?? [];
  const filteredHosts = hosts.filter(
    (host) =>
      host.hostname.toLowerCase().includes(search.toLowerCase()) ||
      host.ip_address.includes(search)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Hosts" onRefresh={() => refetch()} />

      <div className="p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search hosts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-80"
            />
          </div>
          <button className="btn btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Host
          </button>
        </div>

        {/* Hosts Grid */}
        {filteredHosts.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-dark-400">
              {search ? 'No hosts match your search' : 'No hosts registered yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHosts.map((host) => (
              <HostCard
                key={host.id}
                host={host}
                latestMetric={latestMetrics?.[host.id]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
