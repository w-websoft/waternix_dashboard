'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { mockAlerts } from '@/lib/mock-data';
import { SEVERITY_CONFIG, formatDateTime, formatRelativeTime, cn } from '@/lib/utils';
import { Alert } from '@/types';
import {
  AlertCircle, AlertTriangle, Info, CheckCircle2, Bell,
  ChevronDown, ChevronUp, Search, Clock, User, MessageSquare, X,
} from 'lucide-react';

const SEVERITY_ICONS = { critical: AlertCircle, warning: AlertTriangle, info: Info };

type ProcessStep = 'received' | 'investigating' | 'processing' | 'resolved';

const PROCESS_STEPS: { id: ProcessStep; label: string; color: string; bg: string; desc: string }[] = [
  { id: 'received',     label: '1. 접수됨',   color: 'text-slate-600', bg: 'bg-slate-100',   desc: '알림이 접수되어 확인 대기 중' },
  { id: 'investigating', label: '2. 조사중',  color: 'text-blue-700',  bg: 'bg-blue-50',     desc: '원인 조사 및 현장 확인 중' },
  { id: 'processing',   label: '3. 처리중',   color: 'text-amber-700', bg: 'bg-amber-50',    desc: '수리/교체/조치 진행 중' },
  { id: 'resolved',     label: '4. 완료',     color: 'text-emerald-700', bg: 'bg-emerald-50', desc: '문제 해결 완료' },
];

interface AlertProcess {
  step: ProcessStep;
  assignee: string;
  comment: string;
  updatedAt: string;
}

