'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
  X,
  Check,
  AlertCircle,
  Box,
  Settings2,
  Loader2,
  Upload,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import {
  equipmentCatalogApi,
  consumableCatalogApi,
  uploadApi,
  EquipmentCatalogItem,
  ConsumableCatalogItem,
} from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';

const EQUIPMENT_TYPES = [
  { value: '', label: '전체 유형' },
  { value: 'ro', label: '역삼투압 (WRO)' },
  { value: 'cooling', label: '냉각수 스케일제거 (DCRO)' },
  { value: 'di', label: '초순수/DI (WDI)' },
  { value: 'seawater', label: '해수담수화 (WSRO)' },
  { value: 'uf', label: '양액회수·재생 (WUF)' },
  { value: 'small', label: '소형 시스템' },
  { value: 'uv', label: 'UV살균 (WUV)' },
  { value: 'softener', label: '연수 (WSF)' },
  { value: 'prefilter', label: '전처리 필터' },
  { value: 'booster', label: '부스터펌프' },
];

const CONSUMABLE_CATEGORIES = [
  { value: '', label: '전체 분류' },
  { value: 'filter', label: '필터' },
  { value: 'membrane', label: '멤브레인' },
  { value: 'chemical', label: '약품' },
  { value: 'pump', label: '펌프/부품' },
  { value: 'sensor', label: '센서' },
  { value: 'other', label: '기타' },
];

function formatPrice(val?: number) {
  if (!val) return '-';
  return val.toLocaleString('ko-KR') + '원';
}

