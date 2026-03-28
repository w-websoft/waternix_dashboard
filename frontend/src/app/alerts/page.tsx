'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { mockAlerts } from '@/lib/mock-data';
import { SEVERITY_CONFIG, formatDateTime, cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, Info, CheckCircle, Bell } from 'lucide-react';

const SEVERITY_ICONS = { critical: AlertCircle, warning: AlertTriangle, info: Info };

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const filtered = mockAlerts.filter(a => {
    const matchSeverity = severityFilter === 'all' || a.severity === severityFilter;
    const matchAck = showAcknowledged || !a.acknowledged;
    return matchSeverity && matchAck;
  });

  const counts = { critical: 0, warning: 0, info: 0 };
  mockAlerts.filter(a => !a.acknowledged).forEach(a => { counts[a.severity]++; });

  return (
    <DashboardLayout title="알림 관리" subtitle={`미처리 알림 ${mockAlerts.filter(a => !a.acknowledged).length}건`}>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: '전체 알림', value: mockAlerts.length, color: 'text-slate-800', bg: 'bg-white' },
          { label: '긴급 (미처리)', value: counts.critical, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
          { label: '경고 (미처리)', value: counts.warning, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
          { label: '처리 완료', value: mockAlerts.filter(a => a.acknowledged).length, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl border p-4', s.bg)}>
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className={cn('text-3xl font-bold mt-1', s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {(['all', 'critical', 'warning', 'info'] as const).map(sev => {
          const conf = sev === 'all' ? null : SEVERITY_CONFIG[sev];
          return (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={cn(
                'px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                severityFilter === sev
                  ? conf ? `${conf.bg} ${conf.color} ${conf.border}` : 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              )}
            >
              {sev === 'all' ? '전체' : conf?.label}
            </button>
          );
        })}
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer ml-2">
          <input
            type="checkbox"
            checked={showAcknowledged}
            onChange={e => setShowAcknowledged(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          처리 완료 포함
        </label>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {filtered.map(alert => {
          const conf = SEVERITY_CONFIG[alert.severity];
          const Icon = SEVERITY_ICONS[alert.severity];
          return (
            <div
              key={alert.id}
              className={cn(
                'bg-white rounded-xl border p-5 transition-all hover:shadow-sm',
                alert.acknowledged ? 'opacity-70' : conf.border,
                !alert.acknowledged && alert.severity === 'critical' && 'border-red-300 shadow-sm shadow-red-100'
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', conf.bg)}>
                  <Icon className={cn('w-5 h-5', conf.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', conf.bg, conf.color, conf.border)}>
                          {conf.label}
                        </span>
                        <h3 className="font-semibold text-slate-800">{alert.title}</h3>
                        {alert.acknowledged && (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> 처리됨
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{alert.message}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span>장비: <strong className="text-slate-600">{alert.equipmentName}</strong></span>
                        <span>업체: <strong className="text-slate-600">{alert.companyName}</strong></span>
                        <span>발생: {formatDateTime(alert.createdAt)}</span>
                        {alert.acknowledged && alert.acknowledgedBy && (
                          <span>처리: {alert.acknowledgedBy} ({formatDateTime(alert.acknowledgedAt)})</span>
                        )}
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <button className="flex-shrink-0 px-3 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors">
                        확인 처리
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-20 text-center text-slate-400">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <div>알림이 없습니다</div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
