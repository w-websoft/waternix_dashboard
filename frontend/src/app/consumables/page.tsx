'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { mockConsumables, mockFilters } from '@/lib/mock-data';
import { FILTER_STATUS_CONFIG, cn } from '@/lib/utils';
import { Search, Plus, Package, AlertTriangle, Filter as FilterIcon } from 'lucide-react';
import AddInventoryModal from '@/components/consumable/AddInventoryModal';

export default function ConsumablesPage() {
  const [activeTab, setActiveTab] = useState<'consumables' | 'filters'>('consumables');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredConsumables = mockConsumables.filter(c =>
    !search || [c.name, c.category, c.brand, c.partNo, c.supplier]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredFilters = mockFilters.filter(f =>
    !search || [f.filterName, f.filterType, f.equipmentName, f.companyName, f.partNo]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => (b.usedPercent || 0) - (a.usedPercent || 0));

  const lowStockCount = mockConsumables.filter(c => c.isLow).length;
  const replaceNeededCount = mockFilters.filter(f => f.status === 'replace').length;

  return (
    <DashboardLayout title="소모품 / 재고 관리" subtitle="필터, 소모품 재고 및 교체 현황">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {[
          { label: '전체 소모품 종류', value: mockConsumables.length, unit: '종', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '재고 부족 품목', value: lowStockCount, unit: '종', color: 'text-red-600', bg: 'bg-red-50', urgent: true },
          { label: '관리 중인 필터', value: mockFilters.length, unit: '개', color: 'text-slate-600', bg: 'bg-slate-50' },
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
      <div className="flex items-center gap-2 sm:gap-3 mb-4">
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
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> {activeTab === 'consumables' ? '품목 등록' : '필터 등록'}
        </button>
      </div>

      <AddInventoryModal open={showAddModal} onClose={() => setShowAddModal(false)} />

      {/* Consumables Tab */}
      {activeTab === 'consumables' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                {['품목명', '카테고리', '부품번호', '브랜드', '공급업체', '단위', '재고량', '최소재고', '단가', '상태'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredConsumables.map(item => (
                <tr key={item.id} className={cn('hover:bg-slate-50 transition-colors', item.isLow && 'bg-red-50/50')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Package className={cn('w-4 h-4 flex-shrink-0', item.isLow ? 'text-red-400' : 'text-slate-400')} />
                      <span className="font-medium text-slate-800">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{item.category}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono">{item.partNo || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{item.brand || '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{item.supplier}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{item.unit}</td>
                  <td className="px-4 py-3">
                    <span className={cn('font-bold text-lg', item.isLow ? 'text-red-600' : 'text-slate-800')}>
                      {item.stockQty}
                    </span>
                    {item.isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-500 inline ml-1" />}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{item.minQty}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-700">
                    {item.unitCost ? `${item.unitCost.toLocaleString('ko-KR')}원` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full',
                      item.isLow ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    )}>
                      {item.isLow ? '재고 부족' : '재고 충분'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Filters Tab */}
      {activeTab === 'filters' && (
        <div className="space-y-3">
          {filteredFilters.map(filter => {
            const statusConf = FILTER_STATUS_CONFIG[filter.status];
            const pct = filter.usedPercent || 0;
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
                          <span className="font-semibold text-slate-800">{filter.filterName}</span>
                          <span className="text-xs text-slate-400">{filter.stage}단계</span>
                          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', statusConf.bg, statusConf.color)}>
                            {statusConf.label}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {filter.equipmentName} · {filter.companyName}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          부품번호: {filter.partNo || '-'} · 공급사: {filter.supplier}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-bold text-slate-800">{pct.toFixed(1)}%</div>
                        <div className="text-xs text-slate-400">수명 사용</div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                        <span>{filter.usedHours?.toFixed(0) || 0}h / {filter.lifeHours}h 사용</span>
                        <span>{(filter.usedVolume || 0).toLocaleString('ko-KR')}L / {(filter.lifeVolume || 0).toLocaleString('ko-KR')}L</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className={cn('h-2 rounded-full transition-all', barColor)}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                      <span>설치: {filter.installDate}</span>
                      <span>교체 예정: <strong className={cn(pct >= 80 ? 'text-red-600' : 'text-slate-700')}>{filter.replaceDate}</strong></span>
                      {filter.cost && <span>비용: {filter.cost.toLocaleString('ko-KR')}원</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
