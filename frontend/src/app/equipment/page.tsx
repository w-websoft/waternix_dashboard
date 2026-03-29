'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { equipmentApi } from '@/lib/api';
import { STATUS_CONFIG, EQUIPMENT_TYPE_CONFIG, formatRelativeTime, cn } from '@/lib/utils';
import { Search, MapPin, List, Plus, ChevronDown, Wifi, WifiOff, LayoutDashboard, ChevronRight, Download, RefreshCw } from 'lucide-react';
import AddEquipmentModal from '@/components/equipment/AddEquipmentModal';

const EquipmentMap = dynamic(() => import('@/components/map/EquipmentMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-sm">지도 로딩 중...</div>,
});

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: '전체 유형' },
  { value: 'ro', label: '역삼투압' },
  { value: 'di', label: '초순수/DI' },
  { value: 'seawater', label: '해수담수화' },
  { value: 'prefilter', label: '전처리' },
  { value: 'uv', label: 'UV 살균' },
  { value: 'softener', label: '연수기' },
];

interface ApiEquipment {
  id: string;
  name?: string;
  model: string;
  serial_no: string;
  equipment_type: string;
  status: string;
  company_name?: string;
  company_id?: string;
  city?: string;
  district?: string;
  address?: string;
  comm_type?: string;
  install_date?: string;
  warranty_end?: string;
  last_seen?: string;
  capacity_lph?: number;
  lat?: number;
  lng?: number;
}

