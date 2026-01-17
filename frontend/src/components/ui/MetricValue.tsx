import { cn } from '@/lib/utils';

interface MetricValueProps {
  value: string | number;
  label: string;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}

export function MetricValue({ value, label, trend, className }: MetricValueProps) {
  const trendColors = {
    up: 'text-red-400',
    down: 'text-green-400',
    stable: 'text-dark-400',
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <span className="text-2xl font-bold text-dark-100">{value}</span>
      <div className="flex items-center gap-1">
        <span className="text-sm text-dark-400">{label}</span>
        {trend && (
          <span className={cn('text-xs', trendColors[trend])}>
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {trend === 'stable' && '→'}
          </span>
        )}
      </div>
    </div>
  );
}
