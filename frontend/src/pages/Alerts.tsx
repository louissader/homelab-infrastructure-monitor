import { useState } from 'react';
import { Bell, Filter } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { AlertCard } from '@/components/AlertCard';
import { Spinner } from '@/components/ui/Spinner';
import { useAlerts } from '@/hooks/useMetrics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { acknowledgeAlert, resolveAlert } from '@/api/client';
import { cn } from '@/lib/utils';

export function Alerts() {
  const [showResolved, setShowResolved] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: alertsData, isLoading, refetch } = useAlerts(showResolved);

  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const resolveMutation = useMutation({
    mutationFn: resolveAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  let alerts = alertsData?.items ?? [];
  if (severityFilter) {
    alerts = alerts.filter((a) => a.severity === severityFilter);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Alerts" onRefresh={() => refetch()} />

      <div className="p-6">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-dark-400" />
            <span className="text-sm text-dark-400">Filters:</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResolved(false)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                !showResolved
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              )}
            >
              Active
            </button>
            <button
              onClick={() => setShowResolved(true)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                showResolved
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              )}
            >
              Resolved
            </button>
          </div>

          <div className="h-6 w-px bg-dark-700" />

          <div className="flex items-center gap-2">
            {['critical', 'warning', 'info'].map((severity) => (
              <button
                key={severity}
                onClick={() =>
                  setSeverityFilter(severityFilter === severity ? null : severity)
                }
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm capitalize transition-colors',
                  severityFilter === severity
                    ? severity === 'critical'
                      ? 'bg-red-600 text-white'
                      : severity === 'warning'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-blue-600 text-white'
                    : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                )}
              >
                {severity}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts List */}
        {alerts.length === 0 ? (
          <div className="card p-12 text-center">
            <Bell className="h-12 w-12 text-dark-500 mx-auto mb-4" />
            <p className="text-dark-300">No {showResolved ? 'resolved' : 'active'} alerts</p>
            <p className="text-sm text-dark-500 mt-1">
              {showResolved
                ? 'Resolved alerts will appear here'
                : 'Your infrastructure is running smoothly'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={(id) => acknowledgeMutation.mutate(id)}
                onResolve={(id) => resolveMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
