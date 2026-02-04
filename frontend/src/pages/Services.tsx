import { HardDrive, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardBody } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useLatestMetrics, useHosts } from '@/hooks/useMetrics';
import { cn } from '@/lib/utils';
import type { ServiceMetric, DockerMetric } from '@/types';

export function Services() {
  const { data: hostsData, isLoading: hostsLoading } = useHosts();
  const { data: latestMetrics, isLoading: metricsLoading } = useLatestMetrics();

  const hosts = hostsData?.items ?? [];

  if (hostsLoading || metricsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // Collect all services and containers across hosts
  const allServices: { hostName: string; service: ServiceMetric }[] = [];
  const allContainers: { hostName: string; container: DockerMetric }[] = [];

  hosts.forEach((host) => {
    const metric = latestMetrics?.[host.id];
    if (metric?.metric_data.services) {
      metric.metric_data.services.forEach((service: any) => {
        allServices.push({ hostName: host.hostname, service });
      });
    }
    if (metric?.metric_data.docker) {
      metric.metric_data.docker.forEach((container: any) => {
        allContainers.push({ hostName: host.hostname, container });
      });
    }
  });

  return (
    <div className="min-h-screen">
      <Header title="Services" />

      <div className="p-6">
        {/* Service Health Checks */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-dark-100 mb-4">Service Health Checks</h2>
          {allServices.length === 0 ? (
            <div className="card p-8 text-center">
              <HardDrive className="h-10 w-10 text-dark-500 mx-auto mb-3" />
              <p className="text-dark-400">No service health checks configured</p>
              <p className="text-sm text-dark-500 mt-1">
                Add service checks to your agent configuration
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allServices.map((item, index) => (
                <Card key={index}>
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {item.service.status === 'healthy' ? (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        ) : item.service.status === 'unhealthy' ? (
                          <XCircle className="h-5 w-5 text-red-400" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-400" />
                        )}
                        <div>
                          <p className="font-medium text-dark-100">{item.service.name}</p>
                          <p className="text-sm text-dark-500">{item.hostName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={cn(
                            'text-sm capitalize',
                            item.service.status === 'healthy'
                              ? 'text-green-400'
                              : item.service.status === 'unhealthy'
                              ? 'text-red-400'
                              : 'text-yellow-400'
                          )}
                        >
                          {item.service.status}
                        </span>
                        {item.service.response_time && (
                          <p className="text-xs text-dark-500">
                            {item.service.response_time.toFixed(0)}ms
                          </p>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Docker Containers */}
        <section>
          <h2 className="text-lg font-semibold text-dark-100 mb-4">Docker Containers</h2>
          {allContainers.length === 0 ? (
            <div className="card p-8 text-center">
              <HardDrive className="h-10 w-10 text-dark-500 mx-auto mb-3" />
              <p className="text-dark-400">No Docker containers found</p>
              <p className="text-sm text-dark-500 mt-1">
                Containers will appear here when detected by agents
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allContainers.map((item, index) => (
                <Card key={index}>
                  <CardBody>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-dark-100">{item.container.name}</p>
                        <p className="text-xs text-dark-500">{item.hostName}</p>
                      </div>
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-xs',
                          item.container.status === 'running'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-red-500/10 text-red-400'
                        )}
                      >
                        {item.container.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-dark-400">CPU</span>
                        <span className="text-dark-200">
                          {item.container.cpu_percent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">Memory</span>
                        <span className="text-dark-200">
                          {item.container.memory_percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
