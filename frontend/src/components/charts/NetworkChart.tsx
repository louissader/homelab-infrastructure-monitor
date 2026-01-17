import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import { formatBytesPerSecond } from '@/lib/utils';
import type { Metric } from '@/types';

interface NetworkChartProps {
  metrics: Metric[];
}

export function NetworkChart({ metrics }: NetworkChartProps) {
  const data = metrics
    .filter(m => m.metric_data.network)
    .map(m => ({
      time: new Date(m.timestamp).toLocaleTimeString(),
      sent: m.metric_data.network?.send_rate ?? 0,
      recv: m.metric_data.network?.recv_rate ?? 0,
    }))
    .slice(-30);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Network I/O</CardTitle>
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
                tickFormatter={(value) => formatBytesPerSecond(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value) => [formatBytesPerSecond(Number(value))]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="recv"
                name="Download"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="sent"
                name="Upload"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}
