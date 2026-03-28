'use client';

import { useState } from 'react';
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
import {
  Droplets, AlertTriangle, Wrench, Package,
  Activity, Zap, CheckCircle2, XCircle, LayoutDashboard,
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
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | undefined>();
  const summary = mockDashboardSummary;
  const unacknowledgedAlerts = mockAlerts.filter(a => !a.acknowledged);
  const upcomingMaintenance = mockMaintenanceRecords
    .filter(m => m.status === 'scheduled' || m.status === 'in_progress')
    .slice(0, 5);

  return (
    <DashboardLayout
      title="실시간 대시보드"
      subtitle="전국 수처리 장비 현황 모니터링"
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="전체 장비"
          value={summary.totalEquipment}
          unit="대"
          icon={Activity}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          subtitle={`관리 업체 ${summary.totalCompanies}곳`}
        />
        <KpiCard
          title="정상 가동"
          value={summary.normalCount}
          unit="대"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          trend={{ value: `${((summary.normalCount / summary.totalEquipment) * 100).toFixed(0)}% 가동률`, positive: true }}
        />
        <KpiCard
          title="이상/오프라인"
          value={summary.errorCount + summary.offlineCount}
          unit="대"
          icon={XCircle}
          iconColor="text-red-600"
          iconBg="bg-red-50"
          urgent={summary.errorCount + summary.offlineCount > 0}
          subtitle="즉시 확인 필요"
        />
        <KpiCard
          title="오늘 정수량"
          value={summary.todayVolume.toLocaleString('ko-KR')}
          unit="L"
          icon={Droplets}
          iconColor="text-cyan-600"
          iconBg="bg-cyan-50"
          subtitle={`월 누적 ${(summary.monthlyVolume / 1000).toFixed(0)}kL`}
        />
        <KpiCard
          title="경고 장비"
          value={summary.warningCount}
          unit="대"
          icon={AlertTriangle}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          urgent={summary.warningCount > 0}
        />
        <KpiCard
          title="유지보수 예정"
          value={summary.pendingMaintenance}
          unit="건"
          icon={Wrench}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <KpiCard
          title="필터 교체 필요"
          value={summary.filterReplace}
          unit="개"
          icon={Package}
          iconColor="text-orange-600"
          iconBg="bg-orange-50"
          urgent={summary.filterReplace > 0}
        />
        <KpiCard
          title="미처리 알림"
          value={summary.unresolvedAlerts}
          unit="건"
          icon={Zap}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          urgent={summary.unresolvedAlerts > 0}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-4">
        {/* Map */}
        <div className="col-span-12 xl:col-span-8">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ height: '520px' }}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div>
                <h2 className="font-semibold text-slate-800">전국 장비 현황 지도</h2>
                <p className="text-xs text-slate-400 mt-0.5">클릭하여 장비 상세 정보 확인</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                    <span className="text-slate-500">{config.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ height: 'calc(520px - 57px)' }}>
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
        <div className="col-span-12 xl:col-span-4 space-y-4">
          {/* Status Donut */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-3">장비 상태 분포</h2>
            <StatusDonut summary={summary} />
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800">미처리 알림</h2>
              <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold border border-red-200">
                {unacknowledgedAlerts.length}건
              </span>
            </div>
            <AlertList alerts={unacknowledgedAlerts} maxItems={5} />
          </div>
        </div>

        {/* Equipment List */}
        <div className="col-span-12 xl:col-span-8">
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">장비 현황 목록</h2>
              <a href="/equipment" className="text-xs text-blue-600 hover:text-blue-700 font-medium">전체 보기 →</a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs">
                    <th className="px-5 py-3 text-left font-medium">장비명</th>
                    <th className="px-4 py-3 text-left font-medium">업체</th>
                    <th className="px-4 py-3 text-left font-medium">지역</th>
                    <th className="px-4 py-3 text-left font-medium">유형</th>
                    <th className="px-4 py-3 text-left font-medium">상태</th>
                    <th className="px-4 py-3 text-right font-medium">오늘 생산량</th>
                    <th className="px-4 py-3 text-right font-medium">마지막 수신</th>
                    <th className="px-4 py-3 text-center font-medium">배치도</th>
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
                        className={cn(
                          'hover:bg-blue-50/50 cursor-pointer transition-colors',
                          isSelected && 'bg-blue-50'
                        )}
                      >
                        <td className="px-5 py-3">
                          <Link href={`/equipment/${eq.id}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 group/link">
                            <span className="text-base">{typeConf.icon}</span>
                            <div>
                              <div className="font-medium text-slate-800 group-hover/link:text-blue-600 transition-colors">{eq.name || eq.model}</div>
                              <div className="text-xs text-slate-400">{eq.serialNo}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs max-w-[140px] truncate">{eq.companyName}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{eq.city}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500">{typeConf.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border', statusConf.bg, statusConf.color)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', statusConf.dot)} />
                            {statusConf.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700 font-medium">
                          {eq.sensorData?.dailyVolume
                            ? `${eq.sensorData.dailyVolume.toLocaleString('ko-KR')} L`
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-400">
                          {formatRelativeTime(eq.lastSeen)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            href={`/equipment/${eq.id}/layout-editor`}
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-xs text-slate-500 hover:text-teal-600 transition-all"
                          >
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
        <div className="col-span-12 xl:col-span-4 space-y-4">
          {/* Volume Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-3">14일 생산량 추이</h2>
            <VolumeChart />
          </div>

          {/* Upcoming Maintenance */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800">유지보수 일정</h2>
              <a href="/maintenance" className="text-xs text-blue-600 hover:text-blue-700 font-medium">전체 보기 →</a>
            </div>
            <div className="space-y-2">
              {upcomingMaintenance.map((m) => (
                <div key={m.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className={cn(
                    'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                    m.status === 'in_progress' ? 'bg-blue-500' : 'bg-amber-500'
                  )} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 truncate">{m.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">{m.equipmentName}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {m.scheduledDate} · {m.status === 'in_progress' ? '진행 중' : '예정'}
                    </div>
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
