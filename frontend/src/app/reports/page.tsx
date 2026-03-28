'use client';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts';

const MONTHLY_DATA = [
  { month: '10월', volume: 1050000, maintenance: 3, cost: 485000 },
  { month: '11월', volume: 1120000, maintenance: 5, cost: 620000 },
  { month: '12월', volume: 1080000, maintenance: 4, cost: 390000 },
  { month: '1월',  volume: 1190000, maintenance: 6, cost: 780000 },
  { month: '2월',  volume: 1150000, maintenance: 3, cost: 310000 },
  { month: '3월',  volume: 1240500, maintenance: 7, cost: 1075000 },
];

const EQUIPMENT_TYPE_DATA = [
  { name: '역삼투압(RO)',  count: 7, volume: 28000, color: '#3b82f6' },
  { name: '초순수(DI)',   count: 3, volume: 9000,  color: '#8b5cf6' },
  { name: '해수담수화',   count: 2, volume: 5000,  color: '#06b6d4' },
  { name: '기타',        count: 2, volume: 900,   color: '#94a3b8' },
];

const EFFICIENCY_DATA = [
  { time: '00:00', eff: 97.2 }, { time: '03:00', eff: 97.8 }, { time: '06:00', eff: 98.1 },
  { time: '09:00', eff: 99.1 }, { time: '12:00', eff: 99.5 }, { time: '15:00', eff: 99.3 },
  { time: '18:00', eff: 98.9 }, { time: '21:00', eff: 98.4 }, { time: '24:00', eff: 97.6 },
];

export default function ReportsPage() {
  return (
    <DashboardLayout title="보고서" subtitle="운영 현황 분석 리포트">
      <div className="grid grid-cols-12 gap-5">
        {/* Monthly Volume */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">월별 정수 생산량 및 유지보수 현황</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v, n) => [
                    n === '생산량(L)' ? `${Number(v).toLocaleString('ko-KR')} L` : `${v}건`,
                    n
                  ]}
                  contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar yAxisId="left" dataKey="volume" name="생산량(L)" fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar yAxisId="right" dataKey="maintenance" name="유지보수(건)" fill="#f59e0b" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Equipment Type Distribution */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">장비 유형별 분포</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={EQUIPMENT_TYPE_DATA} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                  {EQUIPMENT_TYPE_DATA.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Legend iconSize={8} iconType="circle" formatter={v => <span style={{ fontSize: '11px' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {EQUIPMENT_TYPE_DATA.map(t => (
              <div key={t.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                  <span className="text-slate-600 text-xs">{t.name}</span>
                </div>
                <span className="font-semibold text-slate-800">{t.count}대</span>
              </div>
            ))}
          </div>
        </div>

        {/* Efficiency Trend */}
        <div className="col-span-12 lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-1">오늘 평균 오염 제거율 추이</h3>
          <p className="text-xs text-slate-400 mb-4">전체 RO 장비 기준</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={EFFICIENCY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[95, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={v => [`${v}%`, '제거율']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="eff" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Cost */}
        <div className="col-span-12 lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-1">월별 유지보수 비용</h3>
          <p className="text-xs text-slate-400 mb-4">부품비 + 인건비 포함</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/10000).toFixed(0)}만`} />
                <Tooltip formatter={v => [`${Number(v).toLocaleString('ko-KR')}원`, '유지보수 비용']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="cost" name="비용" fill="#8b5cf6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Table */}
        <div className="col-span-12 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">월별 운영 요약</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs font-semibold text-slate-500">
                {['기간', '총 생산량', '일평균 생산량', '유지보수 건수', '유지보수 비용', '가동률'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MONTHLY_DATA.map(row => (
                <tr key={row.month} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">2025년 {row.month}</td>
                  <td className="px-4 py-3 text-slate-700">{row.volume.toLocaleString('ko-KR')} L</td>
                  <td className="px-4 py-3 text-slate-600">{Math.floor(row.volume / 30).toLocaleString('ko-KR')} L</td>
                  <td className="px-4 py-3 text-slate-600">{row.maintenance}건</td>
                  <td className="px-4 py-3 text-slate-600">{row.cost.toLocaleString('ko-KR')}원</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-20">
                        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: '95%' }} />
                      </div>
                      <span className="text-emerald-600 font-semibold text-xs">95%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
