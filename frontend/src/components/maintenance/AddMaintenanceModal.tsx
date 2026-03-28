'use client';

import { useState } from 'react';
import { X, Check, Wrench, Calendar, User, Cpu } from 'lucide-react';
import { mockEquipment, mockCompanies } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { MaintenanceType } from '@/types';

const TYPE_OPTIONS: { value: MaintenanceType; label: string; desc: string; color: string }[] = [
  { value: 'preventive', label: '예방점검', desc: '정기 예방 점검 및 소모품 교체', color: 'border-blue-400 bg-blue-50 text-blue-700' },
  { value: 'corrective', label: '수리', desc: '고장 수리 및 부품 교체', color: 'border-red-400 bg-red-50 text-red-700' },
  { value: 'emergency', label: '긴급출동', desc: '긴급 장애 대응', color: 'border-orange-400 bg-orange-50 text-orange-700' },
  { value: 'inspection', label: '정기점검', desc: '계약 기반 정기 점검', color: 'border-slate-400 bg-slate-50 text-slate-700' },
];

const TECHNICIANS = ['김기술', '이엔지', '박수리', '최점검', '정유지', '외부 업체'];

interface MaintenanceForm {
  companyId: string;
  equipmentId: string;
  type: MaintenanceType | '';
  title: string;
  description: string;
  technician: string;
  scheduledDate: string;
  estimatedHours: string;
  cost: string;
  partsUsed: string;
}

const INITIAL: MaintenanceForm = {
  companyId: '', equipmentId: '', type: '', title: '', description: '',
  technician: '', scheduledDate: new Date().toISOString().split('T')[0],
  estimatedHours: '', cost: '', partsUsed: '',
};

interface Props {
  open: boolean;
  onClose: () => void;
  presetEquipmentId?: string;
  onAdd?: (data: MaintenanceForm) => void;
}

