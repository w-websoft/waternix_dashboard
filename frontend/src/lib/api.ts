/**
 * Waternix 백엔드 API 클라이언트
 * NEXT_PUBLIC_API_URL 환경변수로 API 서버 주소 설정
 */

const BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : '/api';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      detail = err.detail || detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Company ──────────────────────────────────────────────────────────────────

export interface CompanyPayload {
  id?: string;
  name: string;
  business_no?: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  contract_start?: string;
  contract_end?: string;
  notes?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export const companiesApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<CompanyPayload[]>(`/companies${qs}`);
  },
  create: (data: CompanyPayload) =>
    request<CompanyPayload>('/companies', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: string) => request<CompanyPayload>(`/companies/${id}`),
  update: (id: string, data: Partial<CompanyPayload>) =>
    request<CompanyPayload>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// ─── Equipment ────────────────────────────────────────────────────────────────

export interface CommConfig {
  host?: string;
  port?: number;
  slave_id?: number;
  topic?: string;
  serial_port?: string;
  baudrate?: number;
  endpoint?: string;
}

export interface EquipmentPayload {
  company_id: string;
  serial_no: string;
  model: string;
  equipment_type: string;
  name?: string;
  lat?: number;
  lng?: number;
  address?: string;
  city?: string;
  district?: string;
  install_date?: string;
  warranty_end?: string;
  capacity_lph?: number;
  comm_type?: string;
  comm_config?: CommConfig;
}

export const equipmentApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<EquipmentPayload[]>(`/equipment${qs}`);
  },
  create: (data: EquipmentPayload) =>
    request<EquipmentPayload>('/equipment', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: string) => request<EquipmentPayload>(`/equipment/${id}`),
  update: (id: string, data: Partial<EquipmentPayload>) =>
    request<EquipmentPayload>(`/equipment/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/equipment/${id}`, { method: 'DELETE' }),
};

// ─── Consumables ──────────────────────────────────────────────────────────────

export interface ConsumablePayload {
  id?: string;
  name: string;
  category: string;
  part_no?: string;
  brand?: string;
  unit?: string;
  stock_qty?: number;
  min_qty?: number;
  unit_cost?: number;
  supplier?: string;
  description?: string;
  is_low?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const consumablesApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<ConsumablePayload[]>(`/consumables${qs}`);
  },
  create: (data: ConsumablePayload) =>
    request<ConsumablePayload>('/consumables', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: ConsumablePayload) =>
    request<ConsumablePayload>(`/consumables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/consumables/${id}`, { method: 'DELETE' }),
};

// ─── Maintenance ──────────────────────────────────────────────────────────────

export interface MaintenancePayload {
  equipment_id: string;
  company_id: string;
  type: string;
  title: string;
  description?: string;
  technician?: string;
  scheduled_date?: string;
  labor_hours?: number;
  cost?: number;
  next_maintenance?: string;
}

export const maintenanceApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<MaintenancePayload[]>(`/maintenance${qs}`);
  },
  create: (data: MaintenancePayload) =>
    request<MaintenancePayload>('/maintenance', { method: 'POST', body: JSON.stringify(data) }),
  complete: (id: string, data: object) =>
    request<MaintenancePayload>(`/maintenance/${id}/complete`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/maintenance/${id}`, { method: 'DELETE' }),
};

// ─── Alerts ───────────────────────────────────────────────────────────────────

export interface AlertPayload {
  id: string;
  equipment_id?: string;
  equipment_name?: string;
  company_name?: string;
  severity: string;
  type: string;
  title: string;
  message?: string;
  acknowledged: boolean;
  process_step: string;
  assignee?: string;
  process_comment?: string;
  process_updated_at?: string;
  created_at: string;
}

export const alertsApi = {
  list: (params?: Record<string, string | boolean | undefined>) => {
    const clean: Record<string, string> = {};
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) clean[k] = String(v);
      }
    }
    const qs = Object.keys(clean).length ? '?' + new URLSearchParams(clean).toString() : '';
    return request<AlertPayload[]>(`/alerts${qs}`);
  },
  create: (data: Partial<AlertPayload>) =>
    request<AlertPayload>('/alerts', { method: 'POST', body: JSON.stringify(data) }),
  process: (id: string, data: { process_step: string; assignee?: string; process_comment?: string }) =>
    request<AlertPayload>(`/alerts/${id}/process`, { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/alerts/${id}`, { method: 'DELETE' }),
};

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface FilterPayload {
  id: string;
  equipment_id?: string;
  equipment_name?: string;
  company_name?: string;
  filter_name: string;
  filter_type?: string;
  stage?: number;
  install_date?: string;
  replace_date?: string;
  used_percent: number;
  status: string;
  part_no?: string;
  supplier?: string;
  created_at: string;
}

export const filtersApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<FilterPayload[]>(`/filters${qs}`);
  },
};
