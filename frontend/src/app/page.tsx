'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/dashboard/KpiCard';
import AlertList from '@/components/dashboard/AlertList';
import StatusDonut from '@/components/dashboard/StatusDonut';
import VolumeChart from '@/components/dashboard/VolumeChart';
import { STATUS_CONFIG, EQUIPMENT_TYPE_CONFIG, formatRelativeTime, cn } from '@/lib/utils';
import { dashboardApi, equipmentApi, alertsApi, maintenanceApi } from '@/lib/api';
import type { DashboardSummary, EquipmentPayload, AlertPayload, MaintenancePayload } from '@/lib/api';
import Link from 'next/link';
import AddEquipmentModal from '@/components/equipment/AddEquipmentModal';
import {
  Droplets, AlertTriangle, Wrench, Package,
  Activity, Zap, CheckCircle2, XCircle, LayoutDashboard, Plus, Radio,
} from 'lucide-react';

const EquipmentMap = dynamic(() => import('@/components/map/EquipmentMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center">
      <div className="text-slate-400 text-sm">지도 로딩 중...</div>
    </div>
  ),
});

const EMPTY_SUMMARY: DashboardSummary = {
  total_equipment: 0, normal_count: 0, warning_count: 0,
  error_count: 0, offline_count: 0, maintenance_count: 0,
  total_companies: 0, today_volume: 0, monthly_volume: 0,
  pending_maintenance: 0, filter_replace: 0, unresolved_alerts: 0,
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);
  const [equipment, setEquipment] = useState<EquipmentPayload[]>([]);
  const [alerts, setAlerts] = useState<AlertPayload[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenancePayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const load = useCallback(async () => {
    try {
      const [s, eq, al, mt] = await Promise.all([
        dashboardApi.getSummary(),
        equipmentApi.list({ page_size: '10' }),
        alertsApi.list({ resolved: 'false' }),
        maintenanceApi.list({ status: 'scheduled' }),
      ]);
      setSummary(s);
      setEquipment(eq as EquipmentPayload[]);
      setAlerts(al.slice(0, 4));
      setMaintenance((mt as MaintenancePayload[]).slice(0, 4));
    } catch {
      // fallback: keep empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // 사이도맵 데이터 형식 변환
  const mapEquipment = equipment.map(eq => ({
    id: eq.id || '',
    lat: eq.lat || 0,
    lng: eq.lng || 0,
    name: eq.name || eq.model,
    status: (eq.status as 'normal' | 'warning' | 'error' | 'offline' | 'maintenance') || 'offline',
    model: eq.model,
    companyName: eq.company_name || '',
    serialNo: eq.serial_no,
    city: eq.city || '',
    equipmentType: (eq.equipment_type ?? 'ro') as string,
  })).filter(eq => eq.lat && eq.lng);

  return (
    <DashboardLayout
      title="실시간 대시보드"
      subtitle="전국 수처리 장비 현황 모니터링"
    >
      {/* Live Status Bar */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 p-2.5 sm:p-3 bg-slate-900 rounded-xl text-sm flex-wrap gap-2">
        <div className="flex items-center gap-2 text-teal-400">
          <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse shrink-0" />
          <span className="font-semibold text-xs sm:text-sm">실시간 모니터링</span>
          <span className="text-slate-500 text-xs hidden sm:inline">· 실시간 DB 연동</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-slate-400 text-xs">미처리 알림 <span className="text-red-400 font-bold">{summary.unresolved_alerts}</span>건</span>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-500 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> 장비 등록
          </button>
        </div>
      </div>
      <AddEquipmentModal open={showAddModal} onClose={() => setShowAddModal(false)} onSuccess={load} />

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
          <KpiCard title="전체 장비" value={summary.total_equipment} unit="대" icon={Activity} iconColor="text-blue-600" iconBg="bg-blue-50" subtitle={`관리 업체 ${summary.total_companies}곳`} />
          <KpiCard title="정상 가동" value={summary.normal_count} unit="대" icon={CheckCircle2} iconColor="text-emerald-600" iconBg="bg-emerald-50" trend={summary.total_equipment > 0 ? { value: `${((summary.normal_count / summary.total_equipment) * 100).toFixed(0)}% 가동률`, positive: true } : undefined} />
          <KpiCard title="이상/오프라인" value={summary.error_count + summary.offline_count} unit="대" icon={XCircle} iconColor="text-red-600" iconBg="bg-red-50" urgent={(summary.error_count + summary.offline_count) > 0} subtitle="즉시 확인 필요" />
          <KpiCard title="오늘 정수량" value={summary.today_volume.toLocaleString('ko-KR')} unit="L" icon={Droplets} iconColor="text-cyan-600" iconBg="bg-cyan-50" subtitle={`월 누적 ${(summary.monthly_volume / 1000).toFixed(0)}kL`} />
          <KpiCard title="경고 장비" value={summary.warning_count} unit="대" icon={AlertTriangle} iconColor="text-amber-600" iconBg="bg-amber-50" urgent={summary.warning_count > 0} />
          <KpiCard title="유지보수 예정" value={summary.pending_maintenance} unit="건" icon={Wrench} iconColor="text-blue-600" iconBg="bg-blue-50" />
          <KpiCard title="필터 교체 필요" value={summary.filter_replace} unit="개" icon={Package} iconColor="text-orange-600" iconBg="bg-orange-50" urgent={summary.filter_replace > 0} />
          <KpiCard title="미처리 알림" value={summary.unresolved_alerts} unit="건" icon={Zap} iconColor="text-purple-600" iconBg="bg-purple-50" urgent={summary.unresolved_alerts > 0} />
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-4">
        {/* Map */}
        <div className="xl:col-span-8">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-slate-100 flex-wrap gap-2">
              <div>
                <h2 className="font-semibold text-slate-800 text-sm sm:text-base">전국 장비 현황 지도</h2>
                <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">클릭하여 장비 상세 정보 확인</p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <div key={status} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                    <span className="text-xs text-slate-500">{config.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-[280px] sm:h-[380px] lg:h-[460px]">
              <EquipmentMap
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                equipment={mapEquipment as any}
                selectedId={selectedId}
                onSelect={(eq) => setSelectedId(eq?.id)}
                height="100%"
              />
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="xl:col-span-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 sm:gap-4">
          {/* Status Donut */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
            <h2 className="font-semibold text-slate-800 text-sm sm:text-base mb-3">장비 상태 분포</h2>
            <StatusDonut summary={{
              totalEquipment: summary.total_equipment,
              normalCount: summary.normal_count,
              warningCount: summary.warning_count,
              errorCount: summary.error_count,
              offlineCount: summary.offline_count,
              maintenanceCount: summary.maintenance_count,
              totalCompanies: summary.total_companies,
              todayVolume: summary.today_volume,
              monthlyVolume: summary.monthly_volume,
              pendingMaintenance: summary.pending_maintenance,
              filterReplace: summary.filter_replace,
              unresolvedAlerts: summary.unresolved_alerts,
            }} />
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800 text-sm sm:text-base">미처리 알림</h2>
              <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold border border-red-200">
                {alerts.length}건
              </span>
            </div>
            {alerts.length > 0 ? (
              <AlertList
                alerts={alerts}
                maxItems={4}
              />
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">미처리 알림이 없습니다</p>
            )}
            <Link href="/alerts" className="block mt-3 text-xs text-center text-blue-600 font-medium hover:underline">
              전체 알림 보기 →
            </Link>
          </div>
        </div>

        {/* Equipment List */}
        <div className="xl:col-span-8">
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800 text-sm sm:text-base">장비 현황 목록</h2>
              <Link href="/equipment" className="text-xs text-blue-600 hover:text-blue-700 font-medium">전체 보기 →</Link>
            </div>
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
              </div>
            ) : equipment.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">등록된 장비가 없습니다</div>
            ) : (
              <>
                {/* 모바일: 카드 뷰 */}
                <div className="sm:hidden divide-y divide-slate-50">
                  {equipment.slice(0, 6).map((eq) => {
                    const statusKey = (eq.status || 'offline') as keyof typeof STATUS_CONFIG;
                    const statusConf = STATUS_CONFIG[statusKey] || STATUS_CONFIG['offline'];
                    const typeKey = (eq.equipment_type || 'ro') as keyof typeof EQUIPMENT_TYPE_CONFIG;
                    const typeConf = EQUIPMENT_TYPE_CONFIG[typeKey] || EQUIPMENT_TYPE_CONFIG['ro'];
                    return (
                      <Link
                        key={eq.id}
                        href={`/equipment/${eq.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-xl shrink-0">{typeConf.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-800 text-sm truncate">{eq.name || eq.model}</div>
                          <div className="text-xs text-slate-400 truncate">{eq.company_name} · {eq.city}</div>
                        </div>
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0', statusConf.bg, statusConf.color)}>
                          {statusConf.label}
                        </span>
                      </Link>
                    );
                  })}
                  <div className="px-4 py-3">
                    <Link href="/equipment" className="block text-center text-xs text-blue-600 font-medium">모든 장비 보기 →</Link>
                  </div>
                </div>

                {/* 데스크톱: 테이블 뷰 */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs">
                        <th className="px-4 sm:px-5 py-3 text-left font-medium">장비명</th>
                        <th className="px-4 py-3 text-left font-medium">업체</th>
                        <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">지역</th>
                        <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">유형</th>
                        <th className="px-4 py-3 text-left font-medium">상태</th>
                        <th className="px-4 py-3 text-right font-medium hidden lg:table-cell">마지막 수신</th>
                        <th className="px-4 py-3 text-center font-medium hidden lg:table-cell">배치도</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {equipment.map((eq) => {
                        const statusKey = (eq.status || 'offline') as keyof typeof STATUS_CONFIG;
                        const statusConf = STATUS_CONFIG[statusKey] || STATUS_CONFIG['offline'];
                        const typeKey = (eq.equipment_type || 'ro') as keyof typeof EQUIPMENT_TYPE_CONFIG;
                        const typeConf = EQUIPMENT_TYPE_CONFIG[typeKey] || EQUIPMENT_TYPE_CONFIG['ro'];
                        return (
                          <tr key={eq.id} className={cn('hover:bg-blue-50/50 cursor-pointer transition-colors', selectedId === eq.id && 'bg-blue-50')}>
                            <td className="px-4 sm:px-5 py-3">
                              <Link href={`/equipment/${eq.id}`} className="flex items-center gap-2 group/link">
                                <span className="text-base">{typeConf.icon}</span>
                                <div>
                                  <div className="font-medium text-slate-800 group-hover/link:text-blue-600 transition-colors text-sm">{eq.name || eq.model}</div>
                                  <div className="text-xs text-slate-400">{eq.serial_no}</div>
                                </div>
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-slate-600 text-xs max-w-[120px] truncate">{eq.company_name || '-'}</td>
                            <td className="px-4 py-3 text-slate-600 text-xs hidden lg:table-cell">{eq.city || '-'}</td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              <span className="text-xs text-slate-500">{typeConf.label}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border', statusConf.bg, statusConf.color)}>
                                <span className={cn('w-1.5 h-1.5 rounded-full', statusConf.dot)} />
                                {statusConf.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-slate-400 hidden lg:table-cell">
                              {eq.updated_at ? formatRelativeTime(eq.updated_at) : '-'}
                            </td>
                            <td className="px-4 py-3 text-center hidden lg:table-cell">
                              <Link href={`/equipment/${eq.id}/layout-editor`} onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-xs text-slate-500 hover:text-teal-600 transition-all">
                                <LayoutDashboard className="w-3 h-3" />
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
          </div>
        </div>

        {/* Volume Chart + Maintenance */}
        <div className="xl:col-span-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
            <h2 className="font-semibold text-slate-800 text-sm sm:text-base mb-3">14일 생산량 추이</h2>
            <VolumeChart />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800 text-sm sm:text-base">유지보수 일정</h2>
              <Link href="/maintenance" className="text-xs text-blue-600 hover:text-blue-700 font-medium">전체 →</Link>
            </div>
            {maintenance.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">예정된 유지보수가 없습니다</p>
            ) : (
              <div className="space-y-2">
                {maintenance.map((m) => (
                  <div key={m.id} className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-lg">
                    <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', m.status === 'in_progress' ? 'bg-blue-500' : 'bg-amber-500')} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-medium text-slate-800 truncate">{m.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{m.scheduled_date} · {m.status === 'in_progress' ? '진행 중' : '예정'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
