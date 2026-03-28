'use client';

import { useState } from 'react';
import { X, Check, Package, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { consumablesApi } from '@/lib/api';

const CATEGORIES = [
  { value: 'filter', label: '필터류', icon: '🫧', examples: '세디먼트, 활성탄, RO멤브레인, UV램프' },
  { value: 'membrane', label: '멤브레인', icon: '💧', examples: 'RO멤브레인, NF멤브레인' },
  { value: 'chemical', label: '약품류', icon: '🧪', examples: '스케일억제제, 살균제, 세정제' },
  { value: 'pump', label: '펌프/밸브', icon: '⚙️', examples: '부스터펌프, 솔레노이드밸브' },
  { value: 'sensor', label: '센서류', icon: '📡', examples: 'TDS미터, 압력센서, 유량계' },
  { value: 'other', label: '기타', icon: '📦', examples: '연결부품, 튜빙, 기타' },
];

const UNITS = ['ea', '개', 'L', 'kg', 'g', 'm', '박스', '세트', '롤', '포'];

interface InventoryForm {
  name: string;
  category: string;
  partNo: string;
  brand: string;
  unit: string;
  stockQty: string;
  minQty: string;
  unitCost: string;
  supplier: string;
  description: string;
}

const INITIAL: InventoryForm = {
  name: '', category: '', partNo: '', brand: '',
  unit: 'ea', stockQty: '', minQty: '', unitCost: '',
  supplier: '', description: '',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd?: (data: InventoryForm) => void;
  onSuccess?: () => void;
}

export default function AddInventoryModal({ open, onClose, onAdd, onSuccess }: Props) {
  const [form, setForm] = useState<InventoryForm>(INITIAL);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof InventoryForm, string>>>({});

  if (!open) return null;

  const update = (field: keyof InventoryForm, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
  };

  const validate = () => {
    const e: Partial<Record<keyof InventoryForm, string>> = {};
    if (!form.name.trim()) e.name = '품목명을 입력하세요';
    if (!form.category) e.category = '분류를 선택하세요';
    if (!form.stockQty || Number(form.stockQty) < 0) e.stockQty = '재고 수량을 입력하세요';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      await consumablesApi.create({
        name: form.name,
        category: form.category,
        part_no: form.partNo || undefined,
        brand: form.brand || undefined,
        unit: form.unit || 'ea',
        stock_qty: form.stockQty ? Number(form.stockQty) : 0,
        min_qty: form.minQty ? Number(form.minQty) : 0,
        unit_cost: form.unitCost ? Number(form.unitCost) : undefined,
        supplier: form.supplier || undefined,
        description: form.description || undefined,
      });
      setSaved(true);
      onAdd?.(form);
      onSuccess?.();
      setTimeout(() => { setSaved(false); setForm(INITIAL); onClose(); }, 1800);
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : '등록 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const isLow = form.stockQty && form.minQty && Number(form.stockQty) <= Number(form.minQty);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">품목 등록</h2>
              <p className="text-xs text-slate-400">소모품/재고 품목을 등록합니다</p>
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
              <p className="font-bold text-slate-800">{form.name}</p>
              <p className="text-sm text-slate-400">재고 {form.stockQty} {form.unit} 등록 완료</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* 분류 선택 */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">
                  품목 분류<span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => update('category', cat.value)}
                      className={cn(
                        'p-2.5 rounded-xl border text-left transition-all',
                        form.category === cat.value
                          ? 'border-purple-400 bg-purple-50 text-purple-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      )}
                    >
                      <div className="text-lg">{cat.icon}</div>
                      <div className="text-xs font-semibold mt-1">{cat.label}</div>
                    </button>
                  ))}
                </div>
                {form.category && (
                  <p className="text-xs text-slate-400 mt-1.5">
                    예: {CATEGORIES.find(c => c.value === form.category)?.examples}
                  </p>
                )}
                {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
              </div>

              {/* 품목 정보 */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    품목명<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
                    placeholder="예: 5미크론 세디먼트 필터"
                    className={cn('w-full bg-slate-50 text-sm px-3 py-2 rounded-lg border focus:outline-none focus:border-purple-500',
                      errors.name ? 'border-red-400' : 'border-slate-200')} />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">파트 번호</label>
                    <input type="text" value={form.partNo} onChange={e => update('partNo', e.target.value)}
                      placeholder="WN-SF-005"
                      className="w-full bg-slate-50 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">브랜드/제조사</label>
                    <input type="text" value={form.brand} onChange={e => update('brand', e.target.value)}
                      placeholder="워터닉스, Toray 등"
                      className="w-full bg-slate-50 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-purple-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">공급업체</label>
                  <input type="text" value={form.supplier} onChange={e => update('supplier', e.target.value)}
                    placeholder="공급업체명"
                    className="w-full bg-slate-50 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-purple-500" />
                </div>
              </div>

              {/* 재고 및 단가 */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">재고 및 단가</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">단위</label>
                    <select value={form.unit} onChange={e => update('unit', e.target.value)}
                      className="w-full bg-slate-50 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-purple-500">
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      현재 재고<span className="text-red-500">*</span>
                    </label>
                    <input type="number" min="0" value={form.stockQty} onChange={e => update('stockQty', e.target.value)}
                      placeholder="0"
                      className={cn('w-full bg-slate-50 text-sm px-3 py-2 rounded-lg border focus:outline-none focus:border-purple-500',
                        errors.stockQty ? 'border-red-400' : 'border-slate-200')} />
                    {errors.stockQty && <p className="text-xs text-red-500 mt-1">{errors.stockQty}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">최소 재고 (발주점)</label>
                    <input type="number" min="0" value={form.minQty} onChange={e => update('minQty', e.target.value)}
                      placeholder="5"
                      className="w-full bg-slate-50 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">단가 (원)</label>
                    <input type="number" min="0" step="100" value={form.unitCost} onChange={e => update('unitCost', e.target.value)}
                      placeholder="15000"
                      className="w-full bg-slate-50 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-purple-500" />
                  </div>
                </div>
                {isLow && (
                  <div className="mt-2 flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-600">입력한 재고가 최소 재고량 이하입니다. 발주 검토가 필요합니다.</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">비고</label>
                <textarea rows={2} value={form.description} onChange={e => update('description', e.target.value)}
                  placeholder="보관 위치, 특이사항..."
                  className="w-full bg-slate-50 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-purple-500 resize-none" />
              </div>
            </div>
          )}
        </div>

        {!saved && (
          <div className="flex flex-col gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
            {apiError && <p className="text-xs text-red-500 text-right">{apiError}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">취소</button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {loading ? '등록 중...' : '품목 등록'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
