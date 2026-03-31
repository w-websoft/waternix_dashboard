/**
 * Waternix 백엔드 API 클라이언트
 * NEXT_PUBLIC_API_URL 환경변수로 API 서버 주소 설정
 */

const _apiUrl = process.env.NEXT_PUBLIC_API_URL;
const BASE = (_apiUrl && _apiUrl.startsWith('http'))
  ? `${_apiUrl}/api`
  : '/api';

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('waternix_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...options.headers },
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

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  total_equipment: number;
  normal_count: number;
  warning_count: number;
  error_count: number;
  offline_count: number;
  maintenance_count: number;
  total_companies: number;
  today_volume: number;
  monthly_volume: number;
  pending_maintenance: number;
  filter_replace: number;
  unresolved_alerts: number;
}

export const dashboardApi = {
  getSummary: () => request<DashboardSummary>('/dashboard/summary'),
};

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

export interface CompanyDetailPayload extends CompanyPayload {
  equipment_count?: number;
}

export const companiesApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<CompanyDetailPayload[]>(`/companies${qs}`);
  },
  create: (data: CompanyPayload) =>
    request<CompanyDetailPayload>('/companies', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: string) => request<CompanyDetailPayload>(`/companies/${id}`),
  update: (id: string, data: Partial<CompanyPayload>) =>
    request<CompanyDetailPayload>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getEquipment: (id: string) => request<EquipmentPayload[]>(`/companies/${id}/equipment`),
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
  id?: string;
  company_id: string;
  company_name?: string;
  serial_no: string;
  model: string;
  equipment_type: string;
  name?: string;
  status?: string;
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
  created_at?: string;
  updated_at?: string;
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
  id?: string;
  equipment_id?: string;
  company_id?: string;
  equipment_name?: string;
  company_name?: string;
  type: string;
  title: string;
  description?: string;
  technician?: string;
  scheduled_date?: string;
  completed_date?: string;
  cost?: number;
  parts_used?: string;
  notes?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export const maintenanceApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<MaintenancePayload[]>(`/maintenance${qs}`);
  },
  create: (data: Partial<MaintenancePayload>) =>
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
  create: (data: Partial<FilterPayload>) =>
    request<FilterPayload>('/filters', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<FilterPayload>) =>
    request<FilterPayload>(`/filters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/filters/${id}`, { method: 'DELETE' }),
};

// ─── Equipment Catalog (워터닉스 자사 제품 카탈로그) ─────────────────────────

export interface EquipmentCatalogItem {
  id: string;
  model_code: string;
  model_name: string;
  equipment_type: string;
  series?: string;
  category?: string;
  description?: string;
  specs?: Record<string, unknown>;
  default_consumables?: Array<{ part_no: string; name: string; interval_days: number }>;
  features?: string[];
  applications?: string[];
  dimensions?: string;
  weight_kg?: number;
  power_supply?: string;
  removal_rate?: string;
  flow_rate_lph?: number;
  daily_volume_m3?: number;
  catalog_page_url?: string;
  warranty_months: number;
  sell_price?: number;
  cost_price?: number;
  lead_time_days: number;
  image_url?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const equipmentCatalogApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<EquipmentCatalogItem[]>(`/equipment-catalog${qs}`);
  },
  get: (modelCode: string) => request<EquipmentCatalogItem>(`/equipment-catalog/${encodeURIComponent(modelCode)}`),
  create: (data: Partial<EquipmentCatalogItem>) =>
    request<EquipmentCatalogItem>('/equipment-catalog', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<EquipmentCatalogItem>) =>
    request<EquipmentCatalogItem>(`/equipment-catalog/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/equipment-catalog/${id}`, { method: 'DELETE' }),
  seed: () => request<{ inserted: number; total: number }>('/equipment-catalog/seed', { method: 'POST' }),
};

// ─── Consumable Catalog (소모품/부품 카탈로그) ────────────────────────────────

