'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { dashboardApi } from '@/lib/api';
import {
  LayoutDashboard, MapPin, Wrench, Building2,
  Package, BarChart3, Settings, Droplets, Bell, ChevronRight, X, Box,
  HeadphonesIcon, FileText, FileSignature
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [badges, setBadges] = useState({ maintenance: 0, consumables: 0, alerts: 0 });

  useEffect(() => {
    dashboardApi.getSummary()
      .then(s => setBadges({
        maintenance: s.pending_maintenance || 0,
        consumables: s.filter_replace || 0,
        alerts: s.unresolved_alerts || 0,
      }))
      .catch(() => {});
  }, []);

  const NAV_ITEMS = [
    { href: '/',             icon: LayoutDashboard,  label: '대시보드',    badge: null },
    { href: '/equipment',   icon: MapPin,            label: '장비 관리',   badge: null },
    { href: '/companies',   icon: Building2,         label: '업체 관리',   badge: null },
    { href: '/catalog',     icon: Box,               label: '카탈로그',    badge: null },
    { href: '/maintenance', icon: Wrench,            label: '유지보수',    badge: badges.maintenance || null },
    { href: '/service',     icon: HeadphonesIcon,    label: 'A/S 관리',    badge: null },
    { href: '/quotations',  icon: FileText,          label: '견적서',      badge: null },
    { href: '/contracts',   icon: FileSignature,     label: '계약 관리',   badge: null },
    { href: '/consumables', icon: Package,           label: '소모품/재고', badge: badges.consumables || null },
    { href: '/reports',     icon: BarChart3,         label: '보고서',      badge: null },
    { href: '/alerts',      icon: Bell,              label: '알림 관리',   badge: badges.alerts || null },
    { href: '/settings',    icon: Settings,          label: '시스템 설정', badge: null },
  ];

  return (
    <>
      {/* 모바일/태블릿 오버레이 */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* 사이드바 */}
      <aside className={cn(
        'fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto',
        'flex flex-col w-64 bg-slate-900 text-white h-screen flex-shrink-0',
        'transform transition-transform duration-300 ease-in-out lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white text-sm leading-tight">워터닉스</div>
              <div className="text-xs text-slate-400 leading-tight truncate">IoT 장비 관리</div>
            </div>
          </div>
          {/* 모바일/태블릿 닫기 버튼 */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label, badge }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )}
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
                <span className="flex-1">{label}</span>
                {badge !== null && (
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full font-semibold',
                    isActive ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
                  )}>
                    {badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-4 h-4 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="px-4 py-4 border-t border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">관</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white truncate">슈퍼 관리자</div>
              <div className="text-xs text-slate-400 truncate">admin@waternix.com</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
