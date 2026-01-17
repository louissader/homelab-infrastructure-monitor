import { Server, AlertTriangle, Activity, CheckCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { StatsCard } from '@/components/StatsCard';
import { HostCard } from '@/components/HostCard';
import { AlertCard } from '@/components/AlertCard';
import { Spinner } from '@/components/ui/Spinner';
import { useHosts, useLatestMetrics, useAlerts } from '@/hooks/useMetrics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { acknowledgeAlert, resolveAlert } from '@/api/client';

export function Dashboard() {
  const queryClient = useQueryClient();
  const { data: hostsData, isLoading: hostsLoading, refetch } = useHosts();
  const { data: latestMetrics } = useLatestMetrics();
  const { data: alertsData } = useAlerts(false);

  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const resolveMutation = useMutation({
    mutationFn: resolveAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const hosts = hostsData?.items ?? [];
  const alerts = alertsData?.items ?? [];

  const onlineHosts = hosts.filter((h) => h.status === 'online').length;
  const offlineHosts = hosts.filter((h) => h.status === 'offline').length;
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical' && !a.resolved).length;

  if (hostsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Dashboard" onRefresh={() => refetch()} />

      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title="Total Hosts"
            value={hosts.length}
            subtitle={`${onlineHosts} online`}
            icon={Server}
          />
          <StatsCard
            title="Online"
            value={onlineHosts}
            subtitle={`${((onlineHosts / hosts.length) * 100 || 0).toFixed(0)}% uptime`}
            icon={CheckCircle}
          />
          <StatsCard
            title="Offline"
            value={offlineHosts}
            subtitle={offlineHosts > 0 ? 'Requires attention' : 'All systems go'}
            icon={Activity}
          />
          <StatsCard
            title="Critical Alerts"
            value={criticalAlerts}
            subtitle={criticalAlerts > 0 ? 'Action required' : 'No critical issues'}
            icon={AlertTriangle}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hosts Grid */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-dark-100 mb-4">Monitored Hosts</h2>
            {hosts.length === 0 ? (
              <div className="card p-8 text-center">
                <Server className="h-12 w-12 text-dark-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-dark-300">No hosts yet</h3>
                <p className="text-dark-500 mt-1">
                  Deploy an agent to start monitoring your infrastructure
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hosts.slice(0, 6).map((host) => (
                  <HostCard
                    key={host.id}
                    host={host}
                    latestMetric={latestMetrics?.[host.id]}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Recent Alerts */}
          <div>
            <h2 className="text-lg font-semibold text-dark-100 mb-4">Recent Alerts</h2>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="card p-6 text-center">
                  <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
                  <p className="text-dark-300">No active alerts</p>
                  <p className="text-sm text-dark-500">Your infrastructure is healthy</p>
                </div>
              ) : (
                alerts.slice(0, 5).map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={(id) => acknowledgeMutation.mutate(id)}
                    onResolve={(id) => resolveMutation.mutate(id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
