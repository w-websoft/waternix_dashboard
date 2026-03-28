'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { cn } from '@/lib/utils';
import { Settings, Bell, Shield, Wifi, Users } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  const TABS = [
    { id: 'general',  label: '일반 설정', icon: Settings },
    { id: 'alerts',   label: '알림 설정', icon: Bell },
    { id: 'comms',    label: '통신 설정', icon: Wifi },
    { id: 'users',    label: '사용자 관리', icon: Users },
    { id: 'security', label: '보안', icon: Shield },
  ];

  return (
    <DashboardLayout title="시스템 설정" subtitle="워터닉스 IoT 관리 시스템 환경 설정">
      <div className="flex gap-6">
        {/* Tab Navigation */}
        <div className="w-52 flex-shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 p-2 space-y-0.5">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
                    activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5">
          {activeTab === 'general' && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-800 mb-4">회사 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: '회사명', value: '(주)워터닉스', type: 'text' },
                    { label: '사업자등록번호', value: '621-81-12345', type: 'text' },
                    { label: '대표자', value: '김워터', type: 'text' },
                    { label: '연락처', value: '051-202-3055', type: 'tel' },
                    { label: '이메일', value: 'waternix@naver.com', type: 'email' },
                    { label: '주소', value: '부산광역시 남구 수영로 309', type: 'text' },
                  ].map(field => (
                    <div key={field.label}>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">{field.label}</label>
                      <input
                        type={field.type}
                        defaultValue={field.value}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-800 mb-4">데이터 수집 설정</h3>
                <div className="space-y-4">
                  {[
                    { label: '센서 데이터 수집 주기', value: '30', unit: '초' },
                    { label: '하트비트 간격', value: '60', unit: '초' },
                    { label: '오프라인 판단 기준', value: '5', unit: '분' },
                    { label: '데이터 보관 기간', value: '365', unit: '일' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between">
                      <label className="text-sm text-slate-700">{s.label}</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          defaultValue={s.value}
                          className="w-20 px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-500">{s.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'comms' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">통신 프로토콜 설정</h3>
              <div className="space-y-6">
                {[
                  {
                    title: 'MQTT 브로커',
                    fields: [
                      { label: '브로커 호스트', value: 'mqtt.waternix.com', type: 'text' },
                      { label: '포트', value: '8883', type: 'number' },
                      { label: 'TLS 암호화', value: true, type: 'checkbox' },
                      { label: '클라이언트 ID 접두사', value: 'waternix_', type: 'text' },
                    ]
                  },
                  {
                    title: 'Modbus TCP 기본 설정',
                    fields: [
                      { label: '연결 타임아웃 (ms)', value: '3000', type: 'number' },
                      { label: '재시도 횟수', value: '3', type: 'number' },
                      { label: '폴링 간격 (ms)', value: '5000', type: 'number' },
                    ]
                  },
                  {
                    title: 'RS485/시리얼 기본 설정',
                    fields: [
                      { label: '기본 보레이트', value: '19200', type: 'number' },
                      { label: '데이터 비트', value: '8', type: 'number' },
                      { label: '정지 비트', value: '1', type: 'number' },
                    ]
                  },
                ].map(section => (
                  <div key={section.title}>
                    <h4 className="text-sm font-semibold text-slate-600 mb-3 pb-2 border-b border-slate-100">{section.title}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {section.fields.map(field => (
                        <div key={field.label}>
                          <label className="block text-xs text-slate-500 mb-1">{field.label}</label>
                          {field.type === 'checkbox' ? (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" defaultChecked={field.value as boolean} className="w-4 h-4 rounded" />
                              <span className="text-sm text-slate-700">활성화</span>
                            </label>
                          ) : (
                            <input
                              type={field.type}
                              defaultValue={field.value as string}
                              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-4">알림 임계값 설정</h3>
              <div className="space-y-4">
                {[
                  { label: '정수 TDS 경고 기준 (ppm)', value: 20, critical: 50 },
                  { label: '오염물 제거율 경고 기준 (%)', value: 95, critical: 90 },
                  { label: '입구 압력 최대값 (bar)', value: 10, critical: 12 },
                  { label: '필터 수명 경고 기준 (%)', value: 80, critical: 95 },
                  { label: '오프라인 경고 기준 (분)', value: 5, critical: 30 },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <label className="text-sm text-slate-700 flex-1">{item.label}</label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-xs text-slate-500">경고:</span>
                        <input type="number" defaultValue={item.value} className="w-16 px-2 py-1 text-xs bg-amber-50 border border-amber-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-amber-400" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-xs text-slate-500">긴급:</span>
                        <input type="number" defaultValue={item.critical} className="w-16 px-2 py-1 text-xs bg-red-50 border border-red-200 rounded text-center focus:outline-none focus:ring-1 focus:ring-red-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <button className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              취소
            </button>
            <button className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              변경사항 저장
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
