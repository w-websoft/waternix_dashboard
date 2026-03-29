'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { cn } from '@/lib/utils';
import { systemSettingsApi, authUsersApi, UserRecord } from '@/lib/api';
import {
  Settings, Bell, Shield, Wifi, Users,
  CheckCircle2, Eye, EyeOff, UserPlus, Trash2, Edit2, Key,
  Save, Loader2,
} from 'lucide-react';

const ROLE_LABEL_MAP: Record<string, string> = {
  superadmin: '슈퍼관리자', manager: '관리자', technician: '기술자', viewer: '조회자',
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [generalForm, setGeneralForm] = useState({
    companyName: '(주)워터닉스',
    bizNo: '621-81-12345',
    ceo: '김워터',
    phone: '051-202-3055',
    email: 'waternix@naver.com',
    address: '부산광역시 남구 수영로 309',
    collectInterval: '30',
    heartbeat: '60',
    offlineThreshold: '5',
    retentionDays: '365',
  });

  const [alertForm, setAlertForm] = useState({
    tdsWarn: '20', tdsCrit: '50',
    removalWarn: '95', removalCrit: '90',
    pressWarn: '10', pressCrit: '12',
    filterWarn: '80', filterCrit: '95',
    offlineWarn: '5', offlineCrit: '30',
  });

  const [commForm, setCommForm] = useState({
    mqttHost: 'mqtt.waternix.com',
    mqttPort: '8883',
    mqttTls: true,
    mqttClientPrefix: 'waternix_',
    modbusTimeout: '3000',
    modbusRetry: '3',
    modbusInterval: '5000',
    serialBaud: '19200',
    serialData: '8',
    serialStop: '1',
  });

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', username: '', password: 'Waternix2026!', role: 'viewer' });

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

  const [sessionTimeout, setSessionTimeout] = useState('60');
  const [twoFactor, setTwoFactor] = useState(false);
  const [ipWhitelist, setIpWhitelist] = useState('');

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const data = await authUsersApi.list();
      setUsers(data);
    } catch { /* 권한 없으면 무시 */ }
    finally { setUsersLoading(false); }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const data = await systemSettingsApi.getAll();
      setGeneralForm(prev => ({
        ...prev,
        companyName: data['company_name']?.value || prev.companyName,
        bizNo: data['company_biz_no']?.value || prev.bizNo,
        ceo: data['company_ceo']?.value || prev.ceo,
        phone: data['company_phone']?.value || prev.phone,
        email: data['company_email']?.value || prev.email,
        address: data['company_address']?.value || prev.address,
        collectInterval: data['collect_interval_sec']?.value || prev.collectInterval,
        heartbeat: data['heartbeat_sec']?.value || prev.heartbeat,
        offlineThreshold: data['offline_threshold_min']?.value || prev.offlineThreshold,
        retentionDays: data['retention_days']?.value || prev.retentionDays,
      }));
      setAlertForm(prev => ({
        ...prev,
        tdsWarn: data['alert_tds_warn']?.value || prev.tdsWarn,
        tdsCrit: data['alert_tds_crit']?.value || prev.tdsCrit,
        filterWarn: data['alert_filter_warn']?.value || prev.filterWarn,
        filterCrit: data['alert_filter_crit']?.value || prev.filterCrit,
      }));
    } catch { /* 무시 */ }
  }, []);

  useEffect(() => {
    loadSettings();
    loadUsers();
  }, [loadSettings, loadUsers]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        company_name: generalForm.companyName,
        company_biz_no: generalForm.bizNo,
        company_ceo: generalForm.ceo,
        company_phone: generalForm.phone,
        company_email: generalForm.email,
        company_address: generalForm.address,
        collect_interval_sec: generalForm.collectInterval,
        heartbeat_sec: generalForm.heartbeat,
        offline_threshold_min: generalForm.offlineThreshold,
        retention_days: generalForm.retentionDays,
        alert_tds_warn: alertForm.tdsWarn,
        alert_tds_crit: alertForm.tdsCrit,
        alert_filter_warn: alertForm.filterWarn,
        alert_filter_crit: alertForm.filterCrit,
      };
      await systemSettingsApi.update(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.email) return;
    try {
      await authUsersApi.create({
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        full_name: newUser.name,
        role: newUser.role,
      });
      setNewUser({ name: '', email: '', username: '', password: 'Waternix2026!', role: 'viewer' });
      setShowAddUser(false);
      loadUsers();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '추가 실패');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('해당 사용자를 비활성 처리하시겠습니까?')) return;
    try {
      await authUsersApi.delete(id);
      loadUsers();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '삭제 실패');
    }
  };

  const handleToggleUser = async (id: string, current: boolean) => {
    try {
      await authUsersApi.update(id, { is_active: !current });
      loadUsers();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '수정 실패');
    }
  };

  const handlePwSave = async () => {
    if (!pwForm.current) { setPwError('현재 비밀번호를 입력하세요.'); return; }
    if (pwForm.next.length < 8) { setPwError('새 비밀번호는 8자 이상이어야 합니다.'); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError('새 비밀번호가 일치하지 않습니다.'); return; }
    setPwError('');
    try {
      await authUsersApi.changePassword({ current_password: pwForm.current, new_password: pwForm.next });
      setPwSaved(true);
      setPwForm({ current: '', next: '', confirm: '' });
      setTimeout(() => setPwSaved(false), 3000);
    } catch (e: unknown) {
      setPwError(e instanceof Error ? e.message : '비밀번호 변경 실패');
    }
  };

  const TABS = [
    { id: 'general',  label: '일반 설정',   icon: Settings },
    { id: 'alerts',   label: '알림 설정',   icon: Bell },
    { id: 'comms',    label: '통신 설정',   icon: Wifi },
    { id: 'users',    label: '사용자 관리', icon: Users },
    { id: 'security', label: '보안',        icon: Shield },
  ];

  const INPUT = 'w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';
  const NUM_INPUT = 'w-20 px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <DashboardLayout title="시스템 설정" subtitle="워터닉스 IoT 관리 시스템 환경 설정">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab Navigation */}
        <div className="lg:w-52 flex-shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 p-2 flex lg:flex-col gap-1 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 lg:gap-3 px-3 py-2 lg:py-2.5 rounded-lg text-sm font-medium transition-colors text-left whitespace-nowrap flex-shrink-0',
                    activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5">
          {/* ── 일반 설정 ── */}
          {activeTab === 'general' && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-800 mb-4">회사 정보</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    { key: 'companyName', label: '회사명', type: 'text' },
                    { key: 'bizNo',       label: '사업자등록번호', type: 'text' },
                    { key: 'ceo',         label: '대표자', type: 'text' },
                    { key: 'phone',       label: '연락처', type: 'tel' },
                    { key: 'email',       label: '이메일', type: 'email' },
                    { key: 'address',     label: '주소', type: 'text' },
                  ] as const).map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">{f.label}</label>
                      <input
                        type={f.type}
                        value={generalForm[f.key]}
                        onChange={e => setGeneralForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className={INPUT}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-800 mb-4">데이터 수집 설정</h3>
                <div className="space-y-4">
                  {([
                    { key: 'collectInterval', label: '센서 데이터 수집 주기', unit: '초' },
                    { key: 'heartbeat',       label: '하트비트 간격',         unit: '초' },
                    { key: 'offlineThreshold',label: '오프라인 판단 기준',    unit: '분' },
                    { key: 'retentionDays',   label: '데이터 보관 기간',      unit: '일' },
                  ] as const).map(s => (
                    <div key={s.key} className="flex items-center justify-between">
                      <label className="text-sm text-slate-700">{s.label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={generalForm[s.key]}
                          onChange={e => setGeneralForm(p => ({ ...p, [s.key]: e.target.value }))}
                          className={NUM_INPUT}
                        />
                        <span className="text-sm text-slate-500">{s.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── 알림 설정 ── */}
          {activeTab === 'alerts' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">알림 임계값 설정</h3>
              <div className="space-y-4">
                {([
                  { label: '정수 TDS 경고 기준 (ppm)',  wKey: 'tdsWarn',      cKey: 'tdsCrit' },
                  { label: '오염물 제거율 경고 기준 (%)', wKey: 'removalWarn', cKey: 'removalCrit' },
                  { label: '입구 압력 최대값 (bar)',      wKey: 'pressWarn',   cKey: 'pressCrit' },
                  { label: '필터 수명 경고 기준 (%)',     wKey: 'filterWarn',  cKey: 'filterCrit' },
                  { label: '오프라인 경고 기준 (분)',     wKey: 'offlineWarn', cKey: 'offlineCrit' },
                ] as const).map(item => (
                  <div key={item.label} className="flex items-center justify-between gap-4">
                    <label className="text-sm text-slate-700 flex-1">{item.label}</label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-xs text-slate-500">경고:</span>
                        <input type="number" value={alertForm[item.wKey]}
                          onChange={e => setAlertForm(p => ({ ...p, [item.wKey]: e.target.value }))}
                          className="w-16 px-2 py-1 text-xs bg-amber-50 border border-amber-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-amber-400" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-xs text-slate-500">긴급:</span>
                        <input type="number" value={alertForm[item.cKey]}
                          onChange={e => setAlertForm(p => ({ ...p, [item.cKey]: e.target.value }))}
                          className="w-16 px-2 py-1 text-xs bg-red-50 border border-red-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-red-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 통신 설정 ── */}
          {activeTab === 'comms' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">통신 프로토콜 설정</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-600 mb-3 pb-2 border-b border-slate-100">MQTT 브로커</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {([
                      { key: 'mqttHost',         label: '브로커 호스트',       type: 'text' },
                      { key: 'mqttPort',         label: '포트',               type: 'number' },
                      { key: 'mqttClientPrefix', label: '클라이언트 ID 접두사', type: 'text' },
                    ] as const).map(f => (
                      <div key={f.key}>
                        <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                        <input type={f.type} value={commForm[f.key] as string}
                          onChange={e => setCommForm(p => ({ ...p, [f.key]: e.target.value }))}
                          className={INPUT} />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">TLS 암호화</label>
                      <label className="flex items-center gap-2 cursor-pointer mt-2">
                        <input type="checkbox" checked={commForm.mqttTls}
                          onChange={e => setCommForm(p => ({ ...p, mqttTls: e.target.checked }))}
                          className="w-4 h-4 rounded" />
                        <span className="text-sm text-slate-700">활성화</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-600 mb-3 pb-2 border-b border-slate-100">Modbus TCP 기본 설정</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {([
                      { key: 'modbusTimeout',  label: '연결 타임아웃 (ms)' },
                      { key: 'modbusRetry',    label: '재시도 횟수' },
                      { key: 'modbusInterval', label: '폴링 간격 (ms)' },
                    ] as const).map(f => (
                      <div key={f.key}>
                        <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                        <input type="number" value={commForm[f.key]}
                          onChange={e => setCommForm(p => ({ ...p, [f.key]: e.target.value }))}
                          className={INPUT} />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-600 mb-3 pb-2 border-b border-slate-100">RS485/시리얼 기본 설정</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {([
                      { key: 'serialBaud', label: '기본 보레이트' },
                      { key: 'serialData', label: '데이터 비트' },
                      { key: 'serialStop', label: '정지 비트' },
                    ] as const).map(f => (
                      <div key={f.key}>
                        <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                        <input type="number" value={commForm[f.key]}
                          onChange={e => setCommForm(p => ({ ...p, [f.key]: e.target.value }))}
                          className={INPUT} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 사용자 관리 ── */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">사용자 목록</h3>
                <button
                  onClick={() => setShowAddUser(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  <UserPlus className="w-4 h-4" /> 사용자 추가
                </button>
              </div>

              {showAddUser && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
                  <h4 className="text-sm font-semibold text-blue-800">신규 사용자 등록</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">아이디 (로그인용) *</label>
                      <input type="text" value={newUser.username}
                        onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))}
                        className={INPUT} placeholder="user_id" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">이름</label>
                      <input type="text" value={newUser.name}
                        onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))}
                        className={INPUT} placeholder="홍길동" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">이메일 *</label>
                      <input type="email" value={newUser.email}
                        onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                        className={INPUT} placeholder="user@waternix.com" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">초기 비밀번호</label>
                      <input type="text" value={newUser.password}
                        onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                        className={INPUT} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">권한</label>
                      <select value={newUser.role}
                        onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                        className={INPUT}>
                        <option value="superadmin">슈퍼관리자</option>
                        <option value="manager">관리자</option>
                        <option value="technician">기술자</option>
                        <option value="viewer">조회자</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddUser} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">추가</button>
                    <button onClick={() => setShowAddUser(false)} className="px-3 py-1.5 bg-white text-slate-600 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
                  </div>
                </div>
              )}

              {usersLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="animate-spin text-blue-500" size={24} />
                </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-slate-100">
                      <th className="text-left pb-2 font-medium">이름</th>
                      <th className="text-left pb-2 font-medium hidden sm:table-cell">이메일</th>
                      <th className="text-left pb-2 font-medium">권한</th>
                      <th className="text-center pb-2 font-medium">상태</th>
                      <th className="text-center pb-2 font-medium">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 font-medium text-slate-800">{u.full_name || u.username}</td>
                        <td className="py-3 text-slate-500 hidden sm:table-cell">{u.email}</td>
                        <td className="py-3">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            u.role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
                            u.role === 'manager' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                          )}>{ROLE_LABEL_MAP[u.role] || u.role}</span>
                        </td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => handleToggleUser(u.id, u.is_active)}
                            className={cn(
                              'text-xs px-2 py-0.5 rounded-full font-medium transition-colors',
                              u.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            )}
                          >
                            {u.is_active ? '활성' : '비활성'}
                          </button>
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          )}

          {/* ── 보안 ── */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              {/* 비밀번호 변경 */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="w-5 h-5 text-slate-600" />
                  <h3 className="font-semibold text-slate-800">비밀번호 변경</h3>
                </div>
                {pwSaved && (
                  <div className="flex items-center gap-2 mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" /> 비밀번호가 변경되었습니다.
                  </div>
                )}
                {pwError && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{pwError}</div>
                )}
                <div className="space-y-3 max-w-sm">
                  {([
                    { key: 'current', label: '현재 비밀번호' },
                    { key: 'next',    label: '새 비밀번호 (8자 이상)' },
                    { key: 'confirm', label: '새 비밀번호 확인' },
                  ] as const).map(f => (
                    <div key={f.key}>
                      <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                      <div className="relative">
                        <input
                          type={showPw ? 'text' : 'password'}
                          value={pwForm[f.key]}
                          onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                          className={INPUT}
                        />
                        {f.key === 'next' && (
                          <button
                            type="button"
                            onClick={() => setShowPw(p => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={handlePwSave}
                    className="w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    비밀번호 변경
                  </button>
                </div>
              </div>

              {/* 세션 및 접근 설정 */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-slate-600" />
                  <h3 className="font-semibold text-slate-800">세션 및 접근 설정</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-700">자동 로그아웃 (분)</label>
                    <input type="number" value={sessionTimeout}
                      onChange={e => setSessionTimeout(e.target.value)}
                      className="w-24 px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-slate-700">2단계 인증 (2FA)</div>
                      <div className="text-xs text-slate-400">로그인 시 이메일 OTP 인증</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={twoFactor}
                        onChange={e => setTwoFactor(e.target.checked)} className="sr-only peer" />
                      <div className="w-10 h-6 bg-slate-200 peer-checked:bg-blue-600 rounded-full transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-4 shadow-sm" />
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-700 mb-1.5">IP 화이트리스트</label>
                    <textarea
                      value={ipWhitelist}
                      onChange={e => setIpWhitelist(e.target.value)}
                      placeholder="허용할 IP 주소 입력 (한 줄에 하나, 비어있으면 전체 허용)"
                      rows={3}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">예: 112.162.17.116, 192.168.1.0/24</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 저장 버튼 (users/security 탭은 자체 저장 있으므로 제외) */}
          {activeTab !== 'users' && activeTab !== 'security' && (
            <div className="flex items-center justify-end gap-3">
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> 저장되었습니다
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                변경사항 저장
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
