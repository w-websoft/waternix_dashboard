'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/dashboard/KpiCard';
import AlertList from '@/components/dashboard/AlertList';
import StatusDonut from '@/components/dashboard/StatusDonut';
import VolumeChart from '@/components/dashboard/VolumeChart';
import { STATUS_CONFIG, EQUIPMENT_TYPE_CONFIG, formatRelativeTime, cn } from '@/lib/utils';
import { mockDashboardSummary, mockEquipment, mockAlerts, mockMaintenanceRecords } from '@/lib/mock-data';
import { Equipment } from '@/types';
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

export default function DashboardPage() {
  const summary = mockDashboardSummary;
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | undefined>();
  const [showAddModal, setShowAddModal] = useState(false);
  const [liveVolume, setLiveVolume] = useState(summary.todayVolume);
  const unacknowledgedAlerts = mockAlerts.filter(a => !a.acknowledged);
  const upcomingMaintenance = mockMaintenanceRecords
    .filter(m => m.status === 'scheduled' || m.status === 'in_progress')
    .slice(0, 4);

  useEffect(() => {
    const t = setInterval(() => {
      setLiveVolume(v => parseFloat((v + (Math.random() * 20)).toFixed(0)));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <DashboardLayout
      title="실시간 대시보드"
      subtitle="전국 수처리 장비 현황 모니터링"
    >
      {/* Live Status Bar */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 p-2.5 sm:p-3 bg-slate-900 rounded-xl text-sm flex-wrap gap-2">
        <div className="flex items-center gap-2 text-teal-400">
          <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse flex-shrink-0" />
          <span className="font-semibold text-xs sm:text-sm">실시간 모니터링</span>
          <span className="text-slate-500 text-xs hidden sm:inline">· 4초마다 갱신</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-slate-400 text-xs">미처리 알림 <span className="text-red-400 font-bold">{unacknowledgedAlerts.length}</span>건</span>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-500 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> 장비 등록
          </button>
        </div>
      </div>
      <AddEquipmentModal open={showAddModal} onClose={() => setShowAddModal(false)} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
        <KpiCard title="전체 장비" value={summary.totalEquipment} unit="대" icon={Activity} iconColor="text-blue-600" iconBg="bg-blue-50" subtitle={`관리 업체 ${summary.totalCompanies}곳`} />
        <KpiCard title="정상 가동" value={summary.normalCount} unit="대" icon={CheckCircle2} iconColor="text-emerald-600" iconBg="bg-emerald-50" trend={{ value: `${((summary.normalCount / summary.totalEquipment) * 100).toFixed(0)}% 가동률`, positive: true }} />
        <KpiCard title="이상/오프라인" value={summary.errorCount + summary.offlineCount} unit="대" icon={XCircle} iconColor="text-red-600" iconBg="bg-red-50" urgent={summary.errorCount + summary.offlineCount > 0} subtitle="즉시 확인 필요" />
        <KpiCard title="오늘 정수량" value={liveVolume.toLocaleString('ko-KR')} unit="L" icon={Droplets} iconColor="text-cyan-600" iconBg="bg-cyan-50" subtitle={`월 누적 ${(summary.monthlyVolume / 1000).toFixed(0)}kL`} />
        <KpiCard title="경고 장비" value={summary.warningCount} unit="대" icon={AlertTriangle} iconColor="text-amber-600" iconBg="bg-amber-50" urgent={summary.warningCount > 0} />
        <KpiCard title="유지보수 예정" value={summary.pendingMaintenance} unit="건" icon={Wrench} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <KpiCard title="필터 교체 필요" value={summary.filterReplace} unit="개" icon={Package} iconColor="text-orange-600" iconBg="bg-orange-50" urgent={summary.filterReplace > 0} />
        <KpiCard title="미처리 알림" value={summary.unresolvedAlerts} unit="건" icon={Zap} iconColor="text-purple-600" iconBg="bg-purple-50" urgent={summary.unresolvedAlerts > 0} />
      </div>

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
            {/* 지도 높이 - 모바일: 280px, 태블릿: 380px, 데스크톱: 460px */}
            <div className="h-[280px] sm:h-[380px] lg:h-[460px]">
              <EquipmentMap
                equipment={mockEquipment}
                selectedId={selectedEquipment?.id}
                onSelect={setSelectedEquipment}
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
            <StatusDonut summary={summary} />
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800 text-sm sm:text-base">미처리 알림</h2>
              <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold border border-red-200">
                {unacknowledgedAlerts.length}건
              </span>
            </div>
            <AlertList alerts={unacknowledgedAlerts} maxItems={4} />
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

            {/* 모바일: 카드 뷰 */}
            <div className="sm:hidden divide-y divide-slate-50">
              {mockEquipment.slice(0, 6).map((eq) => {
                const statusConf = STATUS_CONFIG[eq.status];
                const typeConf = EQUIPMENT_TYPE_CONFIG[eq.equipmentType];
                return (
                  <Link
                    key={eq.id}
                    href={`/equipment/${eq.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-xl flex-shrink-0">{typeConf.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 text-sm truncate">{eq.name || eq.model}</div>
                      <div className="text-xs text-slate-400 truncate">{eq.companyName} · {eq.city}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', statusConf.bg, statusConf.color)}>
                        {statusConf.label}
                      </span>
                      <span className="text-xs text-slate-400">{formatRelativeTime(eq.lastSeen)}</span>
                    </div>
                  </Link>
                );
              })}
              <div className="px-4 py-3">
                <Link href="/equipment" className="block text-center text-xs text-blue-600 font-medium">
                  모든 장비 보기 →
                </Link>
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
                    <th className="px-4 py-3 text-right font-medium hidden lg:table-cell">오늘 생산량</th>
                    <th className="px-4 py-3 text-right font-medium">마지막 수신</th>
                    <th className="px-4 py-3 text-center font-medium hidden lg:table-cell">배치도</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mockEquipment.slice(0, 10).map((eq) => {
                    const statusConf = STATUS_CONFIG[eq.status];
                    const typeConf = EQUIPMENT_TYPE_CONFIG[eq.equipmentType];
                    const isSelected = selectedEquipment?.id === eq.id;
                    return (
                      <tr
                        key={eq.id}
                        onClick={() => setSelectedEquipment(eq)}
                        className={cn('hover:bg-blue-50/50 cursor-pointer transition-colors', isSelected && 'bg-blue-50')}
                      >
                        <td className="px-4 sm:px-5 py-3">
                          <Link href={`/equipment/${eq.id}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 group/link">
                            <span className="text-base">{typeConf.icon}</span>
                            <div>
                              <div className="font-medium text-slate-800 group-hover/link:text-blue-600 transition-colors text-sm">{eq.name || eq.model}</div>
                              <div className="text-xs text-slate-400">{eq.serialNo}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs max-w-[120px] truncate">{eq.companyName}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs hidden lg:table-cell">{eq.city}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs text-slate-500">{typeConf.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border', statusConf.bg, statusConf.color)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', statusConf.dot)} />
                            {statusConf.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 font-medium text-xs hidden lg:table-cell">
                          {eq.sensorData?.dailyVolume ? `${eq.sensorData.dailyVolume.toLocaleString('ko-KR')} L` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-400">{formatRelativeTime(eq.lastSeen)}</td>
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
          </div>
        </div>

        {/* Volume Chart + Maintenance */}
        <div className="xl:col-span-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 sm:gap-4">
          {/* Volume Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
            <h2 className="font-semibold text-slate-800 text-sm sm:text-base mb-3">14일 생산량 추이</h2>
            <VolumeChart />
          </div>

          {/* Upcoming Maintenance */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800 text-sm sm:text-base">유지보수 일정</h2>
              <Link href="/maintenance" className="text-xs text-blue-600 hover:text-blue-700 font-medium">전체 →</Link>
            </div>
            <div className="space-y-2">
              {upcomingMaintenance.map((m) => (
                <div key={m.id} className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-lg">
                  <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', m.status === 'in_progress' ? 'bg-blue-500' : 'bg-amber-500')} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-medium text-slate-800 truncate">{m.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{m.scheduledDate} · {m.status === 'in_progress' ? '진행 중' : '예정'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
