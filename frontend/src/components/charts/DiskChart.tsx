import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardHeader, CardBody, CardTitle } from '@/components/ui/Card';
import { formatBytes } from '@/lib/utils';
import type { DiskPartition } from '@/types';

interface DiskChartProps {
  partitions: DiskPartition[];
}

export function DiskChart({ partitions }: DiskChartProps) {
  const data = partitions.map(p => ({
    name: p.mountpoint.length > 15 ? `...${p.mountpoint.slice(-12)}` : p.mountpoint,
    used: p.used,
    free: p.free,
    percent: p.percent,
  }));

  const getColor = (percent: number) => {
    if (percent >= 90) return '#ef4444';
    if (percent >= 70) return '#f59e0b';
    return '#10b981';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Disk Usage</CardTitle>
      </CardHeader>
      <CardBody>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                type="number"
                stroke="#64748b"
                fontSize={12}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#64748b"
                fontSize={12}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value, name, props) => {
                  const numValue = Number(value);
                  const item = props.payload;
                  if (name === 'percent') {
                    return [`${numValue.toFixed(1)}% (${formatBytes(item.used)} / ${formatBytes(item.used + item.free)})`, 'Used'];
                  }
                  return [numValue, String(name)];
                }}
              />
              <Bar dataKey="percent" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(entry.percent)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}
