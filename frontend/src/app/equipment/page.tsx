'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { mockEquipment } from '@/lib/mock-data';
import { STATUS_CONFIG, EQUIPMENT_TYPE_CONFIG, formatRelativeTime, cn } from '@/lib/utils';
import { Equipment } from '@/types';
import { Search, MapPin, List, Plus, ChevronDown, Wifi, WifiOff, LayoutDashboard, ChevronRight, Download } from 'lucide-react';
import AddEquipmentModal from '@/components/equipment/AddEquipmentModal';

const EquipmentMap = dynamic(() => import('@/components/map/EquipmentMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-sm">지도 로딩 중...</div>,
});

const TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: '전체 유형' },
  { value: 'ro', label: '역삼투압' },
  { value: 'di', label: '초순수/DI' },
  { value: 'seawater', label: '해수담수화' },
  { value: 'prefilter', label: '전처리' },
  { value: 'uv', label: 'UV 살균' },
  { value: 'softener', label: '연수기' },
];

export default function EquipmentPage() {
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | undefined>();
  const [showAddModal, setShowAddModal] = useState(false);

  const handleExportCsv = () => {
    const headers = ['장비명', '모델', '시리얼번호', '업체', '지역', '유형', '통신', '상태', '용량(L/h)', '설치일', '보증만료'];
    const rows = filtered.map(eq => [
      eq.name || '', eq.model, eq.serialNo, eq.companyName || '',
      `${eq.city || ''} ${eq.district || ''}`, eq.equipmentType, eq.commType || '',
      eq.status, eq.capacityLph || '', eq.installDate || '', eq.warrantyEnd || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `waternix_equipment_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const filtered = mockEquipment.filter(eq => {
    const matchSearch = !search || [eq.name, eq.model, eq.serialNo, eq.companyName, eq.address, eq.city]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || eq.status === statusFilter;
    const matchType = typeFilter === 'all' || eq.equipmentType === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const statusCounts = mockEquipment.reduce((acc, eq) => {
    acc[eq.status] = (acc[eq.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <DashboardLayout title="장비 관리" subtitle={`총 ${mockEquipment.length}대 장비 | 필터 결과 ${filtered.length}대`}>
      {/* Status Quick Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <button
            key={status}
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all',
              statusFilter === status
                ? `${config.bg} ${config.color} border-current`
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', config.dot)} />
            {config.label}
            <span className={cn(
              'px-1.5 py-0.5 rounded-full text-xs font-bold',
              statusFilter === status ? 'bg-white/60' : 'bg-slate-100 text-slate-500'
            )}>
              {statusCounts[status] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="장비명, 모델, 시리얼번호, 업체명, 지역 검색..."
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
          <button
            onClick={() => setViewMode('list')}
            className={cn('flex items-center gap-2 px-3 py-2 text-sm', viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50')}
          >
            <List className="w-4 h-4" /> 목록
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={cn('flex items-center gap-2 px-3 py-2 text-sm', viewMode === 'map' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50')}
          >
            <MapPin className="w-4 h-4" /> 지도
          </button>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" /> CSV 내보내기
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> 장비 등록
        </button>
      </div>
      <AddEquipmentModal open={showAddModal} onClose={() => setShowAddModal(false)} />

      {/* Content */}
      {viewMode === 'map' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ height: '600px' }}>
          <EquipmentMap
            equipment={filtered}
            selectedId={selectedEquipment?.id}
            onSelect={setSelectedEquipment}
            height="100%"
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['장비명 / 모델', '업체', '지역', '유형', '통신', '상태', '유량', 'TDS', '오늘 생산량', '마지막 수신', '배치도'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((eq) => {
                  const statusConf = STATUS_CONFIG[eq.status];
                  const typeConf = EQUIPMENT_TYPE_CONFIG[eq.equipmentType];
                  const sensor = eq.sensorData;
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
                            <div className="text-xs text-slate-400">{eq.model} · {eq.serialNo}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-600 max-w-[130px] truncate">{eq.companyName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-600">{eq.city}</div>
                        <div className="text-xs text-slate-400">{eq.district}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-500">{typeConf.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {isOnline ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-slate-400" />}
                          <span className="text-xs text-slate-500">{eq.commType?.replace('_', ' ').toUpperCase() || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border', statusConf.bg, statusConf.color)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', statusConf.dot)} />
                          {statusConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium text-xs">
                        {sensor?.flowRate !== undefined && sensor.flowRate > 0 ? `${sensor.flowRate.toFixed(1)} L/m` : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {sensor?.outletTds !== undefined ? (
                          <span className={cn('font-medium', sensor.outletTds > 20 ? 'text-red-600' : 'text-slate-700')}>
                            {sensor.outletTds} ppm
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-xs font-medium">
                        {sensor?.dailyVolume ? `${sensor.dailyVolume.toLocaleString('ko-KR')} L` : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{formatRelativeTime(eq.lastSeen)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/equipment/${eq.id}/layout-editor`}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:border-teal-200 border border-transparent text-xs text-slate-500 hover:text-teal-600 transition-all font-medium whitespace-nowrap"
                          onClick={e => e.stopPropagation()}
                        >
                          <LayoutDashboard className="w-3.5 h-3.5" /> 배치도
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center text-slate-400">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <div>검색 결과가 없습니다</div>
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400 bg-slate-50">
            {filtered.length}개 장비 표시 중
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
