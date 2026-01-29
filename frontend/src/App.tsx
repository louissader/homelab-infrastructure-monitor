import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Hosts } from '@/pages/Hosts';
import { HostDetail } from '@/pages/HostDetail';
import { Metrics } from '@/pages/Metrics';
import { Alerts } from '@/pages/Alerts';
import { Services } from '@/pages/Services';
import { Settings } from '@/pages/Settings';
import { Kubernetes } from '@/pages/Kubernetes';
import { ClusterDetail } from '@/pages/ClusterDetail';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="hosts" element={<Hosts />} />
            <Route path="hosts/:id" element={<HostDetail />} />
            <Route path="kubernetes" element={<Kubernetes />} />
            <Route path="kubernetes/:clusterId" element={<ClusterDetail />} />
            <Route path="metrics" element={<Metrics />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="services" element={<Services />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
