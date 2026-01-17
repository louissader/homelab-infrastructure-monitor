import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import { formatBytes, formatPercent } from '@/lib/utils';
import type { Metric } from '@/types';

interface MemoryChartProps {
  metrics: Metric[];
}

export function MemoryChart({ metrics }: MemoryChartProps) {
  const data = metrics
    .filter(m => m.metric_data.memory)
    .map(m => ({
      time: new Date(m.timestamp).toLocaleTimeString(),
      used: m.metric_data.memory?.used ?? 0,
      total: m.metric_data.memory?.total ?? 0,
      percent: m.metric_data.memory?.percent ?? 0,
    }))
    .slice(-30);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Memory Usage</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value, name) => {
                  const numValue = Number(value);
                  if (name === 'percent') return [formatPercent(numValue), 'Usage'];
                  return [formatBytes(numValue), name === 'used' ? 'Used' : 'Total'];
                }}
              />
              <Area
                type="monotone"
                dataKey="percent"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}
