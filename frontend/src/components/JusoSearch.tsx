'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';
import { jusoApi, JusoResult } from '@/lib/api';

interface JusoSearchProps {
  onSelect: (result: JusoResult & { lat?: number; lng?: number }) => void;
  initialValue?: string;
  placeholder?: string;
  label?: string;
}

/**
 * 행정안전부 도로명주소 API 검색 컴포넌트
 * 주소 선택 시 위도/경도를 OpenStreetMap Nominatim으로 역지오코딩하여 반환
 */
export default function JusoSearch({ onSelect, initialValue, placeholder, label }: JusoSearchProps) {
  const [query, setQuery] = useState(initialValue || '');
  const [results, setResults] = useState<JusoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await jusoApi.search(query);
        setResults(items);
        setOpen(items.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [query]);

  const handleSelect = async (r: JusoResult) => {
    setQuery(r.roadAddr);
    setOpen(false);
    setResults([]);

    // Nominatim으로 좌표 조회
    try {
      const encoded = encodeURIComponent(`${r.roadAddr}`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=kr`,
        { headers: { 'Accept-Language': 'ko' } },
      );
      const data = await res.json();
      if (data?.[0]) {
        onSelect({ ...r, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        return;
      }
    } catch { /* fallback */ }
    onSelect(r);
  };

  return (
    <div className="relative">
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          className="w-full pl-9 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={placeholder || '도로명주소 또는 건물명 입력'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />}
        {!loading && query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-blue-50 text-left border-b border-slate-100 last:border-0"
              onClick={() => handleSelect(r)}
            >
              <MapPin size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-slate-800">{r.roadAddr}</p>
                <p className="text-xs text-slate-400">우편번호 {r.zipNo}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
