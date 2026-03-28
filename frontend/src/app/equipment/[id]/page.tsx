'use client';

import { use, useState, useEffect, useRef } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { mockEquipment, mockFilters, mockMaintenanceRecords, mockAlerts } from '@/lib/mock-data';
import { STATUS_CONFIG, EQUIPMENT_TYPE_CONFIG, FILTER_STATUS_CONFIG, formatRelativeTime, formatDate, cn } from '@/lib/utils';
import {
  ArrowLeft, MapPin, Wifi, Activity, Droplets, Thermometer,
  Gauge, Zap, Clock, Filter, Wrench, AlertTriangle, LayoutDashboard,
  ExternalLink, Calendar, ChevronRight, Bell, QrCode, Printer,
  Package, Plus, RefreshCw, Info, Shield, Radio,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import AddConsumableModal from '@/components/equipment/AddConsumableModal';
import { SensorData } from '@/types';

const HISTORY_BASE = [
  [6.1,10.2,3.8,0.52], [5.8,9.5,3.6,0.49], [6.3,11.0,4.0,0.55],
  [5.5,8.8,3.5,0.47], [6.8,12.1,4.2,0.58], [6.0,9.9,3.7,0.51],
  [7.1,13.0,4.4,0.61], [5.7,9.1,3.6,0.48], [6.4,10.5,3.9,0.53],
  [6.2,10.8,3.8,0.52], [5.9,9.3,3.7,0.50], [6.6,11.5,4.1,0.57],
  [6.0,10.0,3.8,0.51], [6.9,12.5,4.3,0.60], [5.6,8.9,3.5,0.48],
  [6.7,11.8,4.2,0.58], [6.1,10.3,3.8,0.52], [6.5,11.2,4.0,0.56],
  [5.8,9.6,3.6,0.49], [7.0,12.8,4.4,0.61], [6.3,10.7,3.9,0.54],
  [6.2,10.4,3.8,0.53], [5.9,9.8,3.7,0.50], [6.4,10.9,4.0,0.54],
];

function buildHistoryData() {
  return HISTORY_BASE.map(([f, t, p, pw], i) => ({
    time: `${String(i).padStart(2, '0')}:00`,
    flowRate: f,
    outletTds: t,
    pressure: p,
    power: pw,
  }));
}

type Tab = 'overview' | 'consumables' | 'maintenance' | 'alerts' | 'spec';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: '실시간 현황', icon: <Activity className="w-4 h-4" /> },
  { id: 'consumables', label: '소모품·필터', icon: <Filter className="w-4 h-4" /> },
  { id: 'maintenance', label: '유지보수', icon: <Wrench className="w-4 h-4" /> },
  { id: 'alerts', label: '알림', icon: <Bell className="w-4 h-4" /> },
  { id: 'spec', label: '장비 사양', icon: <Info className="w-4 h-4" /> },
];

