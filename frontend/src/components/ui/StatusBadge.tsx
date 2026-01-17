import { cn, getStatusBgColor } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, showLabel = true, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'rounded-full animate-pulse-slow',
          getStatusBgColor(status),
          sizeClasses[size]
        )}
      />
      {showLabel && (
        <span className="text-sm capitalize text-dark-300">{status}</span>
      )}
    </div>
  );
}
