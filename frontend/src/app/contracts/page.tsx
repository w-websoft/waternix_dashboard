'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, RefreshCw, FileSignature, AlertCircle, X, Trash2 } from 'lucide-react';
import { contractApi, Contract } from '@/lib/api';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '초안', color: 'bg-gray-100 text-gray-600' },
  active: { label: '유효', color: 'bg-green-100 text-green-700' },
  expired: { label: '만료', color: 'bg-yellow-100 text-yellow-600' },
  cancelled: { label: '취소', color: 'bg-red-100 text-red-600' },
};

const CONTRACT_TYPES: Record<string, string> = {
  supply: '단순 납품',
  maintenance: '유지보수 포함',
  full_service: '완전 위탁',
};

const EMPTY_FORM = {
  company_name: '', title: '', contract_type: 'supply',
  start_date: '', end_date: '', amount: '', payment_terms: '', scope: '', notes: '', sales_name: '',
};

export default function ContractsPage() {
  const [items, setItems] = useState<Contract[]>([]);
  const [total, setTotal] = useState(0);
  const [expiring, setExpiring] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<Contract | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.contract_type = typeFilter;
      const [res, exp] = await Promise.all([
        contractApi.list(params),
        contractApi.expiring(),
      ]);
      setItems(res.items);
      setTotal(res.total);
      setExpiring(exp);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!form.company_name) { setError('업체명을 입력하세요'); return; }
    setSaving(true);
    try {
      await contractApi.create({ ...form, amount: form.amount ? parseInt(form.amount) : 0 });
      setShowModal(false);
      loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try { await contractApi.delete(id); loadData(); if (showDetail?.id === id) setShowDetail(null); }
    catch { /* ignore */ }
  };

  const daysColor = (days?: number) => {
    if (days === undefined || days === null) return 'text-gray-500';
    if (days < 0) return 'text-red-600 font-bold';
    if (days < 30) return 'text-red-500 font-semibold';
    if (days < 60) return 'text-yellow-600';
    if (days < 90) return 'text-orange-500';
    return 'text-green-600';
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">계약 관리</h1>
          <p className="text-sm text-gray-500 mt-1">납품 · 유지보수 · 위탁 계약 관리</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setError(''); setForm({ ...EMPTY_FORM }); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">계약 등록</span>
        </button>
      </div>

      {/* 만료 예정 알림 */}
      {expiring.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-yellow-700 font-medium mb-2">
            <AlertCircle className="w-5 h-5" />
            90일 내 만료 예정 계약 {expiring.length}건
          </div>
          <div className="space-y-1">
            {expiring.slice(0, 3).map(c => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{c.company_name} - {c.title || c.contract_no}</span>
                <span className={daysColor(c.days_remaining)}>
                  {c.days_remaining !== undefined && c.days_remaining < 0 ? `D+${Math.abs(c.days_remaining)}` : `D-${c.days_remaining}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm" placeholder="계약번호, 업체명 검색"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">전체 상태</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">전체 유형</option>
          {Object.entries(CONTRACT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
                {['계약번호', '업체명', '제목', '유형', '계약금액', '기간', '만료 D-Day', '상태', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">계약이 없습니다</td></tr>
              ) : items.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setShowDetail(c)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.contract_no}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.company_name}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{c.title || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{CONTRACT_TYPES[c.contract_type] || c.contract_type}</td>
                  <td className="px-4 py-3 font-medium">{c.amount.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {c.start_date ? `${c.start_date}~` : ''}{c.end_date || ''}
                  </td>
                  <td className={`px-4 py-3 text-sm ${daysColor(c.days_remaining)}`}>
                    {c.days_remaining !== undefined ? (
                      c.days_remaining < 0 ? `만료(${Math.abs(c.days_remaining)}일)` : `D-${c.days_remaining}`
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[c.status]?.color}`}>
                      {STATUS_LABELS[c.status]?.label || c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-600 text-xs">삭제</button>
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
          <div className="w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold">계약 상세</h2>
              <button onClick={() => setShowDetail(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-gray-500">{showDetail.contract_no}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[showDetail.status]?.color}`}>
                  {STATUS_LABELS[showDetail.status]?.label || showDetail.status}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">{showDetail.title || showDetail.contract_no}</h3>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['업체명', showDetail.company_name],
                  ['계약 유형', CONTRACT_TYPES[showDetail.contract_type] || showDetail.contract_type],
                  ['계약금액', `${showDetail.amount.toLocaleString()}원`],
                  ['담당 영업', showDetail.sales_name],
                  ['시작일', showDetail.start_date],
                  ['종료일', showDetail.end_date],
                  ['만료 D-Day', showDetail.days_remaining !== undefined ? (
                    showDetail.days_remaining < 0 ? `만료(${Math.abs(showDetail.days_remaining)}일 경과)` : `D-${showDetail.days_remaining}`
                  ) : undefined],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string}>
                    <p className="text-xs text-gray-400">{k}</p>
                    <p className={`font-medium ${k === '만료 D-Day' ? daysColor(showDetail.days_remaining) : ''}`}>{v as string}</p>
                  </div>
                ))}
              </div>

              {showDetail.payment_terms && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="text-xs text-gray-400 mb-1">결제 조건</p>
                  {showDetail.payment_terms}
                </div>
              )}
              {showDetail.scope && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  <p className="text-xs text-blue-400 mb-1">계약 범위</p>
                  {showDetail.scope}
                </div>
              )}
              {showDetail.notes && (
                <div className="bg-yellow-50 rounded-lg p-3 text-sm">
                  <p className="text-xs text-gray-400 mb-1">비고</p>
                  {showDetail.notes}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => handleDelete(showDetail.id)}
                  className="flex items-center gap-1 px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50">
                  <Trash2 className="w-4 h-4" /> 삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><FileSignature className="w-5 h-5" /> 계약 등록</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'company_name', label: '업체명 *', type: 'text' },
                  { key: 'title', label: '계약 제목', type: 'text' },
                  { key: 'sales_name', label: '담당 영업', type: 'text' },
                  { key: 'amount', label: '계약금액 (원)', type: 'number' },
                  { key: 'start_date', label: '계약 시작일', type: 'date' },
                  { key: 'end_date', label: '계약 종료일', type: 'date' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                    <input type={f.type} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">계약 유형</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.contract_type} onChange={e => setForm(prev => ({ ...prev, contract_type: e.target.value }))}>
                  {Object.entries(CONTRACT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {[
                { key: 'payment_terms', label: '결제 조건' },
                { key: 'scope', label: '계약 범위' },
                { key: 'notes', label: '비고' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? '저장중...' : '계약 등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
