import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { cn, getSeverityColor, formatRelativeTime } from '@/lib/utils';
import type { Alert } from '@/types';

interface AlertCardProps {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
}

export function AlertCard({ alert, onAcknowledge, onResolve }: AlertCardProps) {
  return (
    <Card className={cn('border-l-4', getSeverityColor(alert.severity))}>
      <CardBody>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={cn(
                'h-5 w-5 mt-0.5',
                alert.severity === 'critical'
                  ? 'text-red-400'
                  : alert.severity === 'warning'
                  ? 'text-yellow-400'
                  : 'text-blue-400'
              )}
            />
            <div>
              <p className="font-medium text-dark-100">{alert.message}</p>
              <div className="flex items-center gap-4 mt-1 text-sm text-dark-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(alert.triggered_at)}
                </span>
                <span className="capitalize px-2 py-0.5 rounded bg-dark-700 text-xs">
                  {alert.severity}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!alert.acknowledged && onAcknowledge && (
              <button
                onClick={() => onAcknowledge(alert.id)}
                className="btn btn-secondary text-sm py-1.5"
              >
                Acknowledge
              </button>
            )}
            {!alert.resolved && onResolve && (
              <button
                onClick={() => onResolve(alert.id)}
                className="btn btn-primary text-sm py-1.5"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Resolve
              </button>
            )}
            {alert.resolved && (
              <span className="text-green-400 text-sm flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Resolved
              </span>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
