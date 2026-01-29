import { useState } from 'react';
import { Plus, Search, Box } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { ClusterCard } from '@/components/ClusterCard';
import { Spinner } from '@/components/ui/Spinner';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { useClusters, useCreateCluster } from '@/hooks/useKubernetes';

export function Kubernetes() {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const { data: clusters, isLoading, refetch } = useClusters();
  const createCluster = useCreateCluster();

  const [newCluster, setNewCluster] = useState({
    name: '',
    kubeconfig_path: 'mock',
  });

  const filteredClusters = (clusters ?? []).filter(
    (cluster) => cluster.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateCluster = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCluster.mutateAsync({
        name: newCluster.name,
        kubeconfig_path: newCluster.kubeconfig_path || 'mock',
      });
      setShowAddModal(false);
      setNewCluster({ name: '', kubeconfig_path: 'mock' });
    } catch (error) {
      console.error('Failed to create cluster:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Kubernetes Clusters" onRefresh={() => refetch()} />

      <div className="p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search clusters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-80"
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Cluster
          </button>
        </div>

        {/* Clusters Grid */}
        {filteredClusters.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center">
              <Box className="h-12 w-12 mx-auto mb-4 text-dark-500" />
              <h3 className="text-lg font-semibold text-dark-200 mb-2">
                {search ? 'No clusters match your search' : 'No Kubernetes clusters'}
              </h3>
              <p className="text-dark-400 mb-4">
                {search
                  ? 'Try a different search term'
                  : 'Add a cluster to start monitoring your Kubernetes infrastructure'}
              </p>
              {!search && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn btn-primary"
                >
                  Add Your First Cluster
                </button>
              )}
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClusters.map((cluster) => (
              <ClusterCard key={cluster.id} cluster={cluster} />
            ))}
          </div>
        )}
      </div>

      {/* Add Cluster Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Add Kubernetes Cluster</CardTitle>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleCreateCluster} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">
                    Cluster Name
                  </label>
                  <input
                    type="text"
                    value={newCluster.name}
                    onChange={(e) => setNewCluster({ ...newCluster, name: e.target.value })}
                    className="input w-full"
                    placeholder="e.g., homelab-cluster"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1">
                    Kubeconfig Path
                  </label>
                  <input
                    type="text"
                    value={newCluster.kubeconfig_path}
                    onChange={(e) => setNewCluster({ ...newCluster, kubeconfig_path: e.target.value })}
                    className="input w-full"
                    placeholder="~/.kube/config or 'mock' for demo"
                  />
                  <p className="text-xs text-dark-500 mt-1">
                    Use "mock" for demo mode with simulated data
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createCluster.isPending || !newCluster.name}
                    className="btn btn-primary"
                  >
                    {createCluster.isPending ? 'Adding...' : 'Add Cluster'}
                  </button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