export default function AddMaintenanceModal({ open, onClose, presetEquipmentId, onAdd }: Props) {
  const [form, setForm] = useState<MaintenanceForm>({
    ...INITIAL,
    equipmentId: presetEquipmentId || '',
    companyId: presetEquipmentId
      ? mockEquipment.find(e => e.id === presetEquipmentId)?.companyId || ''
      : '',
  });
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof MaintenanceForm, string>>>({});

  if (!open) return null;

  const update = (field: keyof MaintenanceForm, value: string) => {
    setForm(f => {
      const next = { ...f, [field]: value };
      if (field === 'companyId') next.equipmentId = '';
      return next;
    });
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
  };

  const companyEquipment = mockEquipment.filter(e =>
    !form.companyId || e.companyId === form.companyId
  );

  const validate = () => {
    const e: Partial<Record<keyof MaintenanceForm, string>> = {};
    if (!form.type) e.type = '작업 유형을 선택하세요';
    if (!form.equipmentId) e.equipmentId = '장비를 선택하세요';
    if (!form.title.trim()) e.title = '작업 제목을 입력하세요';
    if (!form.technician) e.technician = '담당 기술자를 선택하세요';
    if (!form.scheduledDate) e.scheduledDate = '예정일을 선택하세요';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setSaved(true);
    onAdd?.(form);
    setTimeout(() => { setSaved(false); setForm(INITIAL); onClose(); }, 1800);
  };

  const selectedEquipment = mockEquipment.find(e => e.id === form.equipmentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
              <Wrench className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">작업 등록</h2>
              <p className="text-xs text-slate-400">유지보수 작업을 등록합니다</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {saved ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="font-bold text-slate-800">작업이 등록되었습니다</p>
              <p className="text-sm text-slate-400">{form.title}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* 작업 유형 */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">
                  작업 유형<span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map(t => (
                    <button
                      key={t.value}
                      onClick={() => update('type', t.value)}
                      className={cn(
                        'p-3 rounded-xl border-2 text-left transition-all',
                        form.type === t.value ? t.color + ' border-current' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      )}
                    >
                      <div className="font-semibold text-sm">{t.label}</div>
                      <div className="text-xs opacity-70 mt-0.5">{t.desc}</div>
                    </button>
                  ))}
                </div>
                {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
              </div>

              {/* 장비 선택 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="w-4 h-4 text-blue-500" />
                  <label className="text-xs font-semibold text-slate-500">
                    대상 장비<span className="text-red-500 ml-0.5">*</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">업체 필터</label>
                    <select value={form.companyId} onChange={e => update('companyId', e.target.value)}
                      className="w-full bg-slate-50 text-slate-900 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500">
                      <option value="">전체 업체</option>
                      {mockCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">장비 선택 *</label>
                    <select value={form.equipmentId} onChange={e => update('equipmentId', e.target.value)}
                      className={cn(
                        'w-full bg-slate-50 text-slate-900 text-sm px-3 py-2 rounded-lg border focus:outline-none focus:border-blue-500',
                        errors.equipmentId ? 'border-red-400' : 'border-slate-200'
                      )}>
                      <option value="">선택</option>
                      {companyEquipment.map(e => (
                        <option key={e.id} value={e.id}>{e.name || e.model} ({e.serialNo})</option>
                      ))}
                    </select>
                  </div>
                </div>
                {selectedEquipment && (
                  <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                    📍 {selectedEquipment.city} {selectedEquipment.district} · {selectedEquipment.companyName}
                  </div>
                )}
                {errors.equipmentId && <p className="text-xs text-red-500 mt-1">{errors.equipmentId}</p>}
              </div>

              {/* 작업 정보 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="w-4 h-4 text-amber-500" />
                  <label className="text-xs font-semibold text-slate-500">작업 내용</label>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">작업 제목<span className="text-red-500">*</span></label>
                    <input type="text" value={form.title} onChange={e => update('title', e.target.value)}
                      placeholder="예: 1분기 정기점검 및 필터 교체"
                      className={cn('w-full bg-slate-50 text-slate-900 text-sm px-3 py-2 rounded-lg border focus:outline-none focus:border-blue-500',
                        errors.title ? 'border-red-400' : 'border-slate-200')} />
                    {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">상세 내용</label>
                    <textarea rows={2} value={form.description} onChange={e => update('description', e.target.value)}
                      placeholder="작업 세부 내용, 이슈 사항 등..."
                      className="w-full bg-slate-50 text-slate-900 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">교체 부품/소모품</label>
                    <input type="text" value={form.partsUsed} onChange={e => update('partsUsed', e.target.value)}
                      placeholder="예: 세디먼트 필터 1ea, RO 멤브레인 1ea"
                      className="w-full bg-slate-50 text-slate-900 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
              </div>

              {/* 일정 및 비용 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  <label className="text-xs font-semibold text-slate-500">일정 및 비용</label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">예정일<span className="text-red-500">*</span></label>
                    <input type="date" value={form.scheduledDate} onChange={e => update('scheduledDate', e.target.value)}
                      className={cn('w-full bg-slate-50 text-slate-900 text-sm px-3 py-2 rounded-lg border focus:outline-none focus:border-blue-500',
                        errors.scheduledDate ? 'border-red-400' : 'border-slate-200')} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">예상 소요 시간 (h)</label>
                    <input type="number" step="0.5" min="0.5" value={form.estimatedHours} onChange={e => update('estimatedHours', e.target.value)}
                      placeholder="예: 2.5"
                      className="w-full bg-slate-50 text-slate-900 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">예상 비용 (원)</label>
                    <input type="number" step="1000" value={form.cost} onChange={e => update('cost', e.target.value)}
                      placeholder="예: 150000"
                      className="w-full bg-slate-50 text-slate-900 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">담당 기술자<span className="text-red-500">*</span></label>
                    <select value={form.technician} onChange={e => update('technician', e.target.value)}
                      className={cn('w-full bg-slate-50 text-slate-900 text-sm px-3 py-2 rounded-lg border focus:outline-none focus:border-blue-500',
                        errors.technician ? 'border-red-400' : 'border-slate-200')}>
                      <option value="">선택</option>
                      {TECHNICIANS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {errors.technician && <p className="text-xs text-red-500 mt-1">{errors.technician}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {!saved && (
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">취소</button>
            <button onClick={handleSubmit}
              className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-all">
              <Check className="w-4 h-4" /> 작업 등록
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
