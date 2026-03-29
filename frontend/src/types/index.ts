export type EquipmentType =
  | 'ro'         // 역삼투압 시스템 (WRO)
  | 'cooling'    // 냉각수 스케일제거 시스템 (DCRO)
  | 'di'         // 초순수/DI 시스템 (WDI)
  | 'seawater'   // 해수담수화 시스템 (WSRO)
  | 'uf'         // 양액회수·재생 시스템 (WUF)
  | 'small'      // 소형 시스템 (T05/T20)
  | 'prefilter'  // 전처리 필터
  | 'uv'         // UV살균 시스템 (WUV)
  | 'softener'   // 연수 시스템 (WSF)
  | 'filtration' // 여과 시스템
  | 'booster';   // 부스터펌프
export type EquipmentStatus = 'normal' | 'warning' | 'error' | 'offline' | 'maintenance';
export type FilterStatus = 'normal' | 'warning' | 'replace' | 'replaced';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type MaintenanceType = 'preventive' | 'corrective' | 'emergency' | 'inspection';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type UserRole = 'superadmin' | 'admin' | 'technician' | 'viewer';
export type CommType = 'modbus_tcp' | 'modbus_rtu' | 'mqtt' | 'serial' | 'opcua' | 'http';

export interface Company {
  id: string;
  name: string;
  businessNo?: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  contractStart?: string;
  contractEnd?: string;
  status: 'active' | 'inactive' | 'suspended';
  equipmentCount?: number;
  createdAt: string;
}

export interface Equipment {
  id: string;
  companyId: string;
  companyName?: string;
  serialNo: string;
  model: string;
  equipmentType: EquipmentType;
  name?: string;
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  district?: string;
  installDate?: string;
  warrantyEnd?: string;
  status: EquipmentStatus;
  capacityLph?: number;
  commType?: CommType;
  commConfig?: Record<string, unknown>;
  lastSeen?: string;
  sensorData?: SensorData;
}

export interface SensorData {
  equipmentId: string;
  timestamp: string;
  flowRate?: number;
  dailyVolume?: number;
  inletPressure?: number;
  outletPressure?: number;
  inletTds?: number;
  outletTds?: number;
  rejectionRate?: number;
  temperature?: number;
  powerKw?: number;
  runningHours?: number;
  errorCode?: string;
}

export interface Filter {
  id: string;
  equipmentId: string;
  equipmentName?: string;
  companyName?: string;
  filterType: 'sediment' | 'carbon' | 'ro_membrane' | 'uv' | 'resin' | 'antiscalant';
  filterName?: string;
  stage?: number;
  installDate?: string;
  replaceDate?: string;
  lifeHours?: number;
  lifeVolume?: number;
  usedHours?: number;
  usedVolume?: number;
  usedPercent?: number;
  status: FilterStatus;
  supplier?: string;
  partNo?: string;
  cost?: number;
}

export interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  equipmentName?: string;
  companyId: string;
  companyName?: string;
  type: MaintenanceType;
  title: string;
  description?: string;
  technician?: string;
  scheduledDate?: string;
  completedDate?: string;
  status: MaintenanceStatus;
  partsUsed?: Array<{ name: string; qty: number; cost: number }>;
  laborHours?: number;
  cost?: number;
  nextMaintenance?: string;
}

export interface Alert {
  id: string;
  equipmentId: string;
  equipmentName?: string;
  companyId: string;
  companyName?: string;
  severity: AlertSeverity;
  type: string;
  title: string;
  message?: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface Consumable {
  id: string;
  companyId?: string;
  companyName?: string;
  name: string;
  category: 'filter' | 'chemical' | 'membrane' | 'pump' | 'sensor' | 'other';
  partNo?: string;
  brand?: string;
  unit: string;
  stockQty: number;
  minQty?: number;
  unitCost?: number;
  supplier?: string;
  isLow?: boolean;
}

export interface DashboardSummary {
  totalEquipment: number;
  normalCount: number;
  warningCount: number;
  errorCount: number;
  offlineCount: number;
  maintenanceCount: number;
  totalCompanies: number;
  todayVolume: number;
  monthlyVolume: number;
  pendingMaintenance: number;
  filterReplace: number;
  unresolvedAlerts: number;
}
