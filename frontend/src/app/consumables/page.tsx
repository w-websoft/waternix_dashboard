'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { consumablesApi, filtersApi } from '@/lib/api';
import type { ConsumablePayload, FilterPayload } from '@/lib/api';
import { FILTER_STATUS_CONFIG, cn } from '@/lib/utils';
import { Search, Plus, Package, AlertTriangle, Filter as FilterIcon, RefreshCw } from 'lucide-react';
import AddInventoryModal from '@/components/consumable/AddInventoryModal';
import AddConsumableModal from '@/components/equipment/AddConsumableModal';

export default function ConsumablesPage() {
  const [activeTab, setActiveTab] = useState<'consumables' | 'filters'>('consumables');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [consumables, setConsumables] = useState<ConsumablePayload[]>([]);
  const [filters, setFilters] = useState<FilterPayload[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cData, fData] = await Promise.all([
        consumablesApi.list(search ? { search } : undefined),
        filtersApi.list(search ? { search } : undefined),
      ]);
      setConsumables(cData as ConsumablePayload[]);
      setFilters(fData as FilterPayload[]);
    } catch {
      setConsumables([]);
      setFilters([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const lowStockCount = consumables.filter(c => c.is_low).length;
  const replaceNeededCount = filters.filter(f => f.status === 'replace').length;

  return (
    <DashboardLayout title="소모품 / 재고 관리" subtitle="필터, 소모품 재고 및 교체 현황">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {[
          { label: '전체 소모품 종류', value: consumables.length, unit: '종', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '재고 부족 품목', value: lowStockCount, unit: '종', color: 'text-red-600', bg: 'bg-red-50', urgent: true },
          { label: '관리 중인 필터', value: filters.length, unit: '개', color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: '교체 필요 필터', value: replaceNeededCount, unit: '개', color: 'text-orange-600', bg: 'bg-orange-50', urgent: true },
        ].map(item => (
          <div key={item.label} className={cn('bg-white rounded-xl border p-4', item.urgent ? 'border-red-200' : 'border-slate-200')}>
            <div className="text-sm text-slate-500">{item.label}</div>
            <div className={cn('text-3xl font-bold mt-1', item.color)}>{item.value}</div>
            <div className="text-xs text-slate-400">{item.unit}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1 mb-5 w-fit">
        {([
          { key: 'consumables', label: '소모품 재고' },
          { key: 'filters', label: '필터 현황' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 flex-wrap">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="품목명, 카테고리, 브랜드 검색..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button onClick={load} className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
        <button
          onClick={() => activeTab === 'consumables' ? setShowAddModal(true) : setShowFilterModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> {activeTab === 'consumables' ? '품목 등록' : '필터 등록'}
        </button>
      </div>

      <AddInventoryModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={load}
      />

      <AddConsumableModal
        open={showFilterModal}
        equipmentId=""
        equipmentName="(직접 등록)"
        onClose={() => setShowFilterModal(false)}
        onSuccess={load}
      />

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Consumables Tab */}
          {activeTab === 'consumables' && (
            <>
              {consumables.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <div className="font-medium mb-1">등록된 소모품이 없습니다</div>
                  <div className="text-sm">품목 등록 버튼을 눌러 소모품을 추가하세요</div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                  <table className="w-full text-sm min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                        {['품목명', '카테고리', '부품번호', '브랜드', '공급업체', '단위', '재고량', '최소재고', '단가', '상태'].map(h => (
                          <th key={h} className="px-4 py-3 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {consumables.map(item => (
                        <tr key={item.id} className={cn('hover:bg-slate-50 transition-colors', item.is_low && 'bg-red-50/50')}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Package className={cn('w-4 h-4 flex-shrink-0', item.is_low ? 'text-red-400' : 'text-slate-400')} />
                              <span className="font-medium text-slate-800">{item.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{item.category}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 font-mono">{item.part_no || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{item.brand || '-'}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{item.supplier || '-'}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{item.unit}</td>
                          <td className="px-4 py-3">
                            <span className={cn('font-bold text-lg', item.is_low ? 'text-red-600' : 'text-slate-800')}>
                              {item.stock_qty}
                            </span>
                            {item.is_low && <AlertTriangle className="w-3.5 h-3.5 text-red-500 inline ml-1" />}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">{item.min_qty}</td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-700">
                            {item.unit_cost ? `${Number(item.unit_cost).toLocaleString('ko-KR')}원` : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full',
                              item.is_low ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            )}>
                              {item.is_low ? '재고 부족' : '재고 충분'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Filters Tab */}
          {activeTab === 'filters' && (
            <>
              {filters.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <FilterIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <div className="font-medium mb-1">등록된 필터가 없습니다</div>
                  <div className="text-sm">필터 등록 버튼을 눌러 필터를 추가하세요</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filters.map(filter => {
                    const statusConf = FILTER_STATUS_CONFIG[filter.status as keyof typeof FILTER_STATUS_CONFIG] || FILTER_STATUS_CONFIG.normal;
                    const pct = filter.used_percent || 0;
                    const barColor = pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-500';
                    return (
                      <div
                        key={filter.id}
                        className={cn(
                          'bg-white rounded-xl border p-5 transition-all hover:shadow-sm',
                          filter.status === 'replace' ? 'border-red-200' : filter.status === 'warning' ? 'border-amber-200' : 'border-slate-200'
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0', statusConf.bg)}>
                            <FilterIcon className={cn('w-5 h-5', statusConf.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-slate-800">{filter.filter_name}</span>
                                  {filter.stage && <span className="text-xs text-slate-400">{filter.stage}단계</span>}
                                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', statusConf.bg, statusConf.color)}>
                                    {statusConf.label}
                                  </span>
                                </div>
                                {(filter.equipment_name || filter.company_name) && (
                                  <div className="text-xs text-slate-500 mt-1">
                                    {[filter.equipment_name, filter.company_name].filter(Boolean).join(' · ')}
                                  </div>
                                )}
                                <div className="text-xs text-slate-400 mt-0.5">
                                  {filter.part_no && `부품번호: ${filter.part_no}`}
                                  {filter.part_no && filter.supplier && ' · '}
                                  {filter.supplier && `공급사: ${filter.supplier}`}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-2xl font-bold text-slate-800">{pct.toFixed(1)}%</div>
                                <div className="text-xs text-slate-400">수명 사용</div>
                              </div>
                            </div>
                            <div className="mt-3">
                              <div className="w-full bg-slate-100 rounded-full h-2">
                                <div
                                  className={cn('h-2 rounded-full transition-all', barColor)}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                            </div>
                            {(filter.install_date || filter.replace_date) && (
                              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                                {filter.install_date && <span>설치: {filter.install_date}</span>}
                                {filter.replace_date && (
                                  <span>교체 예정: <strong className={cn(pct >= 80 ? 'text-red-600' : 'text-slate-700')}>{filter.replace_date}</strong></span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
