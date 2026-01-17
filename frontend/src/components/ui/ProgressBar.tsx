import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  colorThresholds?: { warning: number; critical: number };
}

export function ProgressBar({
  value,
  max = 100,
  showLabel = true,
  size = 'md',
  colorThresholds = { warning: 70, critical: 90 },
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const getColor = () => {
    if (percentage >= colorThresholds.critical) return 'bg-red-500';
    if (percentage >= colorThresholds.warning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className="w-full">
      <div className={cn('w-full bg-dark-700 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-dark-400 mt-1">{percentage.toFixed(1)}%</span>
      )}
    </div>
  );
}
