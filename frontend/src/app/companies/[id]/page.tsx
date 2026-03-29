'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { companiesApi, maintenanceApi, filtersApi } from '@/lib/api';
import type { CompanyDetailPayload, EquipmentPayload, MaintenancePayload, FilterPayload } from '@/lib/api';
import { STATUS_CONFIG, EQUIPMENT_TYPE_CONFIG, formatDate, formatRelativeTime, cn } from '@/lib/utils';
import {
  ArrowLeft, ChevronRight, Building2, Phone, Mail, MapPin,
  Users, Calendar, Shield, Cpu, Filter, Wrench,
  AlertTriangle, CheckCircle2, Clock, ExternalLink, Loader2,
} from 'lucide-react';
import AddEquipmentModal from '@/components/equipment/AddEquipmentModal';
import AddMaintenanceModal from '@/components/maintenance/AddMaintenanceModal';

type Tab = 'overview' | 'equipment' | 'filters' | 'maintenance';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',    label: '업체 정보',  icon: <Building2 className="w-4 h-4" /> },
  { id: 'equipment',   label: '설치 장비',  icon: <Cpu className="w-4 h-4" /> },
  { id: 'filters',     label: '필터 현황',  icon: <Filter className="w-4 h-4" /> },
  { id: 'maintenance', label: '유지보수',    icon: <Wrench className="w-4 h-4" /> },
];

