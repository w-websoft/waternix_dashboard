'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DataPoint {
  date: string;
  volume: number;
}

const BASE_VOLUMES = [
  41200, 38900, 43500, 40100, 39800, 44200, 42800,
  38600, 41900, 43100, 40700, 42300, 39500, 44800,
];

export default function VolumeChart() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const base = new Date();
    const generated = BASE_VOLUMES.map((vol, i) => {
      const date = new Date(base);
      date.setDate(base.getDate() - (13 - i));
      return {
        date: date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
        volume: vol,
      };
    });
    setData(generated);
  }, []);

  if (!mounted || data.length === 0) {
    return <div className="h-44 bg-slate-50 rounded-lg animate-pulse" />;
  }

  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip
            formatter={(value) => [`${Number(value).toLocaleString('ko-KR')} L`, '일일 생산량']}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
          />
          <Area type="monotone" dataKey="volume" stroke="#3b82f6" strokeWidth={2} fill="url(#volumeGrad)" dot={false} activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