export interface ConsumableCatalogItem {
  id: string;
  part_no: string;
  name: string;
  category?: string;
  equipment_type?: string;
  compatible_models?: string[];
  unit: string;
  replace_interval_hours?: number;
  sell_price?: number;
  cost_price?: number;
  min_order_qty: number;
  supplier?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export const consumableCatalogApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<ConsumableCatalogItem[]>(`/catalog${qs}`);
  },
  create: (data: Partial<ConsumableCatalogItem>) =>
    request<ConsumableCatalogItem>('/catalog', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ConsumableCatalogItem>) =>
    request<ConsumableCatalogItem>(`/catalog/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/catalog/${id}`, { method: 'DELETE' }),
  seed: () => request<{ inserted: number; skipped: number }>('/catalog/seed', { method: 'POST' }),
};

// ─── System Settings ──────────────────────────────────────────────────────────

export const systemSettingsApi = {
  getAll: () => request<Record<string, { value: string; category: string; description: string }>>('/settings'),
  getByCategory: (category: string) => request<Record<string, string>>(`/settings/${category}`),
  update: (payload: Record<string, string>) =>
    request<{ message: string }>('/settings', { method: 'PATCH', body: JSON.stringify(payload) }),
};

// ─── Auth Users ────────────────────────────────────────────────────────────────

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export const authUsersApi = {
  list: () => request<UserRecord[]>('/auth/users'),
  create: (data: { username: string; email: string; password: string; full_name?: string; role: string }) =>
    request<UserRecord>('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<UserRecord>) =>
    request<{ message: string }>(`/auth/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/auth/users/${id}`, { method: 'DELETE' }),
  changePassword: (data: { current_password: string; new_password: string }) =>
    request<{ message: string }>('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Service Requests (A/S 서비스 요청) ──────────────────────────────────────

export interface ServiceRequest {
  id: string;
  request_no: string;
  equipment_id?: string;
  company_id?: string;
  equipment_name?: string;
  company_name?: string;
  request_type: string;
  priority: string;
  title: string;
  description?: string;
  assigned_technician_id?: string;
  technician_name?: string;
  status: string;
  scheduled_date?: string;
  arrived_at?: string;
  completed_at?: string;
  parts_used?: Array<{ name: string; qty: number; unit_price?: number }>;
  labor_hours?: number;
  labor_cost?: number;
  parts_cost?: number;
  total_cost?: number;
  report_notes?: string;
  customer_rating?: number;
  customer_feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequestListResponse {
  items: ServiceRequest[];
  total: number;
  page: number;
  page_size: number;
}

export const serviceRequestApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<ServiceRequestListResponse>(`/service-requests${qs}`);
  },
  get: (id: string) => request<ServiceRequest>(`/service-requests/${id}`),
  stats: () => request<{ open_count: number; completed_count: number; urgent_count: number; pending_dispatch: number; monthly: number }>('/service-requests/stats'),
  create: (data: Partial<ServiceRequest>) =>
    request<ServiceRequest>('/service-requests', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ServiceRequest>) =>
    request<ServiceRequest>(`/service-requests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  dispatch: (id: string, data: { technician_id?: string; technician_name: string; scheduled_date?: string }) =>
    request<ServiceRequest>(`/service-requests/${id}/dispatch`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string) =>
    request<ServiceRequest>(`/service-requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  complete: (id: string, data: object) =>
    request<ServiceRequest>(`/service-requests/${id}/complete`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/service-requests/${id}`, { method: 'DELETE' }),
};

// ─── Quotations (견적서) ────────────────────────────────────────────────────────

export interface QuotationItem {
  type: string;
  model_code?: string;
  name: string;
  qty: number;
  unit_price: number;
  amount: number;
  notes?: string;
}

export interface Quotation {
  id: string;
  quote_no: string;
  company_id?: string;
  company_name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  items: QuotationItem[];
  subtotal: number;
  tax: number;
  total: number;
  valid_until?: string;
  status: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const quotationApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ items: Quotation[]; total: number }>(`/quotations${qs}`);
  },
  get: (id: string) => request<Quotation>(`/quotations/${id}`),
  create: (data: Partial<Quotation>) =>
    request<Quotation>('/quotations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Quotation>) =>
    request<Quotation>(`/quotations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  send: (id: string) => request<Quotation>(`/quotations/${id}/send`, { method: 'PATCH' }),
  accept: (id: string) => request<{ message: string; contract_no: string }>(`/quotations/${id}/accept`, { method: 'PATCH' }),
  delete: (id: string) => request<void>(`/quotations/${id}`, { method: 'DELETE' }),
};

// ─── Contracts (계약 관리) ──────────────────────────────────────────────────────

export interface Contract {
  id: string;
  contract_no: string;
  company_id?: string;
  company_name?: string;
  quotation_id?: string;
  contract_type: string;
  contract_type_label?: string;
  title?: string;
  start_date?: string;
  end_date?: string;
  amount: number;
  payment_terms?: string;
  scope?: string;
  status: string;
  assigned_sales_id?: string;
  sales_name?: string;
  notes?: string;
  days_remaining?: number;
  created_at: string;
  updated_at: string;
}

export const contractApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<{ items: Contract[]; total: number }>(`/contracts${qs}`);
  },
  get: (id: string) => request<Contract>(`/contracts/${id}`),
  expiring: () => request<Contract[]>('/contracts/expiring'),
  create: (data: Partial<Contract>) =>
    request<Contract>('/contracts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Contract>) =>
    request<Contract>(`/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/contracts/${id}`, { method: 'DELETE' }),
};

// ─── Upload API ────────────────────────────────────────────────────────────────

export const uploadApi = {
  uploadImage: async (file: File, category = 'catalog'): Promise<{ url: string; filename: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = typeof window !== 'undefined' ? localStorage.getItem('waternix_token') : null;
    const res = await fetch(`${BASE}/uploads/image?category=${category}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  updateCatalogImage: (catalogId: string, imageUrl: string) =>
    request<{ id: string; image_url: string }>(`/equipment-catalog/${catalogId}/image`, {
      method: 'PATCH',
      body: JSON.stringify({ image_url: imageUrl }),
    }),
};

// ─── 도로명주소 API (행정안전부 Open API) ───────────────────────────────────────

export interface JusoResult {
  roadAddr: string;
  roadAddrPart1: string;
  addrDetail?: string;
  zipNo: string;
  siNm: string;
  sggNm: string;
  emdNm: string;
  x?: string; // 경도
  y?: string; // 위도
  lat?: number;
  lng?: number;
}

export const jusoApi = {
  search: async (keyword: string, confmKey?: string): Promise<JusoResult[]> => {
    const key = confmKey || process.env.NEXT_PUBLIC_JUSO_API_KEY || 'devtools_key';
    const params = new URLSearchParams({
      currentPage: '1',
      countPerPage: '10',
      keyword,
      confmKey: key,
      resultType: 'json',
      addInfoYn: 'Y',
    });
    const res = await fetch(
      `https://business.juso.go.kr/addrlink/addrLinkApi.do?${params.toString()}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.results?.juso || []) as JusoResult[];
  },
};

// ─── User Management API ──────────────────────────────────────────────────────

export interface UserPayload {
  id?: string;
  username: string;
  email: string;
  full_name?: string;
  role: string;
  company_id?: string;
  is_active?: boolean;
  password?: string;
  created_at?: string;
}

export const userApi = {
  list: () => request<UserPayload[]>('/auth/users'),
  create: (data: Partial<UserPayload> & { password: string }) =>
    request<UserPayload>('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<UserPayload>) =>
    request<UserPayload>(`/auth/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/auth/users/${id}`, { method: 'DELETE' }),
};