const FILTER_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  normal:   { label: '정상',     color: 'text-emerald-700', bg: 'bg-emerald-50' },
  warning:  { label: '교체임박', color: 'text-amber-700',   bg: 'bg-amber-50' },
  replace:  { label: '교체필요', color: 'text-red-700',     bg: 'bg-red-50' },
  replaced: { label: '교체완료', color: 'text-slate-600',   bg: 'bg-slate-100' },
};

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [company, setCompany] = useState<CompanyDetailPayload | null>(null);
  const [equipment, setEquipment] = useState<EquipmentPayload[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenancePayload[]>([]);
  const [filters, setFilters] = useState<FilterPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [co, eq, mt, fl] = await Promise.all([
        companiesApi.get(id),
        companiesApi.getEquipment(id),
        maintenanceApi.list({ company_id: id }),
        filtersApi.list({ company_id: id }),
      ]);
      setCompany(co);
      setEquipment(eq as EquipmentPayload[]);
      setMaintenances(mt as MaintenancePayload[]);
      setFilters(fl as FilterPayload[]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <DashboardLayout title="업체 상세" subtitle="데이터 로딩 중...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-slate-500">업체 정보를 불러오는 중...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !company) {
    return (
      <DashboardLayout title="업체 없음" subtitle="해당 업체를 찾을 수 없습니다">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
          <p className="text-lg font-semibold text-slate-700">업체를 찾을 수 없습니다</p>
          <p className="text-sm text-slate-400 mt-1">ID: {id}</p>
          <Link href="/companies" className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <ArrowLeft className="w-4 h-4" /> 업체 목록으로
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const statusCounts = equipment.reduce((acc, eq) => {
    acc[eq.status || 'offline'] = (acc[eq.status || 'offline'] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const replaceFilters = filters.filter(f => f.status === 'replace');

  const contractDaysLeft = company.contract_end
    ? Math.floor((new Date(company.contract_end).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <DashboardLayout title={company.name} subtitle={`${company.city || ''} ${company.district || ''}`}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-5">
        <Link href="/companies" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 업체 목록
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-700 font-medium">{company.name}</span>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl p-6 mb-5 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #60a5fa 0%, transparent 60%), radial-gradient(circle at 80% 20%, #34d399 0%, transparent 50%)' }}
        />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center flex-shrink-0">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold">{company.name}</h2>
                <span className={cn(
                  'text-xs font-semibold px-3 py-1 rounded-full',
                  company.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/10 text-white/60'
                )}>
                  {company.status === 'active' ? '● 활성 계약' : '비활성'}
                </span>
              </div>
              <div className="text-blue-200 text-sm mt-1">{company.business_no || '사업자번호 미등록'}</div>
              <div className="flex items-center gap-4 mt-2 text-xs text-blue-300 flex-wrap">
                {company.contact && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {company.contact}</span>}
                {company.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {company.phone}</span>}
                {(company.city || company.district) && (
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {company.city} {company.district}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* KPI Row */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: '설치 장비',     value: equipment.length,                  unit: '대', icon: Cpu,          color: 'text-blue-300' },
            { label: '정상 가동',     value: statusCounts['normal'] || 0,        unit: '대', icon: CheckCircle2, color: 'text-emerald-300' },
            { label: '교체 필요 필터', value: replaceFilters.length,             unit: '개', icon: Filter,       color: replaceFilters.length > 0 ? 'text-red-300' : 'text-blue-300' },
            {
              label: '계약 잔여',
              value: contractDaysLeft !== null ? (contractDaysLeft < 0 ? '만료' : `D-${contractDaysLeft}`) : '-',
              unit: '',
              icon: Calendar,
              color: contractDaysLeft !== null && contractDaysLeft < 90 ? 'text-amber-300' : 'text-blue-300',
            },
          ].map(item => (
            <div key={item.label} className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <item.icon className={cn('w-3.5 h-3.5', item.color)} />
                <span className="text-xs text-blue-300">{item.label}</span>
              </div>
              <div className={cn('text-2xl font-bold', item.color)}>{item.value}</div>
              <div className="text-xs text-blue-400">{item.unit}</div>
            </div>
          ))}
        </div>
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
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── 업체 정보 ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" /> 기본 정보
            </h3>
            <dl className="space-y-2.5">
              {[
                { dt: '업체명',    dd: company.name },
                { dt: '사업자번호', dd: company.business_no || '-' },
                { dt: '담당자',    dd: company.contact || '-' },
                { dt: '전화번호',  dd: company.phone || '-' },
                { dt: '이메일',    dd: company.email || '-' },
                { dt: '상태',      dd: company.status === 'active' ? '활성' : '비활성' },
              ].map(({ dt, dd }) => (
                <div key={dt} className="flex gap-4 py-1.5 border-b border-slate-50 last:border-0">
                  <dt className="text-xs text-slate-400 w-24 flex-shrink-0 pt-0.5">{dt}</dt>
                  <dd className="text-sm font-medium text-slate-800 break-all">{dd}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500" /> 위치 및 계약
            </h3>
            <dl className="space-y-2.5">
              {[
                { dt: '시/도',     dd: company.city || '-' },
                { dt: '구/군',     dd: company.district || '-' },
                { dt: '주소',      dd: company.address || '-' },
                { dt: '계약 시작', dd: formatDate(company.contract_start) },
                { dt: '계약 만료', dd: formatDate(company.contract_end) },
                {
                  dt: '잔여 기간',
                  dd: contractDaysLeft !== null
                    ? contractDaysLeft < 0 ? '⚠️ 계약 만료됨'
                    : contractDaysLeft < 90 ? `⚠️ D-${contractDaysLeft} (갱신 필요)`
                    : `D-${contractDaysLeft}`
                    : '-',
                },
              ].map(({ dt, dd }) => (
                <div key={dt} className="flex gap-4 py-1.5 border-b border-slate-50 last:border-0">
                  <dt className="text-xs text-slate-400 w-24 flex-shrink-0 pt-0.5">{dt}</dt>
                  <dd className="text-sm font-medium text-slate-800">{dd}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 lg:col-span-2">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-500" /> 계약 현황
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="text-2xl font-bold text-blue-700">{equipment.length}</div>
                <div className="text-xs text-blue-500 mt-1">설치 장비</div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl">
                <div className="text-2xl font-bold text-emerald-700">
                  {maintenances.filter(m => m.status === 'completed').length}
                </div>
                <div className="text-xs text-emerald-500 mt-1">유지보수 완료</div>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl">
                <div className="text-2xl font-bold text-amber-700">{replaceFilters.length}</div>
                <div className="text-xs text-amber-500 mt-1">교체 필요 필터</div>
              </div>
            </div>
            {company.notes && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
                <span className="font-medium text-slate-700 block mb-1">비고</span>
                {company.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 설치 장비 ── */}
      {activeTab === 'equipment' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{equipment.length}대 장비 설치됨</p>
            <button
              onClick={() => setShowAddEquipment(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              장비 추가
            </button>
          </div>
          {equipment.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Cpu className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">등록된 장비가 없습니다</p>
            </div>
          ) : (
            <>
              {/* 모바일 카드 */}
              <div className="sm:hidden space-y-2">
                {equipment.map(eq => {
                  const sc = STATUS_CONFIG[eq.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.offline;
                  const tc = EQUIPMENT_TYPE_CONFIG[eq.equipment_type as keyof typeof EQUIPMENT_TYPE_CONFIG] || { icon: '🔧', label: eq.equipment_type };
                  return (
                    <Link key={eq.id} href={`/equipment/${eq.id}`} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-blue-300 transition-colors">
                      <span className="text-2xl">{tc.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 text-sm truncate">{eq.name || eq.model}</div>
                        <div className="text-xs text-slate-400">{eq.serial_no}</div>
                      </div>
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', sc.bg, sc.color)}>{sc.label}</span>
                    </Link>
                  );
                })}
              </div>
              {/* 데스크톱 테이블 */}
              <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['장비명', '모델', '유형', '상태', '통신', '설치일', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {equipment.map(eq => {
                      const sc = STATUS_CONFIG[eq.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.offline;
                      const tc = EQUIPMENT_TYPE_CONFIG[eq.equipment_type as keyof typeof EQUIPMENT_TYPE_CONFIG] || { icon: '🔧', label: eq.equipment_type };
                      return (
                        <tr key={eq.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800 flex items-center gap-2">
                              <span>{tc.icon}</span>{eq.name || eq.model}
                            </div>
                            <div className="text-xs text-slate-400">{eq.serial_no}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{eq.model}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{tc.label}</td>
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', sc.bg, sc.color)}>
                              <span className={cn('w-1.5 h-1.5 rounded-full', sc.dot)} />{sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{eq.comm_type?.toUpperCase() || '-'}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{formatDate(eq.install_date)}</td>
                          <td className="px-4 py-3">
                            <Link href={`/equipment/${eq.id}`} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                              상세 <ExternalLink className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <AddEquipmentModal
            open={showAddEquipment}
            onClose={() => setShowAddEquipment(false)}
            onSuccess={loadData}
            presetCompanyId={id}
          />
        </div>
      )}

      {/* ── 필터 현황 ── */}
      {activeTab === 'filters' && (
        <div className="space-y-4">
          {replaceFilters.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">교체 필요 필터 <strong>{replaceFilters.length}개</strong>가 있습니다. 즉시 점검하세요.</p>
            </div>
          )}
          {filters.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">등록된 필터 정보가 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filters.map(f => {
                const pct = f.used_percent || 0;
                const barColor = pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-500';
                const fc = FILTER_STATUS[f.status] || FILTER_STATUS.normal;
                return (
                  <div key={f.id} className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {f.stage != null && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">{f.stage}단계</span>
                          )}
                          <span className={cn('text-xs px-2 py-0.5 rounded font-semibold', fc.bg, fc.color)}>{fc.label}</span>
                        </div>
                        <div className="text-sm font-semibold text-slate-800">{f.filter_name}</div>
                        {f.equipment_name && <div className="text-xs text-slate-400">{f.equipment_name}</div>}
                      </div>
                      <span className={cn('text-xl font-bold', pct >= 95 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-emerald-600')}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                      <div className={cn('h-2 rounded-full', barColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="text-xs text-slate-400">교체예정: {formatDate(f.replace_date)} · {f.supplier || '-'}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 유지보수 ── */}
      {activeTab === 'maintenance' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{maintenances.length}건 이력</p>
            <button
              onClick={() => setShowAddMaintenance(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              작업 등록
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
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800 text-sm">{m.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {m.status === 'completed' ? '완료' : m.status === 'in_progress' ? '진행중' : '예정'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3 flex-wrap">
                      {m.equipment_name && <span className="flex items-center gap-1"><Cpu className="w-3 h-3" />{m.equipment_name}</span>}
                      {m.technician && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{m.technician}</span>}
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{m.completed_date || m.scheduled_date || '-'}</span>
                      {m.cost ? <span>💰 {m.cost.toLocaleString('ko-KR')}원</span> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <AddMaintenanceModal
            open={showAddMaintenance}
            onClose={() => setShowAddMaintenance(false)}
            onSuccess={loadData}
            presetCompanyId={id}
          />
        </div>
      )}
    </DashboardLayout>
  );
}
