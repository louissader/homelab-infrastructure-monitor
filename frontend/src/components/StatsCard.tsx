import { cn } from '@/lib/utils';
import { Card, CardBody } from '@/components/ui/Card';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
}: StatsCardProps) {
  return (
    <Card className={className}>
      <CardBody>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-dark-400">{title}</p>
            <p className="text-3xl font-bold text-dark-100 mt-1">{value}</p>
            {subtitle && (
              <p className="text-sm text-dark-500 mt-1">{subtitle}</p>
            )}
            {trend && (
              <p
                className={cn(
                  'text-sm mt-2',
                  trend.isPositive ? 'text-green-400' : 'text-red-400'
                )}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </p>
            )}
          </div>
          <div className="h-12 w-12 rounded-lg bg-primary-600/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary-400" />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