export default function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const equipment = mockEquipment.find(e => e.id === id);
  if (!equipment) notFound();

  const statusConf = STATUS_CONFIG[equipment.status];
  const typeConf = EQUIPMENT_TYPE_CONFIG[equipment.equipmentType];
  const initialSensor = equipment.sensorData;
  const filters = mockFilters.filter(f => f.equipmentId === id);
  const maintenances = mockMaintenanceRecords.filter(m => m.equipmentId === id);
  const equipmentAlerts = mockAlerts.filter(a => a.equipmentId === id && !a.acknowledged);

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showQr, setShowQr] = useState(false);
  const [showConsumableModal, setShowConsumableModal] = useState(false);
  const [liveData, setLiveData] = useState<SensorData | undefined>(initialSensor);
  const [historyData] = useState(buildHistoryData);
  const [isLive, setIsLive] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isLive || !initialSensor) return;
    intervalRef.current = setInterval(() => {
      setLiveData(prev => {
        if (!prev) return prev;
        const jitter = (v: number, spread: number) => parseFloat((v + (Math.random() - 0.5) * spread).toFixed(2));
        return {
          ...prev,
          flowRate: jitter(prev.flowRate || 6, 0.4),
          outletTds: jitter(prev.outletTds || 10, 1),
          inletPressure: jitter(prev.inletPressure || 4, 0.2),
          temperature: jitter(prev.temperature || 20, 0.3),
          powerKw: jitter(prev.powerKw || 0.5, 0.05),
          timestamp: new Date().toISOString(),
        };
      });
    }, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isLive, initialSensor]);

  const equipmentUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/equipment/${id}`
    : `https://waternix.dashboard/equipment/${id}`;

  const handlePrintQr = () => {
    window.print();
  };

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
                  <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', statusConf.dot)} />
                  {statusConf.label}
                </span>
              </div>
              <div className="text-slate-400 text-sm mt-1">{equipment.model} · {typeConf.label}</div>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1"><Wifi className="w-3.5 h-3.5 text-emerald-400" />{equipment.commType?.toUpperCase()}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-blue-400" />{equipment.city} {equipment.district}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" />최근 수신: {formatRelativeTime(liveData?.timestamp)}</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" />설치: {formatDate(equipment.installDate)}</span>
                <span className="flex items-center gap-1">
                  <Radio className={cn('w-3.5 h-3.5', isLive ? 'text-teal-400 animate-pulse' : 'text-slate-500')} />
                  {isLive ? '실시간 연결' : '일시 정지'}
                </span>
              </div>
            </div>
          </div>
          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {equipmentAlerts.length > 0 && (
              <Link href="/alerts" className="relative flex items-center gap-2 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-semibold rounded-xl transition-all border border-red-500/30">
                <Bell className="w-4 h-4" />
                미처리 알림
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {equipmentAlerts.length}
                </span>
              </Link>
            )}
            <button
              onClick={() => setIsLive(v => !v)}
              className={cn('flex items-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all border',
                isLive ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30' : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'
              )}
            >
              <RefreshCw className={cn('w-4 h-4', isLive && 'animate-spin')} style={{ animationDuration: '3s' }} />
              {isLive ? '실시간' : '일시정지'}
            </button>
            <button
              onClick={() => setShowQr(v => !v)}
              className="flex items-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl transition-all border border-white/10"
            >
              <QrCode className="w-4 h-4" /> QR
            </button>
            <Link
              href={`/equipment/${id}/layout-editor`}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-teal-500/30"
            >
              <LayoutDashboard className="w-4 h-4" />
              시설 배치도
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </Link>
          </div>
        </div>

        {/* QR Code Panel */}
        {showQr && (
          <div className="relative mt-4 flex items-center gap-6 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="bg-white p-3 rounded-xl flex-shrink-0">
              <QRCodeSVG value={equipmentUrl} size={100} />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm text-white">장비 QR 코드</div>
              <div className="text-xs text-slate-400 mt-1">스캔 시 장비 상세 페이지로 이동합니다</div>
              <div className="text-xs text-slate-500 mt-1 font-mono break-all">{equipmentUrl}</div>
              <div className="text-xs text-teal-300 mt-2 font-mono">S/N: {equipment.serialNo}</div>
            </div>
            <button onClick={handlePrintQr} className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-all flex-shrink-0">
              <Printer className="w-3.5 h-3.5" /> 인쇄
            </button>
          </div>
        )}

        {/* Live Sensor Row */}
        {liveData && (
          <div className="relative grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mt-5">
            {[
              { label: '유량', value: liveData.flowRate?.toFixed(1), unit: 'L/min', icon: Droplets, color: 'text-cyan-400', warn: false },
              { label: '일일 생산량', value: liveData.dailyVolume?.toLocaleString('ko-KR'), unit: 'L', icon: Activity, color: 'text-blue-400', warn: false },
              { label: '정수 TDS', value: liveData.outletTds, unit: 'ppm', icon: Gauge, color: (liveData.outletTds || 0) > 20 ? 'text-red-400' : 'text-emerald-400', warn: (liveData.outletTds || 0) > 20 },
              { label: '입구 압력', value: liveData.inletPressure?.toFixed(1), unit: 'bar', icon: Gauge, color: 'text-purple-400', warn: false },
              { label: '수온', value: liveData.temperature?.toFixed(1), unit: '°C', icon: Thermometer, color: 'text-orange-400', warn: false },
              { label: '소비 전력', value: liveData.powerKw?.toFixed(2), unit: 'kW', icon: Zap, color: 'text-yellow-400', warn: false },
            ].map(item => (
              <div key={item.label} className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10 transition-all">
                <div className="flex items-center gap-1.5 mb-1">
                  <item.icon className={cn('w-3.5 h-3.5', item.color)} />
                  <span className="text-xs text-slate-400">{item.label}</span>
                  {item.warn && <AlertTriangle className="w-3 h-3 text-red-400 ml-auto" />}
                </div>
                <div className={cn('text-xl font-bold tabular-nums', item.color)}>{item.value ?? '-'}</div>
                <div className="text-xs text-slate-500">{item.unit}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
              activeTab === tab.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'alerts' && equipmentAlerts.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{equipmentAlerts.length}</span>
            )}
            {tab.id === 'consumables' && filters.filter(f => f.status === 'replace').length > 0 && (
              <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">!</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-12 gap-4">
          {!mounted && (
            <>
              <div className="col-span-12 lg:col-span-8 h-72 bg-white rounded-xl border border-slate-200 animate-pulse" />
              <div className="col-span-12 lg:col-span-4 h-72 bg-white rounded-xl border border-slate-200 animate-pulse" />
            </>
          )}
          {mounted && <div className="col-span-12 lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-1">24시간 유량 추이</h3>
            <p className="text-xs text-slate-400 mb-4">오늘 시간대별 유량 (L/min)</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData}>
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
          </div>}

          {mounted && <div className="col-span-12 lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-1">TDS 추이</h3>
            <p className="text-xs text-slate-400 mb-4">정수 TDS (ppm) - 기준 20ppm</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={5} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="outletTds" name="TDS(ppm)" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>}

          {mounted && <div className="col-span-12 lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-1">압력 추이</h3>
            <p className="text-xs text-slate-400 mb-4">입구 압력 (bar)</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={5} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[3, 6]} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="pressure" name="압력(bar)" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>}

          {mounted && <div className="col-span-12 lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-1">전력 소비</h3>
            <p className="text-xs text-slate-400 mb-4">소비 전력 (kW)</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData}>
                  <defs>
                    <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={5} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="power" name="전력(kW)" stroke="#f59e0b" strokeWidth={2} fill="url(#powerGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>}
        </div>
      )}

      {activeTab === 'consumables' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">필터 및 소모품 현황</h3>
              <p className="text-xs text-slate-400 mt-0.5">{filters.length}개 소모품 등록됨</p>
            </div>
            <button
              onClick={() => setShowConsumableModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> 소모품 등록
            </button>
          </div>

          {filters.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">등록된 소모품이 없습니다</p>
              <p className="text-xs text-slate-400 mt-1">소모품 등록 버튼을 눌러 필터를 추가하세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filters.map(f => {
                const pct = f.usedPercent || 0;
                const barColor = pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-500';
                const fc = FILTER_STATUS_CONFIG[f.status];
                return (
                  <div key={f.id} className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                            {f.stage}단계
                          </span>
                          <span className={cn('text-xs px-2 py-0.5 rounded font-semibold', fc.bg, fc.color)}>
                            {fc.label}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-800 mt-1.5">{f.filterName}</div>
                        <div className="text-xs text-slate-400 mt-0.5">파트번호: {f.partNo || '-'} · {f.supplier}</div>
                      </div>
                      <span className={cn('text-2xl font-bold tabular-nums', pct >= 95 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-emerald-600')}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3">
                      <div className={cn('h-2.5 rounded-full transition-all', barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                      <div><span className="text-slate-400">설치일</span> · {formatDate(f.installDate)}</div>
                      <div><span className="text-slate-400">교체예정</span> · {formatDate(f.replaceDate)}</div>
                      {f.usedHours && <div><span className="text-slate-400">사용</span> · {f.usedHours.toLocaleString()}h / {f.lifeHours?.toLocaleString()}h</div>}
                      {f.cost && <div><span className="text-slate-400">단가</span> · {f.cost.toLocaleString('ko-KR')}원</div>}
                    </div>
                    {pct >= 80 && (
                      <div className={cn('mt-3 flex items-center gap-2 p-2 rounded-lg text-xs font-medium',
                        pct >= 95 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
                      )}>
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        {pct >= 95 ? '즉시 교체 필요' : '교체 시기가 다가오고 있습니다'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">유지보수 이력</h3>
              <p className="text-xs text-slate-400 mt-0.5">{maintenances.length}건 이력</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" /> 작업 등록
            </button>
          </div>
          {maintenances.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">유지보수 이력이 없습니다</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {maintenances.map((m, i) => (
                <div key={m.id} className={cn('flex items-start gap-4 p-4', i > 0 && 'border-t border-slate-100')}>
                  <div className={cn('w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0',
                    m.status === 'completed' ? 'bg-emerald-500' :
                    m.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : 'bg-amber-500'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm">{m.title}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded font-medium',
                        m.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        m.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      )}>
                        {m.status === 'completed' ? '완료' : m.status === 'in_progress' ? '진행중' : '예정'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      담당: {m.technician} · {m.completedDate || m.scheduledDate}
                      {m.cost && <span> · <strong>{m.cost.toLocaleString('ko-KR')}원</strong></span>}
                    </div>
                    {m.description && <p className="text-xs text-slate-500 mt-1">{m.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-3">
          {equipmentAlerts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Shield className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">정상 운영 중</p>
              <p className="text-xs text-slate-400 mt-1">현재 미처리 알림이 없습니다</p>
            </div>
          ) : (
            equipmentAlerts.map(a => (
              <div key={a.id} className={cn('bg-white rounded-xl border p-4',
                a.severity === 'critical' ? 'border-red-200' : a.severity === 'warning' ? 'border-amber-200' : 'border-blue-200'
              )}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={cn('w-4 h-4 mt-0.5 flex-shrink-0',
                    a.severity === 'critical' ? 'text-red-500' : a.severity === 'warning' ? 'text-amber-500' : 'text-blue-500'
                  )} />
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800 text-sm">{a.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{a.message}</div>
                    <div className="text-xs text-slate-400 mt-1">{formatRelativeTime(a.createdAt)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'spec' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" /> 기본 정보
            </h3>
            <dl className="space-y-2.5">
              {[
                { dt: '모델명', dd: equipment.model },
                { dt: '시리얼번호', dd: equipment.serialNo },
                { dt: '장비 별칭', dd: equipment.name || '-' },
                { dt: '장비 유형', dd: typeConf.label },
                { dt: '처리 용량', dd: equipment.capacityLph ? `${equipment.capacityLph.toLocaleString()} L/h` : '-' },
                { dt: '현재 상태', dd: statusConf.label },
              ].map(({ dt, dd }) => (
                <div key={dt} className="flex items-center gap-4 py-1.5 border-b border-slate-50 last:border-0">
                  <dt className="text-xs text-slate-400 w-28 flex-shrink-0">{dt}</dt>
                  <dd className="text-sm font-medium text-slate-800">{dd}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-500" /> 설치 위치
            </h3>
            <dl className="space-y-2.5">
              {[
                { dt: '업체명', dd: equipment.companyName || '-' },
                { dt: '주소', dd: equipment.address || '-' },
                { dt: '시/도', dd: equipment.city || '-' },
                { dt: '구/군', dd: equipment.district || '-' },
                { dt: '위도', dd: equipment.lat?.toString() || '-' },
                { dt: '경도', dd: equipment.lng?.toString() || '-' },
              ].map(({ dt, dd }) => (
                <div key={dt} className="flex items-center gap-4 py-1.5 border-b border-slate-50 last:border-0">
                  <dt className="text-xs text-slate-400 w-28 flex-shrink-0">{dt}</dt>
                  <dd className="text-sm font-medium text-slate-800">{dd}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-purple-500" /> 통신 설정
            </h3>
            <dl className="space-y-2.5">
              {[
                { dt: '통신 방식', dd: equipment.commType?.replace('_', ' ').toUpperCase() || '-' },
                { dt: '최근 수신', dd: formatDate(liveData?.timestamp) },
                { dt: '누적 가동', dd: liveData?.runningHours ? `${liveData.runningHours.toLocaleString()}시간` : '-' },
                ...Object.entries(equipment.commConfig || {}).map(([k, v]) => ({ dt: k, dd: String(v) })),
              ].map(({ dt, dd }) => (
                <div key={dt} className="flex items-center gap-4 py-1.5 border-b border-slate-50 last:border-0">
                  <dt className="text-xs text-slate-400 w-28 flex-shrink-0">{dt}</dt>
                  <dd className="text-sm font-medium text-slate-800 font-mono">{dd}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" /> 계약 및 보증
            </h3>
            <dl className="space-y-2.5">
              {[
                { dt: '설치일', dd: formatDate(equipment.installDate) },
                { dt: '보증 만료', dd: formatDate(equipment.warrantyEnd) },
                { dt: '보증 상태', dd: (() => {
                  if (!equipment.warrantyEnd) return '-';
                  const d = new Date(equipment.warrantyEnd);
                  const now = new Date();
                  const diff = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  if (diff < 0) return '만료됨';
                  if (diff < 90) return `D-${diff} (곧 만료)`;
                  return `유효 (D-${diff})`;
                })() },
              ].map(({ dt, dd }) => (
                <div key={dt} className="flex items-center gap-4 py-1.5 border-b border-slate-50 last:border-0">
                  <dt className="text-xs text-slate-400 w-28 flex-shrink-0">{dt}</dt>
                  <dd className="text-sm font-medium text-slate-800">{dd}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      <AddConsumableModal
        open={showConsumableModal}
        equipmentId={id}
        equipmentName={equipment.name || equipment.model}
        onClose={() => setShowConsumableModal(false)}
      />
    </DashboardLayout>
  );
}
