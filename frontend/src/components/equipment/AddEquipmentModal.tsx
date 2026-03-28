'use client';

import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Cpu, MapPin, Wifi, Package, Loader2 } from 'lucide-react';
import { EquipmentType, CommType } from '@/types';
import { mockCompanies } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { equipmentApi } from '@/lib/api';

const WATERNIX_MODELS: Record<EquipmentType, { model: string; label: string; capacity: string }[]> = {
  ro: [
    { model: 'WRO-T10', label: '역삼투압 정수기 10LPH', capacity: '10' },
    { model: 'WRO-T30', label: '역삼투압 정수기 30LPH', capacity: '30' },
    { model: 'WRO-T100', label: '역삼투압 시스템 100LPH', capacity: '100' },
    { model: 'WRO-T500', label: '역삼투압 시스템 500LPH', capacity: '500' },
    { model: 'WRO-T1000', label: '역삼투압 시스템 1000LPH', capacity: '1000' },
    { model: 'WRO-T5000', label: '산업용 RO 5000LPH', capacity: '5000' },
  ],
  di: [
    { model: 'WDI-T30', label: '이온교환 순수기 30LPH', capacity: '30' },
    { model: 'WDI-T100', label: '이온교환 순수기 100LPH', capacity: '100' },
    { model: 'WDI-T500', label: '초순수 제조기 500LPH', capacity: '500' },
    { model: 'WDI-T1000', label: '초순수 제조기 1000LPH', capacity: '1000' },
    { model: 'WDI-T2000', label: '산업용 DI 2000LPH', capacity: '2000' },
  ],
  seawater: [
    { model: 'WSRO-T500', label: '해수담수화 500LPH', capacity: '500' },
    { model: 'WSRO-T2000', label: '해수담수화 2000LPH', capacity: '2000' },
    { model: 'WSRO-T10000', label: '해수담수화 10000LPH', capacity: '10000' },
  ],
  prefilter: [
    { model: 'WPF-SD', label: '세디먼트 전처리 필터', capacity: '0' },
    { model: 'WPF-AC', label: '활성탄 전처리 필터', capacity: '0' },
    { model: 'WPF-MM', label: '멀티미디어 여과기', capacity: '0' },
  ],
  uv: [
    { model: 'WUV-T10', label: 'UV 살균기 10LPM', capacity: '10' },
    { model: 'WUV-T30', label: 'UV 살균기 30LPM', capacity: '30' },
    { model: 'WUV-T100', label: 'UV 살균기 100LPM', capacity: '100' },
  ],
  softener: [
    { model: 'WSF-T100', label: '연수기 100LPH', capacity: '100' },
    { model: 'WSF-T500', label: '연수기 500LPH', capacity: '500' },
    { model: 'WSF-T2000', label: '산업용 연수기 2000LPH', capacity: '2000' },
  ],
  booster: [
    { model: 'WBP-T30', label: '부스터 펌프 30LPM', capacity: '30' },
    { model: 'WBP-T100', label: '부스터 펌프 100LPM', capacity: '100' },
    { model: 'WBP-T500', label: '산업용 부스터 펌프 500LPM', capacity: '500' },
  ],
};

const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  ro: '역삼투압(RO)',
  di: '초순수(DI)',
  seawater: '해수담수화',
  prefilter: '전처리 필터',
  uv: 'UV 살균기',
  softener: '연수기',
  booster: '부스터 펌프',
};

const COMM_TYPE_LABELS: Record<CommType, string> = {
  modbus_tcp: 'Modbus TCP',
  modbus_rtu: 'Modbus RTU',
  mqtt: 'MQTT',
  serial: 'RS232/RS485',
  opcua: 'OPC-UA',
  http: 'HTTP REST',
};

type Step = 'type' | 'model' | 'company' | 'location' | 'comm' | 'confirm';

const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'type', label: '장비 유형', icon: <Package className="w-4 h-4" /> },
  { id: 'model', label: '모델 선택', icon: <Cpu className="w-4 h-4" /> },
  { id: 'company', label: '업체 연결', icon: <Package className="w-4 h-4" /> },
  { id: 'location', label: '설치 위치', icon: <MapPin className="w-4 h-4" /> },
  { id: 'comm', label: '통신 설정', icon: <Wifi className="w-4 h-4" /> },
  { id: 'confirm', label: '등록 완료', icon: <Check className="w-4 h-4" /> },
];