// ─────────────────────────────────────────────────────────────────
// 장비 카탈로그 모달
// ─────────────────────────────────────────────────────────────────
interface EqModalProps {
  item?: EquipmentCatalogItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function EquipmentCatalogModal({ item, onClose, onSaved }: EqModalProps) {
  const isNew = !item;
  const [form, setForm] = useState<Partial<EquipmentCatalogItem>>(
    item || {
      model_code: '',
      model_name: '',
      equipment_type: 'ro',
      series: '',
      category: '',
      description: '',
      warranty_months: 12,
      sell_price: undefined,
      cost_price: undefined,
      lead_time_days: 30,
      is_active: true,
      sort_order: 0,
      specs: {},
      default_consumables: [],
    },
  );
  const [specsText, setSpecsText] = useState(
    JSON.stringify(item?.specs || {}, null, 2),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const result = await uploadApi.uploadImage(file, 'catalog');
      setForm((prev) => ({ ...prev, image_url: result.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 업로드 실패');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.model_code || !form.model_name || !form.equipment_type) {
      setError('모델 코드, 제품명, 유형은 필수입니다');
      return;
    }
    let specs: Record<string, unknown> = {};
    try {
      specs = JSON.parse(specsText || '{}');
    } catch {
      setError('사양(specs) JSON 형식이 올바르지 않습니다');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isNew) {
        await equipmentCatalogApi.create({ ...form, specs });
      } else {
        await equipmentCatalogApi.update(item!.id, { ...form, specs });
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-slate-800">
            {isNew ? '신규 제품 등록' : '제품 정보 수정'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                모델 코드 <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.model_code || ''}
                onChange={(e) => setForm({ ...form, model_code: e.target.value })}
                placeholder="예: DCRO-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                장비 유형 <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.equipment_type || ''}
                onChange={(e) => setForm({ ...form, equipment_type: e.target.value })}
              >
                {EQUIPMENT_TYPES.filter((t) => t.value).map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              제품명 <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.model_name || ''}
              onChange={(e) => setForm({ ...form, model_name: e.target.value })}
              placeholder="예: 냉각수 스케일제거 시스템 500L/h"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">시리즈</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.series || ''}
                onChange={(e) => setForm({ ...form, series: e.target.value })}
                placeholder="예: DCRO"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">분류</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.category || ''}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="예: 냉각수처리"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">판매가 (원)</label>
              <input
                type="number"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.sell_price ?? ''}
                onChange={(e) => setForm({ ...form, sell_price: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">원가 (원)</label>
              <input
                type="number"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.cost_price ?? ''}
                onChange={(e) => setForm({ ...form, cost_price: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">보증 (월)</label>
              <input
                type="number"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.warranty_months ?? 12}
                onChange={(e) => setForm({ ...form, warranty_months: Number(e.target.value) })}
              />
            </div>
          </div>
          {/* 이미지 업로드 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">제품 이미지</label>
            <div className="flex items-start gap-3">
              <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg overflow-hidden flex items-center justify-center bg-slate-50 flex-shrink-0">
                {form.image_url ? (
                  <img src={form.image_url} alt="제품이미지" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={28} className="text-slate-300" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading}
                  className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-60"
                >
                  {imageUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {imageUploading ? '업로드 중...' : '이미지 선택'}
                </button>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.image_url || ''}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="또는 이미지 URL 직접 입력"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">제품 설명</label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="제품 특징 및 용도를 입력하세요"
            />
          </div>
          {/* 물리적 제원 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">외형 크기 (L×W×H)</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.dimensions || ''}
                onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
                placeholder="예: 600×400×900mm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">무게 (kg)</label>
              <input
                type="number"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.weight_kg ?? ''}
                onChange={(e) => setForm({ ...form, weight_kg: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">전원</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.power_supply || ''}
                onChange={(e) => setForm({ ...form, power_supply: e.target.value })}
                placeholder="예: 220V 60Hz"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">제거율</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.removal_rate || ''}
                onChange={(e) => setForm({ ...form, removal_rate: e.target.value })}
                placeholder="예: 99.5% (염분)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">시간 유량 (L/h)</label>
              <input
                type="number"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.flow_rate_lph ?? ''}
                onChange={(e) => setForm({ ...form, flow_rate_lph: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">1일 처리량 (m³)</label>
              <input
                type="number"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.daily_volume_m3 ?? ''}
                onChange={(e) => setForm({ ...form, daily_volume_m3: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              사양 (JSON)
            </label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              value={specsText}
              onChange={(e) => setSpecsText(e.target.value)}
              placeholder='{"capacity_lph": 500, "voltage": "220V"}'
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active ?? true}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 accent-blue-600"
            />
            <label htmlFor="is_active" className="text-sm text-slate-700">활성 (판매 가능)</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {isNew ? '등록' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 소모품 카탈로그 모달
// ─────────────────────────────────────────────────────────────────
interface ConsModalProps {
  item?: ConsumableCatalogItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function ConsumableCatalogModal({ item, onClose, onSaved }: ConsModalProps) {
  const isNew = !item;
  const [form, setForm] = useState<Partial<ConsumableCatalogItem>>(
    item || {
      part_no: '',
      name: '',
      category: 'filter',
      equipment_type: '',
      unit: '개',
      replace_interval_hours: undefined,
      sell_price: undefined,
      cost_price: undefined,
      min_order_qty: 1,
      supplier: '',
      description: '',
      is_active: true,
    },
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.part_no || !form.name) {
      setError('부품번호와 품목명은 필수입니다');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isNew) {
        await consumableCatalogApi.create(form);
      } else {
        await consumableCatalogApi.update(item!.id, form);
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-slate-800">
            {isNew ? '소모품 신규 등록' : '소모품 정보 수정'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                부품번호 <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.part_no || ''}
                onChange={(e) => setForm({ ...form, part_no: e.target.value })}
                placeholder="예: DCRO-SD-5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">분류</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.category || ''}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CONSUMABLE_CATEGORIES.filter((c) => c.value).map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              품목명 <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="예: 세디먼트 필터 5㎛"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">호환 장비 유형</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.equipment_type || ''}
                onChange={(e) => setForm({ ...form, equipment_type: e.target.value })}
              >
                {EQUIPMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">단위</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.unit || '개'}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">판매가 (원)</label>
              <input
                type="number"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.sell_price ?? ''}
                onChange={(e) => setForm({ ...form, sell_price: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">원가 (원)</label>
              <input
                type="number"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.cost_price ?? ''}
                onChange={(e) => setForm({ ...form, cost_price: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">교체 주기(시간)</label>
              <input
                type="number"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.replace_interval_hours ?? ''}
                onChange={(e) => setForm({ ...form, replace_interval_hours: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">공급업체</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.supplier || ''}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                placeholder="공급업체명"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">최소 주문수량</label>
              <input
                type="number"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.min_order_qty ?? 1}
                onChange={(e) => setForm({ ...form, min_order_qty: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">설명</label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cons_active"
              checked={form.is_active ?? true}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4 accent-blue-600"
            />
            <label htmlFor="cons_active" className="text-sm text-slate-700">활성 (판매/사용 가능)</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {isNew ? '등록' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 메인 페이지
// ─────────────────────────────────────────────────────────────────
export default function CatalogPage() {
  const [tab, setTab] = useState<'equipment' | 'consumable'>('equipment');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Equipment Catalog
  const [eqItems, setEqItems] = useState<EquipmentCatalogItem[]>([]);
  const [eqLoading, setEqLoading] = useState(false);
  const [eqModal, setEqModal] = useState<{ open: boolean; item?: EquipmentCatalogItem | null }>({ open: false });

  // Consumable Catalog
  const [consItems, setConsItems] = useState<ConsumableCatalogItem[]>([]);
  const [consLoading, setConsLoading] = useState(false);
  const [consModal, setConsModal] = useState<{ open: boolean; item?: ConsumableCatalogItem | null }>({ open: false });

  const [seeding, setSeeding] = useState(false);
  const [expandedEq, setExpandedEq] = useState<string | null>(null);

  const loadEquipment = useCallback(async () => {
    setEqLoading(true);
    try {
      const params: Record<string, string> = { active_only: 'false' };
      if (filterType) params.equipment_type = filterType;
      const data = await equipmentCatalogApi.list(params);
      setEqItems(data);
    } catch {
      setEqItems([]);
    } finally {
      setEqLoading(false);
    }
  }, [filterType]);

  const loadConsumables = useCallback(async () => {
    setConsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterCategory) params.category = filterCategory;
      if (filterType) params.equipment_type = filterType;
      const data = await consumableCatalogApi.list(params);
      setConsItems(data);
    } catch {
      setConsItems([]);
    } finally {
      setConsLoading(false);
    }
  }, [filterCategory, filterType]);

  useEffect(() => {
    if (tab === 'equipment') loadEquipment();
    else loadConsumables();
  }, [tab, loadEquipment, loadConsumables]);

  const handleSeedEquipment = async () => {
    setSeeding(true);
    try {
      const r = await equipmentCatalogApi.seed();
      alert(`워터닉스 기본 제품 ${r.inserted}개가 등록되었습니다 (전체: ${r.total}개)`);
      loadEquipment();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '초기 데이터 로드 실패');
    } finally {
      setSeeding(false);
    }
  };

  const handleSeedConsumables = async () => {
    setSeeding(true);
    try {
      const r = await consumableCatalogApi.seed();
      alert(`소모품 ${r.inserted}개가 등록되었습니다 (건너뜀: ${r.skipped}개)`);
      loadConsumables();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '초기 데이터 로드 실패');
    } finally {
      setSeeding(false);
    }
  };

  const handleDeleteEq = async (id: string, name: string) => {
    if (!confirm(`'${name}'을(를) 비활성 처리하시겠습니까?`)) return;
    try {
      await equipmentCatalogApi.delete(id);
      loadEquipment();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  const handleDeleteCons = async (id: string, name: string) => {
    if (!confirm(`'${name}'을(를) 비활성 처리하시겠습니까?`)) return;
    try {
      await consumableCatalogApi.delete(id);
      loadConsumables();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  const filteredEq = eqItems.filter(
    (e) =>
      !search ||
      e.model_code.toLowerCase().includes(search.toLowerCase()) ||
      e.model_name.toLowerCase().includes(search.toLowerCase()),
  );

  const filteredCons = consItems.filter(
    (c) =>
      !search ||
      c.part_no.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <DashboardLayout title="카탈로그 관리" subtitle="워터닉스 자사 제품 및 소모품을 등록·관리합니다">
    <div className="space-y-6">
      {/* 액션 버튼 */}
      <div className="flex items-center justify-end flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {tab === 'equipment' ? (
            <>
              <button
                onClick={handleSeedEquipment}
                disabled={seeding}
                className="flex items-center gap-2 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
              >
                {seeding ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                기본 데이터 로드
              </button>
              <button
                onClick={() => setEqModal({ open: true, item: null })}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <Plus size={14} /> 제품 등록
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSeedConsumables}
                disabled={seeding}
                className="flex items-center gap-2 px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
              >
                {seeding ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                기본 데이터 로드
              </button>
              <button
                onClick={() => setConsModal({ open: true, item: null })}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                <Plus size={14} /> 소모품 등록
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => { setTab('equipment'); setSearch(''); setFilterType(''); setFilterCategory(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'equipment' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Box size={16} /> 장비 카탈로그
        </button>
        <button
          onClick={() => { setTab('consumable'); setSearch(''); setFilterType(''); setFilterCategory(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'consumable' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <Package size={16} /> 소모품 카탈로그
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={tab === 'equipment' ? '모델코드, 제품명 검색' : '부품번호, 품목명 검색'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {tab === 'equipment' ? (
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            {EQUIPMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        ) : (
          <>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              {CONSUMABLE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              {EQUIPMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </>
        )}
        <button
          onClick={() => tab === 'equipment' ? loadEquipment() : loadConsumables()}
          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw size={16} className="text-slate-500" />
        </button>
      </div>

      {/* Equipment Catalog Table */}
      {tab === 'equipment' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {eqLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : filteredEq.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Box size={48} className="mx-auto mb-3 opacity-30" />
              <p>등록된 장비 제품이 없습니다</p>
              <p className="text-sm mt-1">위의 &quot;기본 데이터 로드&quot; 버튼으로 워터닉스 기본 제품을 등록하세요</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 w-8"></th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">모델 코드</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">제품명</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">유형</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">시리즈</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">판매가</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">보증</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">상태</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEq.map((item) => (
                    <>
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedEq(expandedEq === item.id ? null : item.id)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            {expandedEq === item.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-blue-700">{item.model_code}</td>
                        <td className="px-4 py-3 text-slate-800">{item.model_name}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                            {EQUIPMENT_TYPES.find((t) => t.value === item.equipment_type)?.label || item.equipment_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{item.series || '-'}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatPrice(item.sell_price)}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{item.warranty_months}개월</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {item.is_active ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setEqModal({ open: true, item })}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteEq(item.id, item.model_name)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedEq === item.id && (
                        <tr key={`${item.id}-detail`} className="bg-slate-50">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
                              {/* 제품 이미지 */}
                              <div>
                                <p className="font-semibold text-slate-600 mb-2">제품 이미지</p>
                                {item.image_url ? (
                                  <img src={item.image_url} alt={item.model_name} className="w-full max-w-[180px] h-[130px] object-contain rounded-lg border border-slate-200 bg-white p-2" />
                                ) : (
                                  <div className="w-full max-w-[180px] h-[130px] border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-white">
                                    <ImageIcon size={32} className="text-slate-300" />
                                  </div>
                                )}
                                {item.catalog_page_url && (
                                  <a href={item.catalog_page_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline">
                                    <ExternalLink size={12} /> 카탈로그 보기
                                  </a>
                                )}
                              </div>
                              {/* 물리 제원 */}
                              <div>
                                <p className="font-semibold text-slate-600 mb-2">물리 제원</p>
                                <ul className="space-y-1 text-slate-600">
                                  {item.dimensions && <li><span className="text-slate-400">외형:</span> {item.dimensions}</li>}
                                  {item.weight_kg && <li><span className="text-slate-400">무게:</span> {item.weight_kg}kg</li>}
                                  {item.power_supply && <li><span className="text-slate-400">전원:</span> {item.power_supply}</li>}
                                  {item.removal_rate && <li><span className="text-slate-400">제거율:</span> {item.removal_rate}</li>}
                                  {item.flow_rate_lph && <li><span className="text-slate-400">시간유량:</span> {item.flow_rate_lph.toLocaleString()}L/h</li>}
                                  {item.daily_volume_m3 && <li><span className="text-slate-400">일처리량:</span> {item.daily_volume_m3}m³/d</li>}
                                </ul>
                              </div>
                              <div>
                                <p className="font-semibold text-slate-600 mb-2">상세 사양</p>
                                {item.specs && Object.keys(item.specs).length > 0 ? (
                                  <ul className="space-y-1">
                                    {Object.entries(item.specs).map(([k, v]) => (
                                      <li key={k} className="flex gap-2 text-slate-600">
                                        <span className="font-medium text-slate-500">{k}:</span>
                                        <span>{String(v)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : <span className="text-slate-400">-</span>}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-600 mb-2">기본 소모품</p>
                                {item.default_consumables && item.default_consumables.length > 0 ? (
                                  <ul className="space-y-1">
                                    {item.default_consumables.map((c, i) => (
                                      <li key={i} className="text-slate-600">
                                        <span className="font-mono text-blue-600">{c.part_no}</span>
                                        {' · '}{c.name}
                                        {c.interval_days && <span className="text-slate-400 ml-1">({c.interval_days}일 주기)</span>}
                                      </li>
                                    ))}
                                  </ul>
                                ) : <span className="text-slate-400">-</span>}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-600 mb-2">원가 정보</p>
                                <p className="text-slate-600">판매가: {formatPrice(item.sell_price)}</p>
                                <p className="text-slate-600">원가: {formatPrice(item.cost_price)}</p>
                                <p className="text-slate-600">납기: {item.lead_time_days}일</p>
                                <p className="text-slate-600">{item.description || ''}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 py-3 border-t border-slate-100 text-sm text-slate-500 bg-slate-50">
            총 {filteredEq.length}개 제품
          </div>
        </div>
      )}

      {/* Consumable Catalog Table */}
      {tab === 'consumable' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {consLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : filteredCons.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Package size={48} className="mx-auto mb-3 opacity-30" />
              <p>등록된 소모품이 없습니다</p>
              <p className="text-sm mt-1">위의 &quot;기본 데이터 로드&quot; 버튼으로 기본 소모품을 등록하세요</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">부품번호</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">품목명</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">분류</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">호환 유형</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">판매가</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">교체주기</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">상태</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCons.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-blue-700">{item.part_no}</td>
                      <td className="px-4 py-3 text-slate-800">{item.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                          {CONSUMABLE_CATEGORIES.find((c) => c.value === item.category)?.label || item.category || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {EQUIPMENT_TYPES.find((t) => t.value === item.equipment_type)?.label || item.equipment_type || '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatPrice(item.sell_price)}</td>
                      <td className="px-4 py-3 text-center text-slate-600">
                        {item.replace_interval_hours ? `${item.replace_interval_hours}h` : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {item.is_active ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setConsModal({ open: true, item })}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCons(item.id, item.name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 py-3 border-t border-slate-100 text-sm text-slate-500 bg-slate-50">
            총 {filteredCons.length}개 소모품
          </div>
        </div>
      )}

      {/* Modals */}
      {eqModal.open && (
        <EquipmentCatalogModal
          item={eqModal.item}
          onClose={() => setEqModal({ open: false })}
          onSaved={loadEquipment}
        />
      )}
      {consModal.open && (
        <ConsumableCatalogModal
          item={consModal.item}
          onClose={() => setConsModal({ open: false })}
          onSaved={loadConsumables}
        />
      )}
    </div>
    </DashboardLayout>
  );
}