const TECHNICIANS = ['김기술', '이엔지', '박수리', '최점검', '정유지', '미배정'];

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [showResolved, setShowResolved] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processes, setProcesses] = useState<Record<string, AlertProcess>>({});
  const [showProcessModal, setShowProcessModal] = useState<Alert | null>(null);
  const [processForm, setProcessForm] = useState<{ step: ProcessStep; assignee: string; comment: string }>({
    step: 'received', assignee: '미배정', comment: '',
  });

  const filtered = mockAlerts.filter(a => {
    const matchSeverity = severityFilter === 'all' || a.severity === severityFilter;
    const proc = processes[a.id];
    const isResolved = proc?.step === 'resolved' || a.acknowledged;
    const matchResolved = showResolved ? true : !isResolved;
    const matchSearch = !search || [a.title, a.equipmentName, a.companyName, a.message]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return matchSeverity && matchResolved && matchSearch;
  });

  const counts = { critical: 0, warning: 0, info: 0, total: 0 };
  mockAlerts.filter(a => {
    const proc = processes[a.id];
    return proc?.step !== 'resolved' && !a.acknowledged;
  }).forEach(a => { counts[a.severity]++; counts.total++; });

  const getProcess = (alertId: string): AlertProcess => {
    return processes[alertId] || {
      step: 'received',
      assignee: '미배정',
      comment: '',
      updatedAt: '',
    };
  };

  const openProcessModal = (alert: Alert) => {
    const proc = getProcess(alert.id);
    setProcessForm({ step: proc.step, assignee: proc.assignee, comment: '' });
    setShowProcessModal(alert);
  };

  const handleProcessUpdate = () => {
    if (!showProcessModal) return;
    setProcesses(prev => ({
      ...prev,
      [showProcessModal.id]: {
        step: processForm.step,
        assignee: processForm.assignee,
        comment: processForm.comment,
        updatedAt: new Date().toISOString(),
      },
    }));
    setShowProcessModal(null);
  };

  const stepIndex = (step: ProcessStep) => PROCESS_STEPS.findIndex(s => s.id === step);

  return (
    <DashboardLayout title="알림 관리" subtitle={`미처리 알림 ${counts.total}건`}>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {[
          { label: '전체 알림', value: mockAlerts.length, color: 'text-slate-800', bg: 'bg-white' },
          { label: '긴급 (미처리)', value: counts.critical, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
          { label: '경고 (미처리)', value: counts.warning, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
          { label: '처리 완료', value: mockAlerts.filter(a => a.acknowledged || processes[a.id]?.step === 'resolved').length, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl border p-4', s.bg)}>
            <div className="text-sm text-slate-500">{s.label}</div>
            <div className={cn('text-3xl font-bold mt-1', s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="알림 제목, 장비명, 업체명 검색..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
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
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer ml-1">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={e => setShowResolved(e.target.checked)}
            className="rounded"
          />
          완료 포함
        </label>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <Bell className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">해당하는 알림이 없습니다</p>
          </div>
        )}
        {filtered.map(alert => {
          const conf = SEVERITY_CONFIG[alert.severity];
          const Icon = SEVERITY_ICONS[alert.severity];
          const proc = getProcess(alert.id);
          const isResolved = proc.step === 'resolved' || alert.acknowledged;
          const stepInfo = PROCESS_STEPS.find(s => s.id === proc.step);
          const isExpanded = expandedId === alert.id;

          return (
            <div
              key={alert.id}
              className={cn(
                'bg-white rounded-xl border transition-all',
                isResolved ? 'border-slate-100 opacity-70' :
                alert.severity === 'critical' ? 'border-red-200 shadow-sm shadow-red-50' :
                alert.severity === 'warning' ? 'border-amber-200' : 'border-blue-200'
              )}
            >
              {/* Main Row */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', conf.bg)}>
                    <Icon className={cn('w-4 h-4', conf.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', conf.bg, conf.color, conf.border)}>
                        {conf.label}
                      </span>
                      {stepInfo && (
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', stepInfo.bg, stepInfo.color)}>
                          {stepInfo.label}
                        </span>
                      )}
                      {proc.assignee && proc.assignee !== '미배정' && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <User className="w-3 h-3" /> {proc.assignee}
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-slate-800 mt-1.5 text-sm">{alert.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{alert.message}</div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 flex-wrap">
                      <span>{alert.equipmentName}</span>
                      <span>·</span>
                      <span>{alert.companyName}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatRelativeTime(alert.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isResolved && (
                      <button
                        onClick={() => openProcessModal(alert)}
                        className={cn(
                          'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                          alert.severity === 'critical' ? 'bg-red-600 hover:bg-red-700 text-white' :
                          alert.severity === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white' :
                          'bg-blue-500 hover:bg-blue-600 text-white'
                        )}
                      >
                        처리
                      </button>
                    )}
                    {isResolved && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 완료
                      </span>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Step Progress Bar */}
                {!isResolved && (
                  <div className="mt-3 flex items-center gap-1">
                    {PROCESS_STEPS.map((step, idx) => (
                      <div key={step.id} className="flex items-center gap-1 flex-1">
                        <div className={cn(
                          'h-1.5 flex-1 rounded-full transition-all',
                          idx <= stepIndex(proc.step) ? (
                            proc.step === 'resolved' ? 'bg-emerald-500' :
                            proc.step === 'processing' ? 'bg-amber-400' :
                            proc.step === 'investigating' ? 'bg-blue-500' : 'bg-slate-300'
                          ) : 'bg-slate-100'
                        )} />
                        {idx < PROCESS_STEPS.length - 1 && <div className="w-1" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expanded: History */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-50 pt-3">
                  <div className="text-xs font-semibold text-slate-500 mb-2">처리 이력</div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-xs text-slate-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-slate-700">알림 발생</span>
                        <span className="ml-2 text-slate-400">{formatDateTime(alert.createdAt)}</span>
                      </div>
                    </div>
                    {proc.updatedAt && (
                      <div className="flex items-start gap-2 text-xs text-slate-500">
                        <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                          proc.step === 'resolved' ? 'bg-emerald-500' :
                          proc.step === 'processing' ? 'bg-amber-400' : 'bg-blue-500'
                        )} />
                        <div>
                          <span className="font-medium text-slate-700">{stepInfo?.label}</span>
                          {proc.assignee !== '미배정' && <span className="ml-1 text-blue-600">({proc.assignee})</span>}
                          <span className="ml-2 text-slate-400">{formatDateTime(proc.updatedAt)}</span>
                          {proc.comment && <div className="mt-0.5 text-slate-600 bg-slate-50 p-2 rounded-lg">{proc.comment}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                    <div><span className="text-slate-400">장비 ID</span><br />{alert.equipmentId}</div>
                    <div><span className="text-slate-400">알림 유형</span><br />{alert.type}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Process Modal */}
      {showProcessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowProcessModal(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900 text-base">처리 상태 업데이트</h2>
                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-64">{showProcessModal.title}</p>
              </div>
              <button onClick={() => setShowProcessModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Step Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">처리 단계</label>
                <div className="space-y-2">
                  {PROCESS_STEPS.map((step, idx) => (
                    <button
                      key={step.id}
                      onClick={() => setProcessForm(f => ({ ...f, step: step.id }))}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                        processForm.step === step.id ? `${step.bg} border-current ${step.color}` : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      )}
                    >
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                        processForm.step === step.id ? 'bg-current text-white' : 'bg-slate-100 text-slate-500'
                      )}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{step.label}</div>
                        <div className="text-xs opacity-70">{step.desc}</div>
                      </div>
                      {idx <= stepIndex(getProcess(showProcessModal.id).step) && (
                        <CheckCircle2 className="w-4 h-4 ml-auto opacity-50" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">
                  <User className="w-3.5 h-3.5 inline mr-1" /> 담당 기술자
                </label>
                <select
                  value={processForm.assignee}
                  onChange={e => setProcessForm(f => ({ ...f, assignee: e.target.value }))}
                  className="w-full bg-slate-50 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
                >
                  {TECHNICIANS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">
                  <MessageSquare className="w-3.5 h-3.5 inline mr-1" /> 처리 메모
                </label>
                <textarea
                  rows={3}
                  value={processForm.comment}
                  onChange={e => setProcessForm(f => ({ ...f, comment: e.target.value }))}
                  placeholder="조치 내용, 원인, 특이사항 등 기록..."
                  className="w-full bg-slate-50 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setShowProcessModal(null)} className="px-4 py-2 text-sm text-slate-500">취소</button>
              <button
                onClick={handleProcessUpdate}
                className={cn(
                  'flex items-center gap-2 px-5 py-2 text-white text-sm font-bold rounded-xl transition-all',
                  processForm.step === 'resolved' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  processForm.step === 'processing' ? 'bg-amber-500 hover:bg-amber-600' :
                  processForm.step === 'investigating' ? 'bg-blue-600 hover:bg-blue-700' :
                  'bg-slate-600 hover:bg-slate-700'
                )}
              >
                <CheckCircle2 className="w-4 h-4" /> 상태 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
