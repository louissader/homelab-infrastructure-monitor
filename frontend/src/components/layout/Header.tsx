import { Bell, Search, RefreshCw } from 'lucide-react';
import { useAlerts } from '@/hooks/useMetrics';

interface HeaderProps {
  title: string;
  onRefresh?: () => void;
}

export function Header({ title, onRefresh }: HeaderProps) {
  const { data: alertsData } = useAlerts(false);
  const unresolvedCount = alertsData?.total ?? 0;

  return (
    <header className="h-16 bg-dark-900/50 backdrop-blur border-b border-dark-700 flex items-center justify-between px-6">
      <h1 className="text-xl font-semibold text-dark-100">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
          <input
            type="text"
            placeholder="Search hosts..."
            className="input pl-10 w-64"
          />
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg text-dark-400 hover:text-dark-100 hover:bg-dark-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        )}

        <button className="relative p-2 rounded-lg text-dark-400 hover:text-dark-100 hover:bg-dark-800 transition-colors">
          <Bell className="h-5 w-5" />
          {unresolvedCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
              {unresolvedCount > 9 ? '9+' : unresolvedCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
