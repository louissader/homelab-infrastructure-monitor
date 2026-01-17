import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import { formatPercent } from '@/lib/utils';
import type { Metric } from '@/types';

interface CpuChartProps {
  metrics: Metric[];
}

export function CpuChart({ metrics }: CpuChartProps) {
  const data = metrics
    .filter(m => m.metric_data.cpu)
    .map(m => ({
      time: new Date(m.timestamp).toLocaleTimeString(),
      cpu: m.metric_data.cpu?.percent ?? 0,
      load1: m.metric_data.cpu?.load_avg['1min'] ?? 0,
    }))
    .slice(-30);

  return (
    <Card>
      <CardHeader>
        <CardTitle>CPU Usage</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
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
                formatter={(value) => [formatPercent(Number(value)), 'CPU']}
              />
              <Line
                type="monotone"
                dataKey="cpu"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}
