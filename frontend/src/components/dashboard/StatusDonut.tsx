'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DashboardSummary } from '@/types';

interface StatusDonutProps {
  summary: DashboardSummary;
}

const STATUS_DATA_CONFIG = [
  { key: 'normalCount',      label: '정상',    color: '#10b981' },
  { key: 'warningCount',     label: '경고',    color: '#f59e0b' },
  { key: 'errorCount',       label: '오류',    color: '#ef4444' },
  { key: 'offlineCount',     label: '오프라인', color: '#9ca3af' },
  { key: 'maintenanceCount', label: '유지보수', color: '#3b82f6' },
];

export default function StatusDonut({ summary }: StatusDonutProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const data = STATUS_DATA_CONFIG.map(c => ({
    name: c.label,
    value: summary[c.key as keyof DashboardSummary] as number,
    color: c.color,
  })).filter(d => d.value > 0);

  if (!mounted) {
    return <div className="h-48 bg-slate-50 rounded-lg animate-pulse" />;
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${value}대`, name]}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
          />
          <Legend
            iconSize={8}
            iconType="circle"
            formatter={(value) => <span style={{ fontSize: '12px', color: '#475569' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
