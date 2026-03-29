'use client';

import { Bell, RefreshCw, Menu, Search, X, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { alertsApi } from '@/lib/api';
import Link from 'next/link';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuToggle?: () => void;
}

export default function Header({ title, subtitle, onMenuToggle }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('waternix_token');
    localStorage.removeItem('waternix_user');
    document.cookie = 'waternix_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.replace('/login');
  };

  useEffect(() => {
    alertsApi.list({ resolved: 'false' })
      .then(data => setUnreadAlerts(data.length))
      .catch(() => setUnreadAlerts(0));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 px-3 sm:px-6 py-3 sticky top-0 z-10">
      {/* 메인 헤더 행 */}
      <div className="flex items-center justify-between gap-2">
        {/* 왼쪽: 햄버거 + 타이틀 */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* 햄버거 버튼 (모바일/태블릿) */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 -ml-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-slate-900 truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-slate-500 truncate hidden sm:block">{subtitle}</p>
            )}
          </div>
        </div>

        {/* 오른쪽: 검색 + 시간 + 버튼들 */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* 시간 (sm 이상) */}
          <div className="text-right hidden lg:block">
            <div className="text-sm font-semibold text-slate-700">
              {currentTime.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-xs text-slate-400">실시간 업데이트</div>
          </div>

          <div className="hidden lg:block w-px h-8 bg-slate-200" />

          {/* 검색 (데스크톱: 인라인, 모바일: 토글) */}
          <div className="hidden sm:flex relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="장비명, 업체명 검색..."
              className="pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg w-44 lg:w-56 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 모바일 검색 버튼 */}
          <button
            onClick={() => setSearchOpen(v => !v)}
            className="sm:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>

          <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link href="/alerts" className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <Bell className="w-4 h-4" />
            {unreadAlerts > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </span>
            )}
          </Link>

          <button
            onClick={handleLogout}
            title="로그아웃"
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 모바일 검색 확장 */}
      {searchOpen && (
        <div className="sm:hidden mt-2 pb-1">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              type="text"
              placeholder="장비명, 업체명 검색..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </header>
  );
}
