'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { mockEquipment, mockFilters, mockMaintenanceRecords, mockAlerts } from '@/lib/mock-data';
import { STATUS_CONFIG, EQUIPMENT_TYPE_CONFIG, FILTER_STATUS_CONFIG, formatRelativeTime, formatDate, cn } from '@/lib/utils';
import {
  ArrowLeft, MapPin, Wifi, WifiOff, Activity, Droplets, Thermometer,
  Gauge, Zap, Clock, Filter, Wrench, AlertTriangle, LayoutDashboard,
  ExternalLink, Calendar, ChevronRight
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';

const HISTORY_DATA = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, '0')}:00`,
  flowRate: 5.5 + Math.random() * 2.5,
  outletTds: 8 + Math.random() * 8,
  pressure: 3.5 + Math.random() * 1.2,
  power: 0.45 + Math.random() * 0.2,
}));

export default function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const equipment = mockEquipment.find(e => e.id === id);
  if (!equipment) notFound();

  const statusConf = STATUS_CONFIG[equipment.status];
  const typeConf = EQUIPMENT_TYPE_CONFIG[equipment.equipmentType];
  const sensor = equipment.sensorData;
  const filters = mockFilters.filter(f => f.equipmentId === id);
  const maintenances = mockMaintenanceRecords.filter(m => m.equipmentId === id);
  const alerts = mockAlerts.filter(a => a.equipmentId === id && !a.acknowledged);

  return (
    <DashboardLayout
      title={equipment.name || equipment.model}
      subtitle={`${equipment.companyName} · ${equipment.serialNo}`}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-5">
        <Link href="/equipment" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 장비 목록
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-700 font-medium">{equipment.name || equipment.model}</span>
      </div>

      {/* Header Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 mb-5 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #00d4aa 0%, transparent 60%), radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 50%)' }}
        />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-4xl flex-shrink-0">
              {typeConf.icon}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold">{equipment.name || equipment.model}</h2>
                <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full', statusConf.bg, statusConf.color)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', statusConf.dot)} />
                  {statusConf.label}
                </span>
              </div>
              <div className="text-slate-400 text-sm mt-1">{equipment.model} · {typeConf.label}</div>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1"><Wifi className="w-3.5 h-3.5 text-emerald-400" />{equipment.commType?.toUpperCase()}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-blue-400" />{equipment.city} {equipment.district}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" />최근 수신: {formatRelativeTime(equipment.lastSeen)}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" />설치: {formatDate(equipment.installDate)}</span>
              </div>
            </div>
          </div>
          {/* Layout Button */}
          <Link
            href={`/equipment/${id}/layout-editor`}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-teal-500/30 hover:shadow-teal-400/40"
          >
            <LayoutDashboard className="w-4 h-4" />
            시설 배치도 편집
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </Link>
        </div>

        {/* Live Sensor Row */}
        {sensor && (
          <div className="relative grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-3 mt-5">
            {[
              { label: '유량', value: sensor.flowRate?.toFixed(1), unit: 'L/min', icon: Droplets, color: 'text-cyan-400', warn: false },
              { label: '일일 생산량', value: sensor.dailyVolume?.toLocaleString('ko-KR'), unit: 'L', icon: Activity, color: 'text-blue-400', warn: false },
              { label: '정수 TDS', value: sensor.outletTds, unit: 'ppm', icon: Gauge, color: (sensor.outletTds || 0) > 20 ? 'text-red-400' : 'text-emerald-400', warn: (sensor.outletTds || 0) > 20 },
              { label: '입구 압력', value: sensor.inletPressure?.toFixed(1), unit: 'bar', icon: Gauge, color: 'text-purple-400', warn: false },
              { label: '수온', value: sensor.temperature?.toFixed(1), unit: '°C', icon: Thermometer, color: 'text-orange-400', warn: false },
              { label: '소비 전력', value: sensor.powerKw?.toFixed(2), unit: 'kW', icon: Zap, color: 'text-yellow-400', warn: false },
            ].map(item => (
              <div key={item.label} className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <item.icon className={cn('w-3.5 h-3.5', item.color)} />
                  <span className="text-xs text-slate-400">{item.label}</span>
                  {item.warn && <AlertTriangle className="w-3 h-3 text-red-400 ml-auto" />}
                </div>
                <div className={cn('text-xl font-bold', item.color)}>{item.value ?? '-'}</div>
                <div className="text-xs text-slate-500">{item.unit}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Flow Rate Chart */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-1">24시간 유량 추이</h3>
          <p className="text-xs text-slate-400 mb-4">오늘 시간대별 유량 (L/min)</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HISTORY_DATA}>
                <defs>
                  <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="flowRate" name="유량(L/min)" stroke="#06b6d4" strokeWidth={2} fill="url(#flowGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TDS + Pressure */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-1">TDS 추이</h3>
          <p className="text-xs text-slate-400 mb-4">정수 TDS (ppm) - 기준 20ppm</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={HISTORY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={5} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="outletTds" name="TDS(ppm)" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filters */}
        <div className="col-span-12 lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">필터 현황</h3>
            <Filter className="w-4 h-4 text-slate-400" />
          </div>
          {filters.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">등록된 필터 없음</div>
          ) : (
            <div className="space-y-3">
              {filters.map(f => {
                const pct = f.usedPercent || 0;
                const barColor = pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-500';
                const fc = FILTER_STATUS_CONFIG[f.status];
                return (
                  <div key={f.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-700">{f.stage}단계 · {f.filterName}</span>
                        <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', fc.bg, fc.color)}>{fc.label}</span>
                      </div>
                      <span className={cn('text-sm font-bold', pct >= 95 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-emerald-600')}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className={cn('h-2 rounded-full transition-all', barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">교체예정: {f.replaceDate} · {f.supplier}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Maintenance */}
        <div className="col-span-12 lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">유지보수 이력</h3>
            <Wrench className="w-4 h-4 text-slate-400" />
          </div>
          {maintenances.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">유지보수 이력 없음</div>
          ) : (
            <div className="space-y-2">
              {maintenances.map(m => (
                <div key={m.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                    m.status === 'completed' ? 'bg-emerald-500' :
                    m.status === 'in_progress' ? 'bg-blue-500' : 'bg-amber-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{m.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {m.technician} · {m.completedDate || m.scheduledDate}
                      {m.cost && ` · ${m.cost.toLocaleString('ko-KR')}원`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device Info */}
        <div className="col-span-12 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">장비 정보</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
            {[
              { label: '모델', value: equipment.model },
              { label: '시리얼번호', value: equipment.serialNo },
              { label: '장비유형', value: typeConf.label },
              { label: '처리용량', value: equipment.capacityLph ? `${equipment.capacityLph} L/h` : '-' },
              { label: '통신방식', value: equipment.commType?.replace('_', ' ').toUpperCase() || '-' },
              { label: '설치일', value: formatDate(equipment.installDate) },
              { label: '보증만료', value: formatDate(equipment.warrantyEnd) },
              { label: '업체명', value: equipment.companyName || '-' },
              { label: '설치주소', value: equipment.address || '-' },
              { label: '시/도', value: equipment.city || '-' },
              { label: '구/군', value: equipment.district || '-' },
              { label: '누적가동', value: sensor?.runningHours ? `${sensor.runningHours.toFixed(0)}h` : '-' },
            ].map(item => (
              <div key={item.label}>
                <div className="text-xs text-slate-400">{item.label}</div>
                <div className="font-medium text-slate-800 mt-0.5 truncate" title={item.value || '-'}>{item.value || '-'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
