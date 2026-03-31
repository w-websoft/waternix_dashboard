'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, RefreshCw, FileText, Send, CheckCircle, X, Trash2, Printer, Copy, Package } from 'lucide-react';
import { quotationApi, companiesApi, equipmentCatalogApi, Quotation, QuotationItem, CompanyDetailPayload, EquipmentCatalogItem } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '작성중', color: 'bg-gray-100 text-gray-600' },
  sent: { label: '발송완료', color: 'bg-blue-100 text-blue-700' },
  accepted: { label: '수락됨', color: 'bg-green-100 text-green-700' },
  rejected: { label: '거절됨', color: 'bg-red-100 text-red-600' },
  expired: { label: '만료', color: 'bg-yellow-100 text-yellow-600' },
};

const EMPTY_ITEM: QuotationItem = { type: 'equipment', name: '', qty: 1, unit_price: 0, amount: 0 };

function calcItems(items: QuotationItem[]) {
  return items.map(it => ({ ...it, amount: it.qty * it.unit_price }));
}

export default function QuotationsPage() {
  const [items, setItems] = useState<Quotation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<Quotation | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<CompanyDetailPayload[]>([]);
  const [catalog, setCatalog] = useState<EquipmentCatalogItem[]>([]);
  const [form, setForm] = useState({
    company_id: '', company_name: '', contact_name: '', contact_email: '', contact_phone: '',
    valid_until: '', notes: '', items: [{ ...EMPTY_ITEM }] as QuotationItem[],
  });
  const printRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await quotationApi.list(params);
      setItems(res.items);
      setTotal(res.total);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    companiesApi.list().then(setCompanies).catch(() => {});
    equipmentCatalogApi.list().then(setCatalog).catch(() => {});
  }, []);

  const handlePrint = () => {
    if (!showDetail) return;
    window.print();
  };

  const addCatalogItem = (cat: EquipmentCatalogItem) => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, {
        type: 'equipment',
        name: `${cat.model_code} - ${cat.model_name}`,
        qty: 1,
        unit_price: cat.sell_price || 0,
        amount: cat.sell_price || 0,
      }],
    }));
  };

  const updateItem = (idx: number, field: keyof QuotationItem, value: string | number) => {
    setForm(prev => {
      const updated = [...prev.items];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === 'qty' || field === 'unit_price') {
        updated[idx].amount = updated[idx].qty * updated[idx].unit_price;
      }
      return { ...prev, items: updated };
    });
  };

  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }));
  const removeItem = (idx: number) => setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));

  const subtotal = form.items.reduce((s, it) => s + it.amount, 0);
  const tax = Math.floor(subtotal * 0.1);
  const total2 = subtotal + tax;

  const handleCreate = async () => {
    if (!form.company_name) { setError('업체명을 입력하세요'); return; }
    setSaving(true);
    try {
      await quotationApi.create({ ...form, items: calcItems(form.items) });
      setShowModal(false);
      loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally { setSaving(false); }
  };

  const handleSend = async (id: string) => {
    try { await quotationApi.send(id); loadData(); } catch { /* ignore */ }
  };

  const handleAccept = async (id: string) => {
    if (!confirm('견적을 수락 처리하고 계약을 자동 생성하시겠습니까?')) return;
    try {
      const res = await quotationApi.accept(id);
      alert(`계약 생성됨: ${res.contract_no}`);
      loadData();
      if (showDetail?.id === id) setShowDetail(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '수락 실패');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try { await quotationApi.delete(id); loadData(); if (showDetail?.id === id) setShowDetail(null); }
    catch { /* ignore */ }
  };

  return (
    <DashboardLayout title="견적서 관리" subtitle="장비 · 소모품 · 서비스 견적 발행">
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={() => { setShowModal(true); setError(''); setForm({ company_id: '', company_name: '', contact_name: '', contact_email: '', contact_phone: '', valid_until: '', notes: '', items: [{ ...EMPTY_ITEM }] }); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>견적서 작성</span>
        </button>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm" placeholder="견적번호, 업체명 검색"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">전체 상태</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={loadData} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 text-sm text-gray-500">총 {total}건</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['견적번호', '업체명', '담당자', '금액', '유효기한', '상태', '작성일', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">견적서가 없습니다</td></tr>
              ) : items.map(q => (
                <tr key={q.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setShowDetail(q)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{q.quote_no}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{q.company_name}</td>
                  <td className="px-4 py-3 text-gray-600">{q.contact_name || '-'}</td>
                  <td className="px-4 py-3 font-medium">{q.total.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-gray-600">{q.valid_until || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[q.status]?.color}`}>
                      {STATUS_LABELS[q.status]?.label || q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{q.created_at?.slice(0, 10)}</td>
                  <td className="px-4 py-3 flex gap-1" onClick={e => e.stopPropagation()}>
                    {q.status === 'draft' && (
                      <button onClick={() => handleSend(q.id)} className="text-blue-500 hover:text-blue-700 text-xs flex items-center gap-1">
                        <Send className="w-3 h-3" />발송
                      </button>
                    )}
                    {q.status === 'sent' && (
                      <button onClick={() => handleAccept(q.id)} className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />수락
                      </button>
                    )}
                    <button onClick={() => handleDelete(q.id)} className="text-red-400 hover:text-red-600 text-xs ml-1">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 상세 패널 */}
      {showDetail && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowDetail(null)} />
          <div className="w-full max-w-xl bg-white shadow-xl overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold">견적서 상세</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
                >
                  <Printer size={14} /> 인쇄
                </button>
                <button onClick={() => setShowDetail(null)}><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-gray-500">{showDetail.quote_no}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[showDetail.status]?.color}`}>
                  {STATUS_LABELS[showDetail.status]?.label || showDetail.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['업체명', showDetail.company_name],
                  ['담당자', showDetail.contact_name],
                  ['이메일', showDetail.contact_email],
                  ['연락처', showDetail.contact_phone],
                  ['유효기한', showDetail.valid_until],
                  ['작성자', showDetail.created_by],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string}>
                    <p className="text-xs text-gray-400">{k}</p>
                    <p className="font-medium">{v}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-2">견적 품목</p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      {['품목명', '수량', '단가', '금액'].map(h => <th key={h} className="px-3 py-2 text-left text-gray-500 border border-gray-200">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {showDetail.items.map((it, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-3 py-2 border border-gray-200">{it.name}</td>
                        <td className="px-3 py-2 border border-gray-200">{it.qty}</td>
                        <td className="px-3 py-2 border border-gray-200">{it.unit_price.toLocaleString()}</td>
                        <td className="px-3 py-2 border border-gray-200 font-medium">{it.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">소계</span><span>{showDetail.subtotal.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span className="text-gray-500">부가세(10%)</span><span>{showDetail.tax.toLocaleString()}원</span></div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200"><span>합계</span><span className="text-blue-700">{showDetail.total.toLocaleString()}원</span></div>
              </div>

              {showDetail.notes && (
                <div className="bg-yellow-50 rounded-lg p-3 text-sm">
                  <p className="text-xs text-gray-400 mb-1">비고</p>
                  {showDetail.notes}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {showDetail.status === 'draft' && (
                  <button onClick={() => { handleSend(showDetail.id); setShowDetail(prev => prev ? { ...prev, status: 'sent' } : null); }}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Send className="w-4 h-4" /> 발송 처리
                  </button>
                )}
                {showDetail.status === 'sent' && (
                  <button onClick={() => handleAccept(showDetail.id)}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <CheckCircle className="w-4 h-4" /> 수락 처리
                  </button>
                )}
                <button onClick={() => handleDelete(showDetail.id)}
                  className="flex items-center gap-1 px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50">
                  <Trash2 className="w-4 h-4" /> 삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 작성 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><FileText className="w-5 h-5" /> 견적서 작성</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
              {/* 업체 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">업체 선택 *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.company_id}
                  onChange={e => {
                    const co = companies.find(c => c.id === e.target.value);
                    setForm(prev => ({ ...prev, company_id: e.target.value, company_name: co?.name || '' }));
                  }}
                >
                  <option value="">업체 선택...</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'contact_name', label: '담당자' },
                  { key: 'contact_email', label: '이메일' },
                  { key: 'contact_phone', label: '연락처' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      value={form[f.key as keyof typeof form] as string}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">유효기한</label>
                <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.valid_until} onChange={e => setForm(prev => ({ ...prev, valid_until: e.target.value }))} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">견적 품목</label>
                  <div className="flex items-center gap-2">
                    <select
                      className="border border-gray-300 rounded px-2 py-1 text-xs"
                      defaultValue=""
                      onChange={e => {
                        if (!e.target.value) return;
                        const cat = catalog.find(c => c.id === e.target.value);
                        if (cat) addCatalogItem(cat);
                        e.target.value = '';
                      }}
                    >
                      <option value="">카탈로그에서 추가...</option>
                      {catalog.map(c => (
                        <option key={c.id} value={c.id}>{c.model_code} - {c.model_name}</option>
                      ))}
                    </select>
                    <button onClick={addItem} className="text-blue-600 text-xs hover:underline flex items-center gap-1">
                      <Plus className="w-3 h-3" /> 직접 추가
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {form.items.map((it, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="품목명"
                        value={it.name} onChange={e => updateItem(idx, 'name', e.target.value)} />
                      <input type="number" className="w-16 border border-gray-300 rounded px-2 py-1.5 text-sm text-center" placeholder="수량"
                        value={it.qty} onChange={e => updateItem(idx, 'qty', parseInt(e.target.value) || 0)} />
                      <input type="number" className="w-28 border border-gray-300 rounded px-2 py-1.5 text-sm text-right" placeholder="단가"
                        value={it.unit_price} onChange={e => updateItem(idx, 'unit_price', parseInt(e.target.value) || 0)} />
                      <span className="w-28 text-sm text-right text-gray-600">{it.amount.toLocaleString()}원</span>
                      {form.items.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm space-y-1">
                  <div className="flex justify-between text-gray-500"><span>소계</span><span>{subtotal.toLocaleString()}원</span></div>
                  <div className="flex justify-between text-gray-500"><span>부가세(10%)</span><span>{tax.toLocaleString()}원</span></div>
                  <div className="flex justify-between font-bold pt-1 border-t border-gray-200"><span>합계</span><span className="text-blue-700">{total2.toLocaleString()}원</span></div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
                <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? '저장중...' : '견적서 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
