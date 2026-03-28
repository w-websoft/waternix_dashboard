'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { mockMaintenanceRecords } from '@/lib/mock-data';
import { cn, formatDate } from '@/lib/utils';
import { MaintenanceStatus, MaintenanceType } from '@/types';
import { Search, Plus, Wrench, Clock, CheckCircle2, XCircle, Calendar, User, Building2 } from 'lucide-react';
import AddMaintenanceModal from '@/components/maintenance/AddMaintenanceModal';

const STATUS_CONFIG: Record<MaintenanceStatus, { label: string; color: string; bg: string; icon: typeof Wrench }> = {
  scheduled:   { label: '예정',    color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',   icon: Calendar },
  in_progress: { label: '진행 중', color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',     icon: Clock },
  completed:   { label: '완료',    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  cancelled:   { label: '취소',    color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200',   icon: XCircle },
};

const TYPE_CONFIG: Record<MaintenanceType, { label: string; color: string }> = {
  preventive:  { label: '예방점검', color: 'text-blue-600' },
  corrective:  { label: '수리',    color: 'text-red-600' },
  emergency:   { label: '긴급',    color: 'text-red-700' },
  inspection:  { label: '정기점검', color: 'text-slate-600' },
};

export default function MaintenancePage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = mockMaintenanceRecords.filter(m => {
    const matchSearch = !search || [m.title, m.equipmentName, m.companyName, m.technician]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchType = typeFilter === 'all' || m.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const counts = mockMaintenanceRecords.reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <DashboardLayout title="유지보수 관리" subtitle={`총 ${mockMaintenanceRecords.length}건 | 진행 중 ${counts.in_progress || 0}건`}>
      {/* Status Pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', ...Object.keys(STATUS_CONFIG)] as string[]).map(status => {
          const conf = status === 'all' ? null : STATUS_CONFIG[status as MaintenanceStatus];
          const Icon = conf?.icon;
          const count = status === 'all' ? mockMaintenanceRecords.length : (counts[status] || 0);
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
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">작업 등록</span><span className="sm:hidden">등록</span>
        </button>
      </div>

      <AddMaintenanceModal open={showAddModal} onClose={() => setShowAddModal(false)} />

      {/* Cards */}
      <div className="space-y-2 sm:space-y-3">
        {filtered.map(record => {
          const statusConf = STATUS_CONFIG[record.status];
          const typeConf = TYPE_CONFIG[record.type];
          const StatusIcon = statusConf.icon;
          return (
            <div key={record.id} className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5 hover:shadow-sm transition-all cursor-pointer group">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={cn('w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0', statusConf.bg)}>
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
                        <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-1 sm:line-clamp-2">{record.description}</p>
                      )}
                    </div>
                    {record.cost && (
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-slate-400">비용</div>
                        <div className="font-bold text-slate-800 text-sm">{record.cost.toLocaleString('ko-KR')}원</div>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-4 text-xs text-slate-500 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Wrench className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-600 truncate max-w-[100px] sm:max-w-none">{record.equipmentName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
                      <span className="truncate max-w-[100px] sm:max-w-none">{record.companyName}</span>
                    </div>
                    {record.technician && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
                        <span>{record.technician}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
                      <span>{record.completedDate ? `완료: ${formatDate(record.completedDate)}` : `예정: ${formatDate(record.scheduledDate)}`}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center text-slate-400">
          <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <div>검색 결과가 없습니다</div>
        </div>
      )}
    </DashboardLayout>
  );
}
