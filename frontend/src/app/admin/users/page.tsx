'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Check,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Shield,
  Eye,
  Building2,
  Wrench,
} from 'lucide-react';
import { userApi, companiesApi, UserPayload, CompanyDetailPayload } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';

const ROLES = [
  { value: 'superadmin', label: '슈퍼관리자', color: 'bg-red-100 text-red-700', Icon: ShieldCheck },
  { value: 'manager', label: '관리자', color: 'bg-orange-100 text-orange-700', Icon: Shield },
  { value: 'technician', label: '기술자', color: 'bg-blue-100 text-blue-700', Icon: Wrench },
  { value: 'viewer', label: '조회자', color: 'bg-slate-100 text-slate-600', Icon: Eye },
  { value: 'company', label: '업체담당자', color: 'bg-green-100 text-green-700', Icon: Building2 },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  superadmin: ['사용자 관리', '업체 관리', '장비 관리', '카탈로그', '유지보수', '보고서', '알림', 'A/S', '견적', '계약', '대시보드'],
  manager: ['업체 관리', '장비 관리', '카탈로그', '유지보수', '보고서', '알림', 'A/S', '견적', '계약', '대시보드'],
  technician: ['유지보수', '보고서', '알림', 'A/S', '대시보드'],
  viewer: ['보고서', '대시보드'],
  company: ['내 장비 조회', 'A/S 요청', '견적 조회', '계약 조회'],
};

interface UserModalProps {
  user?: UserPayload | null;
  companies: CompanyDetailPayload[];
  onClose: () => void;
  onSaved: () => void;
}

function UserModal({ user, companies, onClose, onSaved }: UserModalProps) {
  const isNew = !user;
  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    full_name: user?.full_name || '',
    role: user?.role || 'viewer',
    company_id: user?.company_id || '',
    password: '',
    is_active: user?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.username || !form.email || !form.role) {
      setError('아이디, 이메일, 역할은 필수입니다');
      return;
    }
    if (isNew && !form.password) {
      setError('신규 등록 시 비밀번호는 필수입니다');
      return;
    }
    if (form.password && form.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        company_id: form.role === 'company' ? form.company_id || undefined : undefined,
      };
      if (isNew) {
        await userApi.create({ ...payload, password: form.password });
      } else {
        const updatePayload: Partial<UserPayload> & { password?: string } = {
          full_name: form.full_name,
          role: form.role,
          company_id: payload.company_id,
          is_active: form.is_active,
          email: form.email,
        };
        if (form.password) updatePayload.password = form.password;
        await userApi.update(user!.id!, updatePayload as Partial<UserPayload>);
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLES.find((r) => r.value === form.role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-slate-800">
            {isNew ? '신규 계정 등록' : '계정 수정'}
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
                아이디 {isNew && <span className="text-red-500">*</span>}
              </label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                disabled={!isNew}
                placeholder="영문, 숫자"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="성명"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              이메일 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="example@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {isNew ? '비밀번호' : '새 비밀번호 (변경 시 입력)'} {isNew && <span className="text-red-500">*</span>}
            </label>
            <input
              type="password"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="8자 이상"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              역할 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setForm({ ...form, role: r.value })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    form.role === r.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <r.Icon size={14} />
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* 업체담당자일 때 회사 연결 */}
          {form.role === 'company' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">연결 업체</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.company_id}
                onChange={(e) => setForm({ ...form, company_id: e.target.value })}
              >
                <option value="">업체 선택...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* 접근 권한 미리보기 */}
          {selectedRole && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-600 mb-2">접근 가능 메뉴</p>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_PERMISSIONS[form.role]?.map((p) => (
                  <span key={p} className={`px-2 py-0.5 rounded text-xs font-medium ${selectedRole.color}`}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!isNew && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active_user"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 accent-blue-600"
              />
              <label htmlFor="is_active_user" className="text-sm text-slate-700">활성 계정</label>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">
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

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserPayload[]>([]);
  const [companies, setCompanies] = useState<CompanyDetailPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [modal, setModal] = useState<{ open: boolean; user: UserPayload | null }>({ open: false, user: null });

  const load = async () => {
    setLoading(true);
    try {
      const [usersData, companiesData] = await Promise.all([
        userApi.list(),
        companiesApi.list(),
      ]);
      setUsers(usersData);
      setCompanies(companiesData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.username.includes(search) || (u.full_name || '').includes(search) || (u.email || '').includes(search);
    const matchRole = !filterRole || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${name} 계정을 비활성화하시겠습니까?`)) return;
    try {
      await userApi.delete(id);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  const getRoleMeta = (role: string) => ROLES.find((r) => r.value === role) || ROLES[3];

  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active !== false).length,
    byRole: ROLES.map((r) => ({ ...r, count: users.filter((u) => u.role === r.value).length })),
  };

  return (
    <DashboardLayout title="계정 관리" subtitle="사용자 계정 및 접근 권한 관리">
      <div className="space-y-6">
        {/* 통계 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">전체</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">활성</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
          </div>
          {stats.byRole.map((r) => (
            <div key={r.value} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">{r.label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{r.count}</p>
            </div>
          ))}
        </div>

        {/* 역할별 권한 설명 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">역할별 접근 권한</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {ROLES.map((r) => (
              <div key={r.value} className="border border-slate-200 rounded-lg p-3">
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold mb-2 ${r.color}`}>
                  <r.Icon size={12} />
                  {r.label}
                </div>
                <ul className="space-y-0.5">
                  {ROLE_PERMISSIONS[r.value].map((p) => (
                    <li key={p} className="text-xs text-slate-500">• {p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* 액션 */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
                placeholder="아이디, 이름, 이메일"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="">전체 역할</option>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <button
            onClick={() => setModal({ open: true, user: null })}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus size={14} /> 계정 등록
          </button>
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Users size={48} className="mx-auto mb-3 opacity-30" />
              <p>등록된 계정이 없습니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">아이디</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">이름</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">이메일</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">역할</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">연결 업체</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">상태</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">가입일</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((u) => {
                    const roleMeta = getRoleMeta(u.role);
                    const company = companies.find((c) => c.id === u.company_id);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{u.username}</td>
                        <td className="px-4 py-3 text-slate-600">{u.full_name || '-'}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{u.email}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleMeta.color}`}>
                            <roleMeta.Icon size={10} />
                            {roleMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {company ? company.name : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {u.is_active !== false ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString('ko-KR') : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setModal({ open: true, user: u })}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(u.id!, u.username)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 py-3 border-t border-slate-100 text-sm text-slate-500 bg-slate-50">
            총 {filtered.length}명
          </div>
        </div>
      </div>

      {modal.open && (
        <UserModal
          user={modal.user}
          companies={companies}
          onClose={() => setModal({ open: false, user: null })}
          onSaved={load}
        />
      )}
    </DashboardLayout>
  );
}
