'use client';

import { useState } from 'react';
import { X, Check, Building2, MapPin, Phone, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const CITIES = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

interface CompanyForm {
  name: string;
  businessNo: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  district: string;
  contractStart: string;
  contractEnd: string;
  notes: string;
}

const INITIAL: CompanyForm = {
  name: '', businessNo: '', contact: '', phone: '', email: '',
  address: '', city: '', district: '',
  contractStart: new Date().toISOString().split('T')[0],
  contractEnd: '', notes: '',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd?: (data: CompanyForm) => void;
}

export default function AddCompanyModal({ open, onClose, onAdd }: Props) {
  const [form, setForm] = useState<CompanyForm>(INITIAL);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyForm, string>>>({});

  if (!open) return null;

  const update = (field: keyof CompanyForm, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }));
  };

  const validate = () => {
    const e: Partial<Record<keyof CompanyForm, string>> = {};
    if (!form.name.trim()) e.name = '업체명을 입력하세요';
    if (!form.contact.trim()) e.contact = '담당자명을 입력하세요';
    if (!form.phone.trim()) e.phone = '연락처를 입력하세요';
    if (!form.city) e.city = '지역을 선택하세요';
    if (!form.address.trim()) e.address = '주소를 입력하세요';
    if (!form.contractEnd) e.contractEnd = '계약 만료일을 입력하세요';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setSaved(true);
    onAdd?.(form);
    setTimeout(() => { setSaved(false); setForm(INITIAL); onClose(); }, 1800);
  };

  const Field = ({ label, field, placeholder, type = 'text', required = false }: {
    label: string; field: keyof CompanyForm; placeholder?: string; type?: string; required?: boolean;
  }) => (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[field]}
        onChange={e => update(field, e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full bg-slate-50 text-slate-900 text-sm px-3 py-2 rounded-lg border focus:outline-none focus:border-blue-500 focus:bg-white transition-colors',
          errors[field] ? 'border-red-400 bg-red-50' : 'border-slate-200'
        )}
      />
      {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">신규 업체 등록</h2>
              <p className="text-xs text-slate-400">고객사 / 납품처 정보를 입력하세요</p>
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
              <p className="text-sm text-slate-400">업체가 등록되었습니다</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* 기본 정보 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold text-slate-700">기본 정보</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Field label="업체명(상호)" field="name" placeholder="예: (주)삼성바이오로직스" required />
                  </div>
                  <Field label="사업자등록번호" field="businessNo" placeholder="000-00-00000" />
                  <Field label="담당자명" field="contact" placeholder="홍길동" required />
                </div>
              </div>

              {/* 연락처 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Phone className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-semibold text-slate-700">연락처</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="전화번호" field="phone" placeholder="02-0000-0000" required />
                  <Field label="이메일" field="email" placeholder="contact@company.com" type="email" />
                </div>
              </div>

              {/* 소재지 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-semibold text-slate-700">소재지</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      시/도<span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <select
                      value={form.city}
                      onChange={e => update('city', e.target.value)}
                      className={cn(
                        'w-full bg-slate-50 text-slate-900 text-sm px-3 py-2 rounded-lg border focus:outline-none focus:border-blue-500',
                        errors.city ? 'border-red-400' : 'border-slate-200'
                      )}
                    >
                      <option value="">선택</option>
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                  </div>
                  <Field label="구/군" field="district" placeholder="강남구" />
                  <div className="col-span-2">
                    <Field label="상세 주소" field="address" placeholder="서울특별시 강남구 테헤란로 518" required />
                  </div>
                </div>
              </div>

              {/* 계약 정보 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-semibold text-slate-700">계약 정보</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">계약 시작일</label>
                    <input type="date" value={form.contractStart} onChange={e => update('contractStart', e.target.value)}
                      className="w-full bg-slate-50 text-slate-900 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      계약 만료일<span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <input type="date" value={form.contractEnd} onChange={e => update('contractEnd', e.target.value)}
                      className={cn(
                        'w-full bg-slate-50 text-slate-900 text-sm px-3 py-2 rounded-lg border focus:outline-none focus:border-blue-500',
                        errors.contractEnd ? 'border-red-400' : 'border-slate-200'
                      )} />
                    {errors.contractEnd && <p className="text-xs text-red-500 mt-1">{errors.contractEnd}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">비고</label>
                    <textarea rows={2} value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="특이사항..."
                      className="w-full bg-slate-50 text-slate-900 text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 resize-none" />
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
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all">
              <Check className="w-4 h-4" /> 업체 등록
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
