'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { maintenanceApi } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { Search, Plus, Wrench, Clock, CheckCircle2, XCircle, Calendar, User, Building2, RefreshCw, ChevronDown, ChevronUp, AlertCircle, DollarSign } from 'lucide-react';
import AddMaintenanceModal from '@/components/maintenance/AddMaintenanceModal';

type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
type MaintenanceType = 'preventive' | 'corrective' | 'emergency' | 'inspection';

interface MaintenanceRecord {
  id: string;
  title: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  description?: string;
  equipment_name?: string;
  equipmentName?: string;
  company_name?: string;
  companyName?: string;
  technician?: string;
  scheduled_date?: string;
  scheduledDate?: string;
  completed_date?: string;
  completedDate?: string;
  cost?: number;
}

const STATUS_CONFIG: Record<MaintenanceStatus, { label: string; color: string; bg: string; icon: typeof Wrench }> = {
  scheduled:   { label: '예정',    color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     icon: Calendar },
  in_progress: { label: '진행 중', color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',       icon: Clock },
  completed:   { label: '완료',    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  cancelled:   { label: '취소',    color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200',     icon: XCircle },
};

const TYPE_CONFIG: Record<MaintenanceType, { label: string; color: string }> = {
  preventive:  { label: '예방점검', color: 'text-blue-600' },
  corrective:  { label: '수리',    color: 'text-red-600' },
  emergency:   { label: '긴급',    color: 'text-red-700' },
  inspection:  { label: '정기점검', color: 'text-slate-600' },
};

export default function MaintenancePage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      const data = await maintenanceApi.list(params);
      setRecords(data as unknown as MaintenanceRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const counts = records.reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const norm = (r: MaintenanceRecord) => ({
    equipmentName: r.equipment_name || r.equipmentName || '-',
    companyName: r.company_name || r.companyName || '-',
    scheduledDate: r.scheduled_date || r.scheduledDate,
    completedDate: r.completed_date || r.completedDate,
  });

  return (
    <DashboardLayout title="유지보수 관리" subtitle={`총 ${records.length}건 | 진행 중 ${counts.in_progress || 0}건`}>
      {/* Status Pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', ...Object.keys(STATUS_CONFIG)] as string[]).map(status => {
          const conf = status === 'all' ? null : STATUS_CONFIG[status as MaintenanceStatus];
          const Icon = conf?.icon;
          const count = status === 'all' ? records.length : (counts[status] || 0);
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all',
                statusFilter === status
                  ? conf ? `${conf.bg} ${conf.color}` : 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
              {conf?.label || '전체'}
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-white/60 font-bold">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5 flex-wrap">
        <div className="relative flex-1 min-w-0 sm:min-w-48">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="제목, 장비명, 업체명 검색..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'preventive', 'corrective', 'emergency', 'inspection'] as const).map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={cn('px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', typeFilter === type ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200')}
            >
              {type === 'all' ? '전체' : TYPE_CONFIG[type].label}
            </button>
          ))}
        </div>
        <button onClick={load} className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">작업 등록</span><span className="sm:hidden">등록</span>
        </button>
      </div>

      <AddMaintenanceModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={load}
      />

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Cards */}
          <div className="space-y-2 sm:space-y-3">
            {records.map(record => {
              const statusConf = STATUS_CONFIG[record.status] || STATUS_CONFIG.scheduled;
              const typeConf = TYPE_CONFIG[record.type] || { label: record.type, color: 'text-slate-600' };
              const StatusIcon = statusConf.icon;
              const n = norm(record);
              const isExpanded = expandedId === record.id;
              return (
                <div key={record.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-sm transition-all">
                  {/* 카드 헤더 - 클릭으로 펼치기 */}
                  <div
                    className="flex items-start gap-3 sm:gap-4 p-3 sm:p-5 cursor-pointer group"
                    onClick={() => setExpandedId(isExpanded ? null : record.id)}
                  >
                    <div className={cn('w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0', statusConf.bg)}>
                      <StatusIcon className={cn('w-4 h-4 sm:w-5 sm:h-5', statusConf.color)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <h3 className="font-semibold text-slate-800 text-sm sm:text-base group-hover:text-blue-700 transition-colors">
                              {record.title}
                            </h3>
                            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', statusConf.bg, statusConf.color)}>
                              {statusConf.label}
                            </span>
                            <span className={cn('text-xs font-semibold', typeConf.color)}>
                              [{typeConf.label}]
                            </span>
                          </div>
                          {record.description && (
                            <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-1">{record.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {record.cost && (
                            <div className="text-right hidden sm:block">
                              <div className="text-xs text-slate-400">비용</div>
                              <div className="font-bold text-slate-800 text-sm">{record.cost.toLocaleString('ko-KR')}원</div>
                            </div>
                          )}
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-2 sm:gap-4 text-xs text-slate-500 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Wrench className="w-3 h-3 text-slate-400" />
                          <span className="font-medium text-slate-600 truncate max-w-[100px] sm:max-w-none">{n.equipmentName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[100px] sm:max-w-none">{n.companyName}</span>
                        </div>
                        {record.technician && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{record.technician}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            {n.completedDate
                              ? `완료: ${formatDate(n.completedDate)}`
                              : n.scheduledDate ? `예정: ${formatDate(n.scheduledDate)}` : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 펼침 상세 */}
                  {isExpanded && (
                    <div className="px-4 pb-4 sm:px-6 sm:pb-5 border-t border-slate-100 bg-slate-50/60">
                      <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-slate-400 mb-1">작업 설명</div>
                          <div className="text-slate-700">{record.description || '설명 없음'}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {record.cost && (
                            <div>
                              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" />비용</div>
                              <div className="font-semibold text-slate-800">{record.cost.toLocaleString('ko-KR')}원</div>
                            </div>
                          )}
                          {n.completedDate && (
                            <div>
                              <div className="text-xs text-slate-400 mb-1">완료일</div>
                              <div className="text-slate-700">{formatDate(n.completedDate)}</div>
                            </div>
                          )}
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-3 pt-1">
                          {n.equipmentName !== '-' && (
                            <Link
                              href={`/equipment`}
                              className="text-xs text-blue-600 hover:underline font-medium"
                              onClick={e => e.stopPropagation()}
                            >
                              장비 상세 보기 →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {records.length === 0 && (
            <div className="py-20 text-center text-slate-400">
              <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <div className="font-medium mb-1">등록된 유지보수 기록이 없습니다</div>
              <div className="text-sm">작업 등록 버튼을 눌러 첫 번째 기록을 추가하세요</div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
