'use client';

import { useState } from 'react';
import { X, Check, Package, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { filtersApi } from '@/lib/api';

const FILTER_TYPES = [
  { value: 'sediment', label: '세디먼트 필터', icon: '🫧', life: 4380, unit: '시간', partPrefix: 'WN-SF' },
  { value: 'carbon', label: '활성탄 블록 필터', icon: '⬛', life: 4380, unit: '시간', partPrefix: 'WN-AC' },
  { value: 'ro_membrane', label: 'RO 멤브레인', icon: '💧', life: 26280, unit: '시간', partPrefix: 'WN-RM' },
  { value: 'uv', label: 'UV 램프', icon: '☀️', life: 8760, unit: '시간', partPrefix: 'WN-UV' },
  { value: 'resin', label: '이온교환수지', icon: '🔬', life: 17520, unit: '시간', partPrefix: 'WN-IX' },
  { value: 'antiscalant', label: '스케일 억제제', icon: '🧪', life: 0, unit: 'L', partPrefix: 'WN-AS' },
];

const SUPPLIERS = [
  '워터닉스(자사)', 'Toray', 'Filmtec/DuPont', 'Hydranautics', 'Purolite',
  'Lenntech', '동양이엔씨', 'Hydro Service', '기타',
];

interface ConsumableForm {
  filterType: string;
  filterName: string;
  stage: string;
  partNo: string;
  supplier: string;
  installDate: string;
  replaceDate: string;
  lifeHours: string;
  lifeVolume: string;
  cost: string;
  notes: string;
}

const INITIAL: ConsumableForm = {
  filterType: '', filterName: '', stage: '1', partNo: '',
  supplier: '워터닉스(자사)', installDate: new Date().toISOString().split('T')[0],
  replaceDate: '', lifeHours: '', lifeVolume: '', cost: '', notes: '',
};

interface Props {
  open: boolean;
  equipmentId: string;
  equipmentName: string;
  equipmentCompanyName?: string;
  onClose: () => void;
  onAdd?: (data: ConsumableForm) => void;
  onSuccess?: () => void;
}

export default function AddConsumableModal({ open, equipmentId, equipmentName, equipmentCompanyName, onClose, onAdd, onSuccess }: Props) {
  const [form, setForm] = useState<ConsumableForm>(INITIAL);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  if (!open) return null;

  const update = (field: keyof ConsumableForm, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const selectedType = FILTER_TYPES.find(t => t.value === form.filterType);

  const handleTypeSelect = (type: typeof FILTER_TYPES[0]) => {
    const replaceDate = (() => {
      if (!form.installDate || type.life === 0) return '';
      const d = new Date(form.installDate);
      d.setDate(d.getDate() + Math.floor(type.life / 24 * 1.5));
      return d.toISOString().split('T')[0];
    })();
    setForm(f => ({
      ...f,
      filterType: type.value,
      filterName: type.label,
      partNo: `${type.partPrefix}-${String(Math.floor(Math.random() * 900) + 100)}`,
      lifeHours: type.life > 0 ? String(type.life) : '',
      replaceDate,
    }));
  };

  const handleSubmit = async () => {
    if (!form.filterType || !form.installDate) return;
    setLoading(true);
    setApiError('');
    try {
      await filtersApi.create({
        equipment_id: equipmentId || undefined,
        equipment_name: equipmentName || undefined,
        company_name: equipmentCompanyName || undefined,
        filter_name: form.filterName,
        filter_type: form.filterType,
        stage: form.stage ? Number(form.stage) : undefined,
        part_no: form.partNo || undefined,
        supplier: form.supplier || undefined,
        install_date: form.installDate || undefined,
        replace_date: form.replaceDate || undefined,
        used_percent: 0,
        status: 'normal',
      });
      setSaved(true);
      onAdd?.(form);
      onSuccess?.();
      setTimeout(() => {
        setSaved(false);
        setForm(INITIAL);
        onClose();
      }, 1800);
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : '등록 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const isValid = form.filterType && form.installDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-teal-400" /> 소모품/필터 등록
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{equipmentName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[75vh]">
          {saved ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-14 h-14 rounded-full bg-teal-500/20 flex items-center justify-center">
                <Check className="w-7 h-7 text-teal-400" />
              </div>
              <p className="font-bold text-white">소모품이 등록되었습니다</p>
              <p className="text-sm text-slate-400">{form.filterName}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Type Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">소모품 유형 *</label>
                <div className="grid grid-cols-2 gap-2">
                  {FILTER_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => handleTypeSelect(t)}
                      className={cn(
                        'flex items-center gap-2 p-3 rounded-xl border text-left text-sm transition-all',
                        form.filterType === t.value
                          ? 'border-teal-500 bg-teal-500/10 text-teal-300'
                          : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500'
                      )}
                    >
                      <span className="text-xl">{t.icon}</span>
                      <div>
                        <div className="font-medium text-xs">{t.label}</div>
                        {t.life > 0 && <div className="text-xs text-slate-500">{t.life.toLocaleString()}h</div>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {form.filterType && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">소모품명</label>
                      <input type="text" value={form.filterName} onChange={e => update('filterName', e.target.value)}
                        className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-teal-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">단계 (Stage)</label>
                      <select value={form.stage} onChange={e => update('stage', e.target.value)}
                        className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-teal-500 focus:outline-none">
                        {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}단계</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">파트 번호</label>
                      <input type="text" value={form.partNo} onChange={e => update('partNo', e.target.value)}
                        className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-teal-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">공급업체</label>
                      <select value={form.supplier} onChange={e => update('supplier', e.target.value)}
                        className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-teal-500 focus:outline-none">
                        {SUPPLIERS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">설치일 *</label>
                      <input type="date" value={form.installDate} onChange={e => update('installDate', e.target.value)}
                        className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-teal-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">교체 예정일</label>
                      <input type="date" value={form.replaceDate} onChange={e => update('replaceDate', e.target.value)}
                        className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-teal-500 focus:outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">수명 (시간)</label>
                      <input type="number" placeholder="예: 4380" value={form.lifeHours} onChange={e => update('lifeHours', e.target.value)}
                        className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-teal-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">단가 (원)</label>
                      <input type="number" placeholder="예: 15000" value={form.cost} onChange={e => update('cost', e.target.value)}
                        className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-teal-500 focus:outline-none" />
                    </div>
                  </div>

                  {selectedType && selectedType.life > 0 && (
                    <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-300">
                        권장 교체 주기: <strong>{selectedType.life.toLocaleString()}시간</strong> 또는 교체 예정일 기준 자동 알림이 발송됩니다.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">비고</label>
                    <textarea rows={2} value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="특이사항..."
                      className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-teal-500 focus:outline-none resize-none" />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {!saved && (
          <div className="flex flex-col gap-2 px-5 py-4 border-t border-slate-800">
            {apiError && <p className="text-xs text-red-400 text-right">{apiError}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">취소</button>
              <button
                onClick={handleSubmit}
                disabled={!isValid || loading}
                className="flex items-center gap-2 px-5 py-2 bg-teal-500 hover:bg-teal-400 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {loading ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
