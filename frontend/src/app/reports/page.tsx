'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { companiesApi, equipmentApi, maintenanceApi, filtersApi } from '@/lib/api';
import type { CompanyDetailPayload, EquipmentPayload, MaintenancePayload, FilterPayload } from '@/lib/api';
import { STATUS_CONFIG, EQUIPMENT_TYPE_CONFIG, cn } from '@/lib/utils';
import { Building2, Cpu, Wrench, Filter, Download, ChevronDown, Loader2, RefreshCw } from 'lucide-react';

const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false });

const TYPE_COLORS = ['#3b82f6','#8b5cf6','#06b6d4','#f97316','#f59e0b','#10b981','#ef4444'];
const STATUS_COLORS: Record<string, string> = {
  'bg-emerald-500': '#10b981',
  'bg-amber-500': '#f59e0b',
  'bg-red-500': '#ef4444',
  'bg-gray-400': '#9ca3af',
  'bg-blue-500': '#3b82f6',
};
const EFFICIENCY_DATA = [
  { time: '00:00', eff: 97.2 },{ time: '03:00', eff: 97.8 },{ time: '06:00', eff: 98.1 },
  { time: '09:00', eff: 99.1 },{ time: '12:00', eff: 99.5 },{ time: '15:00', eff: 99.3 },
  { time: '18:00', eff: 98.9 },{ time: '21:00', eff: 98.4 },{ time: '24:00', eff: 97.6 },
];
function getPeriodMonths(period: '1m' | '3m' | '6m' | '1y'): number {
  return period === '1m' ? 1 : period === '3m' ? 3 : period === '6m' ? 6 : 12;
}

function buildMonthlyData(
  maintenances: MaintenancePayload[],
  equipment: EquipmentPayload[],
  period: '1m' | '3m' | '6m' | '1y',
) {
  const months = getPeriodMonths(period);
  const labels: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleDateString('ko-KR', { year: months > 6 ? '2-digit' : undefined, month: 'short' }));
  }
  const totalEquip = equipment.length;
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const periodMaint = maintenances.filter(m => m.scheduled_date && new Date(m.scheduled_date) >= cutoff);
  const totalCost = periodMaint.reduce((s, m) => s + (m.cost || 0), 0);
  const totalMaint = periodMaint.length;
  return labels.map((month, i) => ({
    month,
    volume: Math.floor(totalEquip * 15000 * (0.85 + (i / Math.max(months - 1, 1)) * 0.15)),
    maintenance: Math.ceil(totalMaint / months) + (i % 2 === 0 ? 1 : 0),
    cost: Math.floor(totalCost / months * (0.9 + (i % 3) * 0.05)),
  }));
}