function normalizeEquipment(eq: ApiEquipment) {
  return {
    ...eq,
    serialNo: eq.serial_no,
    companyName: eq.company_name,
    equipmentType: eq.equipment_type,
    commType: eq.comm_type,
    lastSeen: eq.last_seen,
    capacityLph: eq.capacity_lph,
    installDate: eq.install_date,
    warrantyEnd: eq.warranty_end,
    sensorData: undefined,
  };
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<ApiEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<string | undefined>();
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.equipment_type = typeFilter;
      const data = await equipmentApi.list(params);
      setEquipment(data as ApiEquipment[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '장비 목록을 불러오지 못했습니다.');
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const filtered = equipment;

  const statusCounts = equipment.reduce((acc, eq) => {
    acc[eq.status] = (acc[eq.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleExportCsv = () => {
    const headers = ['장비명', '모델', '시리얼번호', '업체', '지역', '유형', '통신', '상태', '용량(L/h)', '설치일', '보증만료'];
    const rows = filtered.map(eq => [
      eq.name || '', eq.model, eq.serial_no, eq.company_name || '',
      `${eq.city || ''} ${eq.district || ''}`, eq.equipment_type, eq.comm_type || '',
      eq.status, eq.capacity_lph || '', eq.install_date || '', eq.warranty_end || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `waternix_equipment_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const mapEquipment = filtered
    .filter(eq => eq.lat && eq.lng)
    .map(normalizeEquipment);

  return (
    <DashboardLayout title="장비 관리" subtitle={`총 ${equipment.length}대 장비 | 필터 결과 ${filtered.length}대`}>
      {/* Status Quick Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all',
              statusFilter === status
                ? `${config.bg} ${config.color} border-current`
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', config.dot)} />
            {config.label}
            <span className={cn('px-1.5 py-0.5 rounded-full text-xs font-bold', statusFilter === status ? 'bg-white/60' : 'bg-slate-100 text-slate-500')}>
              {statusCounts[status] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-0 sm:min-w-48">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="장비명, 모델, 업체명 검색..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="relative">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {TYPE_FILTER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
          <button onClick={() => setViewMode('list')} className={cn('flex items-center gap-1.5 px-3 py-2 text-sm', viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50')}>
            <List className="w-4 h-4" /> <span className="hidden sm:inline">목록</span>
          </button>
          <button onClick={() => setViewMode('map')} className={cn('flex items-center gap-1.5 px-3 py-2 text-sm', viewMode === 'map' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50')}>
            <MapPin className="w-4 h-4" /> <span className="hidden sm:inline">지도</span>
          </button>
        </div>

        <button onClick={load} className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
        <button onClick={handleExportCsv} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50">
          <Download className="w-4 h-4" /> CSV
        </button>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">장비 등록</span><span className="sm:hidden">등록</span>
        </button>
      </div>

      <AddEquipmentModal open={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={load} />

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          <span className="shrink-0">⚠️</span> {error}
        </div>
      )}

      {/* Content */}
      {viewMode === 'map' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-[300px] sm:h-[500px] lg:h-[600px]">
          <EquipmentMap
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            equipment={mapEquipment as any}
            selectedId={selectedMapId}
            onSelect={(eq) => {
              if (eq?.id) {
                setSelectedMapId(eq.id);
                window.location.href = `/equipment/${eq.id}`;
              }
            }}
            height="100%"
          />
        </div>
      ) : loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* 모바일 카드 뷰 */}
          <div className="sm:hidden divide-y divide-slate-100">
            {filtered.map((eq) => {
              const statusConf = STATUS_CONFIG[eq.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.offline;
              const typeConf = EQUIPMENT_TYPE_CONFIG[eq.equipment_type as keyof typeof EQUIPMENT_TYPE_CONFIG] || { icon: '🔧', label: eq.equipment_type };
              return (
                <Link key={eq.id} href={`/equipment/${eq.id}`} className="flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
                  <span className="text-2xl flex-shrink-0 mt-0.5">{typeConf.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-slate-800 text-sm truncate">{eq.name || eq.model}</span>
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0', statusConf.bg, statusConf.color)}>{statusConf.label}</span>
                    </div>
                    <div className="text-xs text-slate-400 truncate">{eq.company_name} · {eq.city}</div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                      <span>{eq.comm_type?.toUpperCase() || '-'}</span>
                      {eq.capacity_lph && <span>{eq.capacity_lph.toLocaleString('ko-KR')} L/h</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
                </Link>
              );
            })}
          </div>

          {/* 데스크톱 테이블 뷰 */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['장비명 / 모델', '업체', '지역', '유형', '통신', '상태', '용량', '설치일', '마지막 수신', '배치도'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((eq) => {
                  const statusConf = STATUS_CONFIG[eq.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.offline;
                  const typeConf = EQUIPMENT_TYPE_CONFIG[eq.equipment_type as keyof typeof EQUIPMENT_TYPE_CONFIG] || { icon: '🔧', label: eq.equipment_type };
                  const isOnline = eq.status !== 'offline';
                  return (
                    <tr key={eq.id} className="hover:bg-blue-50/40 transition-colors group">
                      <td className="px-4 py-3">
                        <Link href={`/equipment/${eq.id}`} className="flex items-center gap-2.5 group/link">
                          <span className="text-xl">{typeConf.icon}</span>
                          <div>
                            <div className="font-semibold text-slate-800 group-hover/link:text-blue-700 transition-colors flex items-center gap-1">
                              {eq.name || eq.model}
                              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 text-blue-500 transition-opacity" />
                            </div>
                            <div className="text-xs text-slate-400">{eq.model} · {eq.serial_no}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3"><div className="text-xs text-slate-600 max-w-[130px] truncate">{eq.company_name || '-'}</div></td>
                      <td className="px-4 py-3"><div className="text-xs text-slate-600">{eq.city || '-'}</div><div className="text-xs text-slate-400">{eq.district || ''}</div></td>
                      <td className="px-4 py-3"><span className="text-xs text-slate-500">{typeConf.label}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {isOnline ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-slate-400" />}
                          <span className="text-xs text-slate-500">{eq.comm_type?.replace('_', ' ').toUpperCase() || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border', statusConf.bg, statusConf.color)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', statusConf.dot)} />
                          {statusConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium text-xs">
                        {eq.capacity_lph ? `${eq.capacity_lph.toLocaleString('ko-KR')} L/h` : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{eq.install_date || '-'}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{formatRelativeTime(eq.last_seen)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/equipment/${eq.id}/layout-editor`} onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 border border-transparent text-xs text-slate-500 hover:text-teal-600 transition-all font-medium whitespace-nowrap">
                          <LayoutDashboard className="w-3.5 h-3.5" /> 배치도
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && !loading && (
            <div className="py-16 text-center text-slate-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <div className="font-medium mb-1">등록된 장비가 없습니다</div>
              <div className="text-sm">장비 등록 버튼을 눌러 첫 번째 장비를 추가하세요</div>
            </div>
          )}
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400 bg-slate-50">
            {filtered.length}개 장비 표시 중
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
