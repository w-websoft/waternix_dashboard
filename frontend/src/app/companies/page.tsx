'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { companiesApi } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { Search, Plus, Building2, Phone, Mail, MapPin, ChevronRight, Users, RefreshCw } from 'lucide-react';
import AddCompanyModal from '@/components/company/AddCompanyModal';

interface Company {
  id: string;
  name: string;
  business_no?: string;
  businessNo?: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  equipment_count?: number;
  equipmentCount?: number;
  contract_end?: string;
  contractEnd?: string;
  status: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await companiesApi.list(search ? { search } : undefined);
      setCompanies(data as Company[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '업체 목록을 불러오지 못했습니다.');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const cities = ['all', ...Array.from(new Set(companies.map(c => c.city).filter((c): c is string => Boolean(c))))];

  const filtered = cityFilter === 'all'
    ? companies
    : companies.filter(c => c.city === cityFilter);

  const normalize = (c: Company) => ({
    businessNo: c.business_no || c.businessNo || '-',
    equipmentCount: c.equipment_count ?? c.equipmentCount ?? 0,
    contractEnd: c.contract_end || c.contractEnd,
  });

  return (
    <DashboardLayout title="업체 관리" subtitle={`총 ${companies.length}개 업체 등록`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 flex-wrap">
        <div className="relative flex-1 min-w-0 sm:min-w-48">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="업체명, 담당자, 지역, 사업자번호 검색..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {cities.map(city => (
            <button
              key={city}
              onClick={() => setCityFilter(city)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                cityFilter === city
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              )}
            >
              {city === 'all' ? '전체 지역' : city}
            </button>
          ))}
        </div>
        <button onClick={load} className="p-2 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> 업체 등록
        </button>
      </div>

      <AddCompanyModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={load}
      />

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          <span className="shrink-0">⚠️</span> {error}
        </div>
      )}

      {/* Company Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-4" />
              <div className="space-y-2">
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(company => {
            const n = normalize(company);
            return (
              <Link
                key={company.id}
                href={`/companies/${company.id}`}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group block"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors leading-tight">
                        {company.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{n.businessNo}</div>
                    </div>
                  </div>
                  <span className={cn(
                    'text-xs font-medium px-2 py-1 rounded-full',
                    company.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  )}>
                    {company.status === 'active' ? '활성' : '비활성'}
                  </span>
                </div>

                <div className="space-y-2">
                  {company.contact && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Users className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="font-medium">{company.contact}</span>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{company.phone}</span>
                    </div>
                  )}
                  {company.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{company.email}</span>
                    </div>
                  )}
                  {company.address && (
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span className="text-xs leading-relaxed">{company.address}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-xs text-slate-400">장비 수</div>
                      <div className="text-sm font-bold text-slate-800">{n.equipmentCount}대</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">계약 만료</div>
                      <div className="text-sm font-bold text-slate-800">{n.contractEnd ? formatDate(n.contractEnd) : '-'}</div>
                    </div>
                    {(company.city || company.district) && (
                      <div>
                        <div className="text-xs text-slate-400">지역</div>
                        <div className="text-sm font-bold text-slate-800">{company.city} {company.district}</div>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="py-20 text-center text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <div className="font-medium mb-1">등록된 업체가 없습니다</div>
          <div className="text-sm">업체 등록 버튼을 눌러 첫 번째 업체를 추가하세요</div>
        </div>
      )}
    </DashboardLayout>
  );
}
