import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { EquipmentStatus, FilterStatus, AlertSeverity, EquipmentType } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, decimals = 0) {
  return new Intl.NumberFormat('ko-KR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}

export function formatDate(dateStr: string | undefined) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatDateTime(dateStr: string | undefined) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function formatRelativeTime(dateStr: string | undefined) {
  if (!dateStr) return '-';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export const STATUS_CONFIG: Record<EquipmentStatus, { label: string; color: string; bg: string; dot: string }> = {
  normal:      { label: '정상',   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  warning:     { label: '경고',   color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     dot: 'bg-amber-500' },
  error:       { label: '오류',   color: 'text-red-700',     bg: 'bg-red-50 border-red-200',         dot: 'bg-red-500' },
  offline:     { label: '오프라인', color: 'text-gray-600',  bg: 'bg-gray-50 border-gray-200',       dot: 'bg-gray-400' },
  maintenance: { label: '유지보수', color: 'text-blue-700',  bg: 'bg-blue-50 border-blue-200',       dot: 'bg-blue-500' },
};

export const FILTER_STATUS_CONFIG: Record<FilterStatus, { label: string; color: string; bg: string }> = {
  normal:   { label: '정상',   color: 'text-emerald-700', bg: 'bg-emerald-50' },
  warning:  { label: '교체권고', color: 'text-amber-700',  bg: 'bg-amber-50' },
  replace:  { label: '교체필요', color: 'text-red-700',    bg: 'bg-red-50' },
  replaced: { label: '교체완료', color: 'text-gray-500',   bg: 'bg-gray-50' },
};

export const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: '긴급', color: 'text-red-700',   bg: 'bg-red-50',   border: 'border-red-200' },
  warning:  { label: '경고', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  info:     { label: '정보', color: 'text-blue-700',  bg: 'bg-blue-50',  border: 'border-blue-200' },
};

export const EQUIPMENT_TYPE_CONFIG: Record<EquipmentType, { label: string; icon: string; color: string }> = {
  ro:        { label: '역삼투압',  icon: '💧', color: 'text-blue-600' },
  di:        { label: '초순수/DI', icon: '⚗️', color: 'text-violet-600' },
  seawater:  { label: '해수담수화', icon: '🌊', color: 'text-cyan-600' },
  prefilter: { label: '전처리',   icon: '🔧', color: 'text-orange-600' },
  uv:        { label: 'UV 살균',  icon: '☀️', color: 'text-yellow-600' },
  softener:  { label: '연수기',   icon: '🧪', color: 'text-green-600' },
  booster:   { label: '부스터펌프', icon: '⚡', color: 'text-red-600' },
};

export const MAP_STATUS_COLORS: Record<EquipmentStatus, string> = {
  normal:      '#10b981',
  warning:     '#f59e0b',
  error:       '#ef4444',
  offline:     '#9ca3af',
  maintenance: '#3b82f6',
};