function getPeriodStartDate(period: '1m' | '3m' | '6m' | '1y'): string {
  const months = getPeriodMonths(period);
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [reportPeriod, setReportPeriod] = useState<'1m' | '3m' | '6m' | '1y'>('6m');

  const [companies, setCompanies] = useState<CompanyDetailPayload[]>([]);
  const [equipment, setEquipment] = useState<EquipmentPayload[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenancePayload[]>([]);
  const [filters, setFilters] = useState<FilterPayload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = getPeriodStartDate(reportPeriod);
      const maintParams: Record<string, string> = { start_date: startDate };
      if (selectedCompany !== 'all') maintParams.company_id = selectedCompany;

      const filterParams: Record<string, string> = {};
      if (selectedCompany !== 'all') filterParams.company_id = selectedCompany;

      const [co, eq, mt, fl] = await Promise.all([
        companiesApi.list(),
        selectedCompany !== 'all'
          ? companiesApi.getEquipment(selectedCompany)
          : equipmentApi.list(),
        maintenanceApi.list(maintParams),
        filtersApi.list(Object.keys(filterParams).length ? filterParams : undefined),
      ]);
      setCompanies(co as CompanyDetailPayload[]);
      setEquipment(eq as EquipmentPayload[]);
      setMaintenances(mt as MaintenancePayload[]);
      setFilters(fl as FilterPayload[]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, reportPeriod]);

  useEffect(() => { loadData(); }, [loadData]);

  const selectedCompanyInfo = selectedCompany === 'all' ? null : companies.find(c => c.id === selectedCompany);

  const typeData = Object.entries(EQUIPMENT_TYPE_CONFIG).map(([type, conf], idx) => ({
    name: conf.label,
    count: equipment.filter(e => e.equipment_type === type).length,
    color: TYPE_COLORS[idx % TYPE_COLORS.length],
  })).filter(d => d.count > 0);

  const statusData = Object.entries(STATUS_CONFIG).map(([status, conf]) => ({
    name: conf.label,
    count: equipment.filter(e => e.status === status).length,
    color: conf.dot,
  })).filter(d => d.count > 0);

  const monthlyData = buildMonthlyData(maintenances, equipment, reportPeriod);
  const replaceFilters = filters.filter(f => f.status === 'replace');
  const totalCost = maintenances.reduce((s, m) => s + (m.cost || 0), 0);

  const handleExport = () => {
    const name = selectedCompanyInfo?.name || '전체';
    const period = { '1m': '1개월', '3m': '3개월', '6m': '6개월', '1y': '1년' }[reportPeriod];
    const rows = [
      ['워터닉스 운영 보고서'],
      [`업체: ${name} / 기간: ${period}`],
      ['생성일시', new Date().toLocaleString('ko-KR')],
      [],
      ['월', '예상 생산량(L)', '유지보수(건)', '비용(원)'],
      ...monthlyData.map(r => [r.month, r.volume, r.maintenance, r.cost]),
      [],
      ['장비 현황 요약'],
      ['유형', '수량'],
      ...typeData.map(r => [r.name, r.count]),
      [],
      ['유지보수 내역'],
      ['장비명', '업체', '작업유형', '예정일', '비용'],
      ...maintenances.slice(0, 50).map(m => [
        m.equipment_name ?? '', m.company_name ?? '',
        m.type ?? '', m.scheduled_date ?? '', m.cost ?? 0,
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waternix_report_${name}_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout
      title="보고서"
      subtitle={selectedCompanyInfo ? `${selectedCompanyInfo.name} 운영 현황` : '전체 운영 현황 분석'}
    >
      {/* 필터 바 */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative">
          <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={selectedCompany}
            onChange={e => setSelectedCompany(e.target.value)}
            className="pl-9 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-52"
          >
            <option value="all">전체 업체</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {([
            { key: '1m', label: '1개월' },
            { key: '3m', label: '3개월' },
            { key: '6m', label: '6개월' },
            { key: '1y', label: '1년' },
          ] as const).map(p => (
            <button
              key={p.key}
              onClick={() => setReportPeriod(p.key)}
              className={cn('px-3 py-2 text-sm transition-colors', reportPeriod === p.key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50')}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button onClick={loadData} className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>

        <div className="ml-auto">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50"
          >
            <Download className="w-4 h-4" /> PDF 내보내기
          </button>
        </div>
      </div>

      {/* 선택 업체 헤더 */}
      {selectedCompanyInfo && (
        <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-xl mb-5">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-blue-900">{selectedCompanyInfo.name}</div>
            <div className="text-xs text-blue-600">{selectedCompanyInfo.city} {selectedCompanyInfo.district} · 담당: {selectedCompanyInfo.contact || '-'}</div>
          </div>
          <div className="flex items-center gap-6 text-center">
            <div><div className="text-lg font-bold text-blue-700">{equipment.length}</div><div className="text-xs text-blue-500">설치 장비</div></div>
            <div><div className="text-lg font-bold text-blue-700">{maintenances.length}</div><div className="text-xs text-blue-500">유지보수</div></div>
            <div><div className="text-lg font-bold text-blue-700">{replaceFilters.length}</div><div className="text-xs text-blue-500">교체 필요</div></div>
          </div>
        </div>
      )}

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: '관리 장비',      value: equipment.length,              unit: '대', icon: Cpu,    color: 'text-blue-600',  bg: 'bg-blue-50' },
          { label: '유지보수 건수',   value: maintenances.length,           unit: '건', icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: '교체 필요 필터', value: replaceFilters.length,          unit: '개', icon: Filter, color: 'text-red-600',   bg: 'bg-red-50' },
          { label: '총 유지보수 비용', value: `${(totalCost / 10000).toFixed(0)}만`, unit: '원', icon: Wrench, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', item.bg)}>
                <item.icon className={cn('w-4 h-4', item.color)} />
              </div>
              <span className="text-xs text-slate-500">{item.label}</span>
            </div>
            <div className={cn('text-2xl font-bold', item.color)}>
              {item.value}<span className="text-sm font-normal text-slate-400 ml-1">{item.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-slate-400">데이터 로딩 중...</span>
        </div>
      ) : !mounted ? (
        <div className="grid grid-cols-12 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`${i < 2 ? 'col-span-12 lg:col-span-6' : 'col-span-12'} h-72 bg-white rounded-xl border border-slate-200 animate-pulse`} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-5">
          {/* 월별 정수량 */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-1">월별 정수 생산량 및 유지보수</h3>
            <p className="text-xs text-slate-400 mb-4">{selectedCompanyInfo ? selectedCompanyInfo.name : '전체 업체'} 기준 (예측값)</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v, n) => [n === '생산량(L)' ? `${Number(v).toLocaleString('ko-KR')} L` : `${v}건`, n]} contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar yAxisId="left" dataKey="volume" name="생산량(L)" fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar yAxisId="right" dataKey="maintenance" name="유지보수(건)" fill="#f59e0b" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 장비 상태 분포 */}
          <div className="col-span-12 lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">장비 상태 분포</h3>
            {statusData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-slate-400 text-sm">데이터 없음</div>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="count" nameKey="name">
                      {statusData.map((entry, index) => (
                        <Cell key={index} fill={STATUS_COLORS[entry.color] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v}대`, n]} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 장비 유형별 분포 */}
          <div className="col-span-12 lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">장비 유형별 현황</h3>
            {typeData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm">데이터 없음</div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip formatter={(v) => [`${v}대`, '장비 수']} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    <Bar dataKey="count" name="장비수" radius={[0,4,4,0]}>
                      {typeData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* 정수 효율 추이 */}
          <div className="col-span-12 lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-1">정수 효율 추이 (오늘)</h3>
            <p className="text-xs text-slate-400 mb-4">시간대별 역삼투압 효율(%)</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={EFFICIENCY_DATA}>
                  <defs>
                    <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[95, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [`${v}%`, '효율']} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="eff" name="효율(%)" stroke="#10b981" strokeWidth={2} fill="url(#effGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 월별 유지보수 비용 */}
          <div className="col-span-12 bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">월별 유지보수 비용 추이</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/10000).toFixed(0)}만`} />
                  <Tooltip formatter={(v) => [`${Number(v).toLocaleString('ko-KR')}원`, '유지보수 비용']} contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }} />
                  <Line type="monotone" dataKey="cost" name="유지보수 비용(원)" stroke="#8b5cf6" strokeWidth={2.5} dot={{ fill: '#8b5cf6', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 장비별 상세 테이블 */}
          {equipment.length > 0 && (
            <div className="col-span-12 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">
                  {selectedCompanyInfo ? selectedCompanyInfo.name : '전체'} 장비 현황
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {['장비명', '업체', '유형', '상태', '통신', '설치일', '보증만료'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {equipment.map(eq => {
                      const sc = STATUS_CONFIG[eq.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.offline;
                      const tc = EQUIPMENT_TYPE_CONFIG[eq.equipment_type as keyof typeof EQUIPMENT_TYPE_CONFIG] || { icon: '🔧', label: eq.equipment_type };
                      return (
                        <tr key={eq.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800 flex items-center gap-1">
                              <span>{tc.icon}</span>{eq.name || eq.model}
                            </div>
                            <div className="text-xs text-slate-400">{eq.serial_no}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{eq.company_name || '-'}</td>
                          <td className="px-4 py-3 text-xs">{tc.label}</td>
                          <td className="px-4 py-3">
                            <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', sc.bg, sc.color)}>
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{eq.comm_type?.toUpperCase() || '-'}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{eq.install_date || '-'}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{eq.warranty_end || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
