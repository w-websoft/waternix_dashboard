'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, RefreshCw, Wrench, Clock, CheckCircle, AlertTriangle, User, Calendar, X, ChevronDown, ChevronUp } from 'lucide-react';
import { serviceRequestApi, ServiceRequest } from '@/lib/api';

const REQUEST_TYPES: Record<string, string> = {
  breakdown: '고장수리',
  inspection: '정기점검',
  consumable: '소모품교체',
  install: '신규설치',
  other: '기타',
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  urgent: { label: '긴급', color: 'bg-red-100 text-red-700' },
  normal: { label: '일반', color: 'bg-blue-100 text-blue-700' },
  scheduled: { label: '예정', color: 'bg-gray-100 text-gray-700' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  received: { label: '접수', color: 'bg-yellow-100 text-yellow-700' },
  dispatched: { label: '배차완료', color: 'bg-blue-100 text-blue-700' },
  on_route: { label: '이동중', color: 'bg-indigo-100 text-indigo-700' },
  arrived: { label: '현장도착', color: 'bg-purple-100 text-purple-700' },
  working: { label: '작업중', color: 'bg-orange-100 text-orange-700' },
  completed: { label: '완료', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소', color: 'bg-gray-100 text-gray-500' },
};

const EMPTY_FORM = {
  title: '',
  description: '',
  company_name: '',
  equipment_name: '',
  request_type: 'inspection',
  priority: 'normal',
  scheduled_date: '',
  technician_name: '',
  status: 'received',
};

export default function ServicePage() {
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ open_count: 0, completed_count: 0, urgent_count: 0, pending_dispatch: 0, monthly: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailId, setShowDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ServiceRequest | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    labor_hours: '', labor_cost: '', parts_cost: '', total_cost: '', report_notes: '', customer_rating: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (typeFilter) params.request_type = typeFilter;
      const [res, s] = await Promise.all([
        serviceRequestApi.list(params),
        serviceRequestApi.stats(),
      ]);
      setItems(res.items);
      setTotal(res.total);
      setStats(s);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, statusFilter, priorityFilter, typeFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const openDetail = async (id: string) => {
    setShowDetailId(id);
    try {
      const d = await serviceRequestApi.get(id);
      setDetail(d);
    } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    if (!form.title) { setError('제목을 입력해주세요'); return; }
    setSaving(true);
    try {
      await serviceRequestApi.create(form);
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
      loadData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '등록 실패');
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await serviceRequestApi.updateStatus(id, newStatus);
      loadData();
      if (showDetailId === id) {
        const d = await serviceRequestApi.get(id);
        setDetail(d);
      }
    } catch { /* ignore */ }
  };

  const handleComplete = async () => {
    if (!showDetailId) return;
    setSaving(true);
    try {
      await serviceRequestApi.complete(showDetailId, {
        labor_hours: completeForm.labor_hours ? parseFloat(completeForm.labor_hours) : undefined,
        labor_cost: completeForm.labor_cost ? parseInt(completeForm.labor_cost) : undefined,
        parts_cost: completeForm.parts_cost ? parseInt(completeForm.parts_cost) : undefined,
        total_cost: completeForm.total_cost ? parseInt(completeForm.total_cost) : undefined,
        report_notes: completeForm.report_notes,
        customer_rating: completeForm.customer_rating ? parseInt(completeForm.customer_rating) : undefined,
      });
      setShowCompleteModal(false);
      loadData();
      const d = await serviceRequestApi.get(showDetailId);
      setDetail(d);
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await serviceRequestApi.delete(id);
      setShowDetailId(null);
      setDetail(null);
      loadData();
    } catch { /* ignore */ }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">A/S 서비스 관리</h1>
          <p className="text-sm text-gray-500 mt-1">접수 · 배차 · 완료 처리</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setError(''); setForm({ ...EMPTY_FORM }); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">A/S 접수</span>
        </button>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: '처리중', value: stats.open_count, color: 'text-blue-600', icon: <Clock className="w-5 h-5" /> },
          { label: '긴급', value: stats.urgent_count, color: 'text-red-600', icon: <AlertTriangle className="w-5 h-5" /> },
          { label: '배차대기', value: stats.pending_dispatch, color: 'text-yellow-600', icon: <User className="w-5 h-5" /> },
          { label: '이번달', value: stats.monthly, color: 'text-indigo-600', icon: <Calendar className="w-5 h-5" /> },
          { label: '완료', value: stats.completed_count, color: 'text-green-600', icon: <CheckCircle className="w-5 h-5" /> },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <span className={card.color}>{card.icon}</span>
              {card.label}
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="제목, 업체명, 장비명, 요청번호 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {[
            { value: statusFilter, onChange: setStatusFilter, options: [['', '전체 상태'], ...Object.entries(STATUS_LABELS).map(([k, v]) => [k, v.label])] },
            { value: priorityFilter, onChange: setPriorityFilter, options: [['', '전체 우선순위'], ...Object.entries(PRIORITY_LABELS).map(([k, v]) => [k, v.label])] },
            { value: typeFilter, onChange: setTypeFilter, options: [['', '전체 유형'], ...Object.entries(REQUEST_TYPES).map(([k, v]) => [k, v])] },
          ].map((sel, i) => (
            <select key={i} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={sel.value} onChange={e => sel.onChange(e.target.value)}>
              {sel.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
          <button onClick={loadData} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 text-sm text-gray-500">총 {total}건</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['요청번호', '제목', '업체/장비', '유형', '우선순위', '담당기사', '예정일', '상태', '접수일', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400">등록된 서비스 요청이 없습니다</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(item.id)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.request_no}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{item.title}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="truncate">{item.company_name || '-'}</div>
                    <div className="text-xs text-gray-400 truncate">{item.equipment_name || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{REQUEST_TYPES[item.request_type] || item.request_type}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_LABELS[item.priority]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {PRIORITY_LABELS[item.priority]?.label || item.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{item.technician_name || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{item.scheduled_date || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[item.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[item.status]?.label || item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{item.created_at?.slice(0, 10)}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600 text-xs">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 상세 패널 */}
      {showDetailId && (
        <div className="fixed inset-0 z-40 flex">
          <div className="flex-1 bg-black/40" onClick={() => { setShowDetailId(null); setDetail(null); }} />
          <div className="w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold">서비스 요청 상세</h2>
              <button onClick={() => { setShowDetailId(null); setDetail(null); }}><X className="w-5 h-5" /></button>
            </div>
            {!detail ? (
              <div className="flex items-center justify-center h-40 text-gray-400">불러오는 중...</div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm text-gray-500">{detail.request_no}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[detail.status]?.color}`}>
                    {STATUS_LABELS[detail.status]?.label || detail.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_LABELS[detail.priority]?.color}`}>
                    {PRIORITY_LABELS[detail.priority]?.label || detail.priority}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{detail.title}</h3>
                {detail.description && <p className="text-gray-600 text-sm">{detail.description}</p>}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    ['업체명', detail.company_name],
                    ['장비명', detail.equipment_name],
                    ['유형', REQUEST_TYPES[detail.request_type] || detail.request_type],
                    ['담당기사', detail.technician_name],
                    ['예정일', detail.scheduled_date],
                    ['도착시간', detail.arrived_at?.slice(0, 16)],
                    ['완료시간', detail.completed_at?.slice(0, 16)],
                    ['노동시간', detail.labor_hours ? `${detail.labor_hours}h` : undefined],
                    ['총비용', detail.total_cost ? `${detail.total_cost.toLocaleString()}원` : undefined],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <div key={k as string}>
                      <p className="text-gray-400 text-xs">{k}</p>
                      <p className="font-medium">{v}</p>
                    </div>
                  ))}
                </div>

                {detail.report_notes && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">작업 보고</p>
                    <p className="text-sm">{detail.report_notes}</p>
                  </div>
                )}

                {detail.customer_rating && (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-500">고객평가:</span>
                    {'★'.repeat(detail.customer_rating)}{'☆'.repeat(5 - detail.customer_rating)}
                  </div>
                )}

                {/* 상태 변경 버튼 */}
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2">상태 변경</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(STATUS_LABELS)
                      .filter(([k]) => k !== detail.status && k !== 'cancelled')
                      .map(([k, v]) => (
                        k === 'completed' ? (
                          <button key={k}
                            onClick={() => { setShowCompleteModal(true); setCompleteForm({ labor_hours: '', labor_cost: '', parts_cost: '', total_cost: '', report_notes: '', customer_rating: '' }); }}
                            className="px-3 py-1 rounded text-xs bg-green-600 text-white hover:bg-green-700"
                          >
                            {v.label}
                          </button>
                        ) : (
                          <button key={k}
                            onClick={() => handleStatusChange(detail.id, k)}
                            className={`px-3 py-1 rounded text-xs border ${v.color} border-current`}
                          >
                            → {v.label}
                          </button>
                        )
                      ))
                    }
                    <button
                      onClick={() => handleStatusChange(detail.id, 'cancelled')}
                      className="px-3 py-1 rounded text-xs border border-gray-300 text-gray-500 hover:bg-gray-50"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 완료 처리 모달 */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold">작업 완료 처리</h2>
              <button onClick={() => setShowCompleteModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'labor_hours', label: '노동시간 (h)', type: 'number' },
                  { key: 'labor_cost', label: '인건비 (원)', type: 'number' },
                  { key: 'parts_cost', label: '부품비 (원)', type: 'number' },
                  { key: 'total_cost', label: '총비용 (원)', type: 'number' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                    <input
                      type={f.type}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      value={completeForm[f.key as keyof typeof completeForm]}
                      onChange={e => setCompleteForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">작업 보고</label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={completeForm.report_notes}
                  onChange={e => setCompleteForm(prev => ({ ...prev, report_notes: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">고객 평점 (1~5)</label>
                <input
                  type="number" min="1" max="5"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={completeForm.customer_rating}
                  onChange={e => setCompleteForm(prev => ({ ...prev, customer_rating: e.target.value }))}
                />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setShowCompleteModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={handleComplete} disabled={saving} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {saving ? '처리중...' : '완료 처리'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><Wrench className="w-5 h-5" /> A/S 접수</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">업체명</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">장비명</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.equipment_name} onChange={e => setForm(p => ({ ...p, equipment_name: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">요청 유형</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.request_type} onChange={e => setForm(p => ({ ...p, request_type: e.target.value }))}>
                    {Object.entries(REQUEST_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">우선순위</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담당 기사</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.technician_name} onChange={e => setForm(p => ({ ...p, technician_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">예정일</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.scheduled_date} onChange={e => setForm(p => ({ ...p, scheduled_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상세 내용</label>
                <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={handleCreate} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? '접수중...' : '접수 등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