interface FormData {
  equipmentType: EquipmentType | '';
  model: string;
  name: string;
  serialNo: string;
  companyId: string;
  address: string;
  city: string;
  district: string;
  lat: string;
  lng: string;
  installDate: string;
  warrantyEnd: string;
  capacityLph: string;
  commType: CommType | '';
  commIp: string;
  commPort: string;
  commSlaveId: string;
  commBaudRate: string;
  commMqttTopic: string;
  notes: string;
}

const INITIAL_FORM: FormData = {
  equipmentType: '', model: '', name: '', serialNo: '',
  companyId: '', address: '', city: '', district: '',
  lat: '', lng: '', installDate: '', warrantyEnd: '',
  capacityLph: '', commType: '', commIp: '', commPort: '',
  commSlaveId: '1', commBaudRate: '9600', commMqttTopic: '',
  notes: '',
};

function generateSerialNo(type: EquipmentType): string {
  const prefix = type === 'ro' ? 'WRO' : type === 'di' ? 'WDI' : type === 'seawater' ? 'WSRO' : 'WEQ';
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return `${prefix}-${year}-${seq}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd?: (data: FormData) => void;
}

export default function AddEquipmentModal({ open, onClose, onAdd }: Props) {
  const [step, setStep] = useState<Step>('type');
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  if (!open) return null;

  const stepIndex = STEPS.findIndex(s => s.id === step);

  const update = (field: keyof FormData, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleTypeSelect = (t: EquipmentType) => {
    update('equipmentType', t);
    setStep('model');
  };

  const handleModelSelect = (model: string, capacity: string) => {
    const serial = generateSerialNo(form.equipmentType as EquipmentType);
    setForm(f => ({ ...f, model, capacityLph: capacity, serialNo: serial }));
    setStep('company');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setApiError('');
    try {
      const commConfig =
        form.commType === 'modbus_tcp' ? { host: form.commIp, port: Number(form.commPort) || 502, slave_id: Number(form.commSlaveId) || 1 }
        : form.commType === 'mqtt' ? { host: form.commIp, port: Number(form.commPort) || 1883, topic: form.commMqttTopic }
        : form.commType === 'modbus_rtu' || form.commType === 'serial' ? { serial_port: form.commIp, baudrate: Number(form.commBaudRate) || 9600 }
        : form.commType === 'opcua' ? { endpoint: `opc.tcp://${form.commIp}:${form.commPort || 4840}` }
        : undefined;

      await equipmentApi.create({
        company_id: form.companyId,
        serial_no: form.serialNo,
        model: form.model,
        equipment_type: form.equipmentType,
        name: form.name || undefined,
        lat: form.lat ? Number(form.lat) : undefined,
        lng: form.lng ? Number(form.lng) : undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        district: form.district || undefined,
        install_date: form.installDate || undefined,
        warranty_end: form.warrantyEnd || undefined,
        capacity_lph: form.capacityLph ? Number(form.capacityLph) : undefined,
        comm_type: form.commType || undefined,
        comm_config: commConfig,
      });
      setSuccess(true);
      onAdd?.(form);
      setTimeout(() => {
        setSuccess(false);
        setStep('type');
        setForm(INITIAL_FORM);
        onClose();
      }, 2000);
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : '장비 등록 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 'company') return !!form.companyId;
    if (step === 'location') return !!form.city && !!form.address;
    if (step === 'comm') return !!form.commType;
    return true;
  };

  const next = () => {
    const idx = STEPS.findIndex(s => s.id === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].id);
  };
  const prev = () => {
    const idx = STEPS.findIndex(s => s.id === step);
    if (idx > 0) setStep(STEPS[idx - 1].id);
  };

  const selectedCompany = mockCompanies.find(c => c.id === form.companyId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">신규 장비 등록</h2>
            <p className="text-xs text-slate-400 mt-0.5">Waternix 자사 장비를 시스템에 등록합니다</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1 flex-1">
                <div className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all flex-shrink-0',
                  i < stepIndex ? 'bg-teal-500 text-white' :
                  i === stepIndex ? 'bg-blue-500 text-white' :
                  'bg-slate-800 text-slate-500'
                )}>
                  {i < stepIndex ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={cn('text-xs hidden sm:block truncate', i === stepIndex ? 'text-blue-400' : i < stepIndex ? 'text-teal-400' : 'text-slate-600')}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && <div className={cn('h-px flex-1 mx-1', i < stepIndex ? 'bg-teal-500/40' : 'bg-slate-700')} />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {success ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 rounded-full bg-teal-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-teal-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">장비가 등록되었습니다!</p>
                <p className="text-sm text-slate-400 mt-1">시리얼 번호: {form.serialNo}</p>
              </div>
            </div>
          ) : step === 'type' ? (
            <div>
              <p className="text-sm text-slate-400 mb-4">Waternix 장비 유형을 선택하세요</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(Object.keys(EQUIPMENT_TYPE_LABELS) as EquipmentType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => handleTypeSelect(t)}
                    className={cn(
                      'p-4 rounded-xl border text-left transition-all hover:scale-[1.02]',
                      form.equipmentType === t
                        ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                    )}
                  >
                    <div className="text-2xl mb-2">
                      {t === 'ro' ? '💧' : t === 'di' ? '🔬' : t === 'seawater' ? '🌊' : t === 'prefilter' ? '🫧' : t === 'uv' ? '☀️' : t === 'softener' ? '💎' : '⚡'}
                    </div>
                    <div className="font-semibold text-sm">{EQUIPMENT_TYPE_LABELS[t]}</div>
                    <div className="text-xs text-slate-500 mt-1">{WATERNIX_MODELS[t].length}개 모델</div>
                  </button>
                ))}
              </div>
            </div>
          ) : step === 'model' ? (
            <div>
              <p className="text-sm text-slate-400 mb-4">
                {EQUIPMENT_TYPE_LABELS[form.equipmentType as EquipmentType]} 모델을 선택하세요
              </p>
              <div className="space-y-2">
                {WATERNIX_MODELS[form.equipmentType as EquipmentType]?.map(m => (
                  <button
                    key={m.model}
                    onClick={() => handleModelSelect(m.model, m.capacity)}
                    className={cn(
                      'w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left',
                      form.model === m.model
                        ? 'border-teal-500 bg-teal-500/10 text-teal-300'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                    )}
                  >
                    <div>
                      <div className="font-bold text-sm">{m.model}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{m.label}</div>
                    </div>
                    {m.capacity !== '0' && (
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-slate-500">처리 용량</div>
                        <div className="font-bold text-teal-400">{Number(m.capacity).toLocaleString()} L/h</div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-4 p-3 bg-slate-800 rounded-xl">
                <label className="block text-xs text-slate-400 mb-1">장비 별칭 (선택)</label>
                <input
                  type="text"
                  placeholder="예: 1호기, 강남 #1"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          ) : step === 'company' ? (
            <div>
              <p className="text-sm text-slate-400 mb-4">장비를 설치할 업체를 선택하세요</p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {mockCompanies.map(c => (
                  <button
                    key={c.id}
                    onClick={() => update('companyId', c.id)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left',
                      form.companyId === c.id
                        ? 'border-teal-500 bg-teal-500/10'
                        : 'border-slate-700 bg-slate-800 hover:border-slate-500'
                    )}
                  >
                    <div>
                      <div className={cn('font-semibold text-sm', form.companyId === c.id ? 'text-teal-300' : 'text-white')}>
                        {c.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{c.city} {c.district} · {c.contact}</div>
                    </div>
                    {form.companyId === c.id && <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          ) : step === 'location' ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">설치 위치를 입력하세요</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">시/도 *</label>
                  <select
                    value={form.city}
                    onChange={e => update('city', e.target.value)}
                    className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">선택</option>
                    {['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">구/군</label>
                  <input type="text" placeholder="예: 강남구" value={form.district} onChange={e => update('district', e.target.value)}
                    className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">상세 주소 *</label>
                <input type="text" placeholder="예: 서울특별시 강남구 테헤란로 518" value={form.address} onChange={e => update('address', e.target.value)}
                  className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">위도</label>
                  <input type="number" step="0.0001" placeholder="37.5172" value={form.lat} onChange={e => update('lat', e.target.value)}
                    className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">경도</label>
                  <input type="number" step="0.0001" placeholder="127.0473" value={form.lng} onChange={e => update('lng', e.target.value)}
                    className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">설치일</label>
                  <input type="date" value={form.installDate} onChange={e => update('installDate', e.target.value)}
                    className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">보증 만료일</label>
                  <input type="date" value={form.warrantyEnd} onChange={e => update('warrantyEnd', e.target.value)}
                    className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
            </div>
          ) : step === 'comm' ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">통신 방식을 설정하세요</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(COMM_TYPE_LABELS) as CommType[]).map(ct => (
                  <button
                    key={ct}
                    onClick={() => update('commType', ct)}
                    className={cn(
                      'p-3 rounded-xl border text-sm font-medium transition-all text-left',
                      form.commType === ct
                        ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-white'
                    )}
                  >
                    <div className="text-xs text-slate-500">{ct}</div>
                    <div className="font-semibold mt-0.5">{COMM_TYPE_LABELS[ct]}</div>
                  </button>
                ))}
              </div>
              {form.commType && (
                <div className="border border-slate-700 rounded-xl p-4 space-y-3 bg-slate-800/50">
                  {(form.commType === 'modbus_tcp' || form.commType === 'mqtt' || form.commType === 'opcua' || form.commType === 'http') && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">IP 주소</label>
                        <input type="text" placeholder="192.168.1.100" value={form.commIp} onChange={e => update('commIp', e.target.value)}
                          className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">포트</label>
                        <input type="number" placeholder={form.commType === 'modbus_tcp' ? '502' : form.commType === 'mqtt' ? '1883' : '4840'}
                          value={form.commPort} onChange={e => update('commPort', e.target.value)}
                          className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none" />
                      </div>
                    </div>
                  )}
                  {form.commType === 'modbus_tcp' && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">슬레이브 ID</label>
                      <input type="number" min="1" max="247" value={form.commSlaveId} onChange={e => update('commSlaveId', e.target.value)}
                        className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none" />
                    </div>
                  )}
                  {(form.commType === 'modbus_rtu' || form.commType === 'serial') && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">시리얼 포트</label>
                        <input type="text" placeholder="/dev/ttyUSB0" value={form.commIp} onChange={e => update('commIp', e.target.value)}
                          className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">보레이트</label>
                        <select value={form.commBaudRate} onChange={e => update('commBaudRate', e.target.value)}
                          className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none">
                          {['1200', '2400', '4800', '9600', '19200', '38400', '57600', '115200'].map(b => (
                            <option key={b} value={b}>{b} bps</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  {form.commType === 'mqtt' && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">MQTT 토픽 접두사</label>
                      <input type="text" placeholder="waternix/devices/{serial}" value={form.commMqttTopic} onChange={e => update('commMqttTopic', e.target.value)}
                        className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none" />
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-xs text-slate-400 mb-1">비고</label>
                <textarea rows={2} placeholder="특이사항, 설치 환경 등" value={form.notes} onChange={e => update('notes', e.target.value)}
                  className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none resize-none" />
              </div>
            </div>
          ) : step === 'confirm' ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">등록 정보를 확인하세요</p>
              <div className="bg-slate-800 rounded-xl divide-y divide-slate-700 overflow-hidden">
                {[
                  { label: '장비 유형', value: EQUIPMENT_TYPE_LABELS[form.equipmentType as EquipmentType] },
                  { label: '모델', value: form.model },
                  { label: '장비 별칭', value: form.name || '-' },
                  { label: '시리얼 번호', value: form.serialNo },
                  { label: '업체', value: selectedCompany?.name || '-' },
                  { label: '설치 주소', value: form.address || '-' },
                  { label: '통신 방식', value: COMM_TYPE_LABELS[form.commType as CommType] || '-' },
                  { label: '처리 용량', value: form.capacityLph ? `${Number(form.capacityLph).toLocaleString()} L/h` : '-' },
                ].map(row => (
                  <div key={row.label} className="flex items-center px-4 py-2.5 gap-4">
                    <span className="text-xs text-slate-500 w-28 flex-shrink-0">{row.label}</span>
                    <span className="text-sm text-white font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
            <button
              onClick={prev}
              disabled={stepIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> 이전
            </button>
            {step === 'confirm' ? (
              <div className="flex flex-col items-end gap-2">
                {apiError && <p className="text-xs text-red-400">{apiError}</p>}
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-teal-500/30"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {loading ? '등록 중...' : '장비 등록'}
                </button>
              </div>
            ) : (
              <button
                onClick={next}
                disabled={!canNext() && step !== 'type' && step !== 'model'}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                다음 <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
