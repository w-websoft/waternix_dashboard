'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { X, ChevronRight, ChevronLeft, Check, Cpu, MapPin, Wifi, Package, Loader2, Box } from 'lucide-react';
import { EquipmentType, CommType } from '@/types';
import { cn } from '@/lib/utils';
import { equipmentApi, companiesApi, filtersApi, equipmentCatalogApi, EquipmentCatalogItem } from '@/lib/api';
import JusoSearch from '@/components/JusoSearch';
import type { JusoResult } from '@/lib/api';

const MiniMap = dynamic(() => import('@/components/MiniMap'), { ssr: false });

interface Company {
  id: string;
  name: string;
  city?: string;
  district?: string;
  contact?: string;
}

export interface WaternixModel {
  model: string;
  label: string;
  capacity: string;
  consumables?: { name: string; partNo?: string; unit: string; replaceIntervalHours?: number }[];
}

export const WATERNIX_MODELS: Record<EquipmentType, WaternixModel[]> = {
  cooling: [
    {
      model: 'DCRO-T50', label: '냉각수 스케일제거 50L/h', capacity: '50',
      consumables: [
        { name: '세디먼트 필터 5㎛', partNo: 'DCRO-SD-5', unit: '개', replaceIntervalHours: 2000 },
        { name: '활성탄 필터', partNo: 'DCRO-AC', unit: '개', replaceIntervalHours: 4000 },
        { name: 'RO 멤브레인 (NF)', partNo: 'DCRO-MEM-NF', unit: '개', replaceIntervalHours: 8760 },
        { name: '스케일 방지제 (Antiscalant)', partNo: 'DCRO-ANT', unit: 'L', replaceIntervalHours: 720 },
        { name: '고압펌프 씰 키트', partNo: 'DCRO-SEAL', unit: 'set', replaceIntervalHours: 8760 },
      ],
    },
    {
      model: 'DCRO-T100', label: '냉각수 스케일제거 100L/h', capacity: '100',
      consumables: [
        { name: '세디먼트 필터 5㎛', partNo: 'DCRO-SD-5', unit: '개', replaceIntervalHours: 2000 },
        { name: '활성탄 필터', partNo: 'DCRO-AC', unit: '개', replaceIntervalHours: 4000 },
        { name: 'RO 멤브레인 (NF)', partNo: 'DCRO-MEM-NF', unit: '개', replaceIntervalHours: 8760 },
        { name: '스케일 방지제 (Antiscalant)', partNo: 'DCRO-ANT', unit: 'L', replaceIntervalHours: 720 },
        { name: '고압펌프 씰 키트', partNo: 'DCRO-SEAL', unit: 'set', replaceIntervalHours: 8760 },
      ],
    },
    {
      model: 'DCRO-T500', label: '냉각수 스케일제거 500L/h', capacity: '500',
      consumables: [
        { name: '세디먼트 필터 5㎛', partNo: 'DCRO-SD-5-L', unit: '개', replaceIntervalHours: 1500 },
        { name: '활성탄 필터', partNo: 'DCRO-AC-L', unit: '개', replaceIntervalHours: 3000 },
        { name: 'RO 멤브레인 (NF) 4인치', partNo: 'DCRO-MEM-NF4', unit: '개', replaceIntervalHours: 8760 },
        { name: '스케일 방지제 (Antiscalant)', partNo: 'DCRO-ANT-20L', unit: 'L', replaceIntervalHours: 360 },
        { name: '고압펌프 씰 키트', partNo: 'DCRO-SEAL-L', unit: 'set', replaceIntervalHours: 8760 },
      ],
    },
    {
      model: 'DCRO-T1000', label: '냉각수 스케일제거 1,000L/h', capacity: '1000',
      consumables: [
        { name: 'RO 멤브레인 (NF) 4인치', partNo: 'DCRO-MEM-NF4', unit: '개', replaceIntervalHours: 8760 },
        { name: '스케일 방지제 (Antiscalant)', partNo: 'DCRO-ANT-20L', unit: 'L', replaceIntervalHours: 360 },
        { name: '고압펌프 씰 키트', partNo: 'DCRO-SEAL-L', unit: 'set', replaceIntervalHours: 8760 },
        { name: 'FRP 압력탱크 멀티미디어 충진재', partNo: 'DCRO-FRP-MEDIA', unit: 'kg', replaceIntervalHours: 26280 },
      ],
    },
    {
      model: 'DCRO-T5000', label: '냉각수 스케일제거 5,000L/h', capacity: '5000',
      consumables: [
        { name: 'RO 멤브레인 (NF) 8인치', partNo: 'DCRO-MEM-NF8', unit: '개', replaceIntervalHours: 8760 },
        { name: '스케일 방지제 (Antiscalant)', partNo: 'DCRO-ANT-200L', unit: 'L', replaceIntervalHours: 360 },
        { name: '고압펌프 씰 키트 (대형)', partNo: 'DCRO-SEAL-XL', unit: 'set', replaceIntervalHours: 8760 },
      ],
    },
    {
      model: 'DCRO-T10000', label: '냉각수 스케일제거 10,000L/h', capacity: '10000',
      consumables: [
        { name: 'RO 멤브레인 (NF) 8인치', partNo: 'DCRO-MEM-NF8', unit: '개', replaceIntervalHours: 8760 },
        { name: '스케일 방지제 (Antiscalant)', partNo: 'DCRO-ANT-200L', unit: 'L', replaceIntervalHours: 360 },
        { name: '고압펌프 씰 키트 (대형)', partNo: 'DCRO-SEAL-XL', unit: 'set', replaceIntervalHours: 8760 },
      ],
    },
  ],
  ro: [
    {
      model: 'WRO-T50', label: '역삼투압 시스템 50L/h', capacity: '50',
      consumables: [
        { name: '세디먼트 필터 5㎛', partNo: 'WRO-SD-5', unit: '개', replaceIntervalHours: 2000 },
        { name: '활성탄 블록 필터 (CTO)', partNo: 'WRO-CTO', unit: '개', replaceIntervalHours: 4000 },
        { name: 'RO 멤브레인', partNo: 'WRO-MEM-50', unit: '개', replaceIntervalHours: 8760 },
        { name: '후처리 인라인 필터', partNo: 'WRO-POST', unit: '개', replaceIntervalHours: 6000 },
      ],
    },
    {
      model: 'WRO-T100', label: '역삼투압 시스템 100L/h', capacity: '100',
      consumables: [
        { name: '세디먼트 필터 5㎛', partNo: 'WRO-SD-5', unit: '개', replaceIntervalHours: 2000 },
        { name: '활성탄 블록 필터 (CTO)', partNo: 'WRO-CTO', unit: '개', replaceIntervalHours: 4000 },
        { name: 'RO 멤브레인 4인치', partNo: 'WRO-MEM-100', unit: '개', replaceIntervalHours: 8760 },
        { name: '고압펌프 씰 키트', partNo: 'WRO-SEAL', unit: 'set', replaceIntervalHours: 8760 },
      ],
    },
    {
      model: 'WRO-T500', label: '역삼투압 시스템 500L/h', capacity: '500',
      consumables: [
        { name: '세디먼트 필터 5㎛ (대형)', partNo: 'WRO-SD-5-L', unit: '개', replaceIntervalHours: 1500 },
        { name: 'RO 멤브레인 4인치', partNo: 'WRO-MEM-4', unit: '개', replaceIntervalHours: 8760 },
        { name: '스케일 방지제', partNo: 'WRO-ANT', unit: 'L', replaceIntervalHours: 720 },
        { name: '고압펌프 씰 키트', partNo: 'WRO-SEAL', unit: 'set', replaceIntervalHours: 8760 },
      ],
    },
    {
      model: 'WRO-T1000', label: '역삼투압 시스템 1,000L/h', capacity: '1000',
      consumables: [
        { name: 'RO 멤브레인 4인치', partNo: 'WRO-MEM-4', unit: '개', replaceIntervalHours: 8760 },
        { name: '스케일 방지제 (20L)', partNo: 'WRO-ANT-20', unit: 'L', replaceIntervalHours: 360 },
        { name: '고압펌프 씰 키트', partNo: 'WRO-SEAL-L', unit: 'set', replaceIntervalHours: 8760 },
        { name: '전처리 멀티미디어 필터 충진재', partNo: 'WRO-MEDIA', unit: 'kg', replaceIntervalHours: 26280 },
      ],
    },
    {
      model: 'WRO-T5000', label: '역삼투압 시스템 5,000L/h', capacity: '5000',
      consumables: [
        { name: 'RO 멤브레인 8인치', partNo: 'WRO-MEM-8', unit: '개', replaceIntervalHours: 8760 },
        { name: '스케일 방지제 (200L)', partNo: 'WRO-ANT-200', unit: 'L', replaceIntervalHours: 360 },
        { name: '고압펌프 씰 키트 (대형)', partNo: 'WRO-SEAL-XL', unit: 'set', replaceIntervalHours: 8760 },
      ],
    },
    {
      model: 'WRO-T10000', label: '역삼투압 시스템 10,000L/h', capacity: '10000',
      consumables: [
        { name: 'RO 멤브레인 8인치', partNo: 'WRO-MEM-8', unit: '개', replaceIntervalHours: 8760 },
        { name: '스케일 방지제 (200L)', partNo: 'WRO-ANT-200', unit: 'L', replaceIntervalHours: 360 },
        { name: '고압펌프 씰 키트 (대형)', partNo: 'WRO-SEAL-XL', unit: 'set', replaceIntervalHours: 8760 },
      ],
    },
  ],
  di: [
    {
      model: 'WDI-T50', label: '초순수 시스템 50L/h', capacity: '50',
      consumables: [
        { name: 'RO 멤브레인', partNo: 'WDI-MEM', unit: '개', replaceIntervalHours: 8760 },
        { name: '혼합 이온교환 수지 (MB)', partNo: 'WDI-RESIN-MB', unit: 'L', replaceIntervalHours: 4380 },
        { name: '양이온 수지 (C-Type)', partNo: 'WDI-RESIN-C', unit: 'L', replaceIntervalHours: 8760 },
        { name: '음이온 수지 (A-Type)', partNo: 'WDI-RESIN-A', unit: 'L', replaceIntervalHours: 8760 },
      ],
    },
    {
      model: 'WDI-T100', label: '초순수 시스템 100L/h', capacity: '100',
      consumables: [
        { name: 'RO 멤브레인 4인치', partNo: 'WDI-MEM-4', unit: '개', replaceIntervalHours: 8760 },
        { name: '혼합 이온교환 수지 (MB)', partNo: 'WDI-RESIN-MB', unit: 'L', replaceIntervalHours: 4380 },
        { name: '양이온 수지 (C-Type)', partNo: 'WDI-RESIN-C', unit: 'L', replaceIntervalHours: 8760 },
        { name: '음이온 수지 (A-Type)', partNo: 'WDI-RESIN-A', unit: 'L', replaceIntervalHours: 8760 },
      ],
    },
    {
      model: 'WDI-T500', label: '초순수 시스템 500L/h', capacity: '500',
      consumables: [
        { name: 'RO 멤브레인 4인치', partNo: 'WDI-MEM-4', unit: '개', replaceIntervalHours: 8760 },
        { name: '혼합 이온교환 수지 (MB) 25L', partNo: 'WDI-RESIN-MB-25', unit: 'L', replaceIntervalHours: 4380 },
        { name: '양이온 수지 50L', partNo: 'WDI-RESIN-C-50', unit: 'L', replaceIntervalHours: 8760 },
        { name: '음이온 수지 50L', partNo: 'WDI-RESIN-A-50', unit: 'L', replaceIntervalHours: 8760 },
      ],
    },
    {
      model: 'WDI-T1000', label: '초순수 시스템 1,000L/h', capacity: '1000',
      consumables: [
        { name: 'RO 멤브레인 4인치', partNo: 'WDI-MEM-4', unit: '개', replaceIntervalHours: 8760 },
        { name: '혼합 이온교환 수지 (MB) 50L', partNo: 'WDI-RESIN-MB-50', unit: 'L', replaceIntervalHours: 4380 },
      ],
    },
    {
      model: 'WDI-T5000', label: '초순수 시스템 5,000L/h', capacity: '5000',
      consumables: [
        { name: 'RO 멤브레인 8인치', partNo: 'WDI-MEM-8', unit: '개', replaceIntervalHours: 8760 },
        { name: '혼합 이온교환 수지 (MB) 200L', partNo: 'WDI-RESIN-MB-200', unit: 'L', replaceIntervalHours: 4380 },
      ],
    },
    {
      model: 'WDI-T10000', label: '초순수 시스템 10,000L/h', capacity: '10000',
      consumables: [
        { name: 'RO 멤브레인 8인치', partNo: 'WDI-MEM-8', unit: '개', replaceIntervalHours: 8760 },
        { name: '혼합 이온교환 수지 (MB) 500L', partNo: 'WDI-RESIN-MB-500', unit: 'L', replaceIntervalHours: 4380 },
      ],
    },
  ],
  seawater: [
    {
      model: 'WSRO-T50', label: '해수담수화 시스템 50L/h', capacity: '50',
      consumables: [
        { name: 'SWRO 멤브레인 4인치', partNo: 'WSRO-MEM-4', unit: '개', replaceIntervalHours: 8760 },
        { name: '스케일 방지제', partNo: 'WSRO-ANT', unit: 'L', replaceIntervalHours: 720 },
        { name: '고압펌프 씰 키트', partNo: 'WSRO-SEAL', unit: 'set', replaceIntervalHours: 8760 },
        { name: '세디먼트 5㎛', partNo: 'WSRO-SD', unit: '개', replaceIntervalHours: 1000 },
      ],
    },
    {
      model: 'WSRO-T100', label: '해수담수화 시스템 100L/h', capacity: '100',
      consumables: [
        { name: 'SWRO 멤브레인 4인치', partNo: 'WSRO-MEM-4', unit: '개', replaceIntervalHours: 8760 },
        { name: '스케일 방지제', partNo: 'WSRO-ANT', unit: 'L', replaceIntervalHours: 720 },
        { name: '고압펌프 씰 키트', partNo: 'WSRO-SEAL', unit: 'set', replaceIntervalHours: 8760 },
        { name: '세디먼트 5㎛', partNo: 'WSRO-SD', unit: '개', replaceIntervalHours: 1000 },
      ],
    },
    {
      model: 'WSRO-T500', label: '해수담수화 시스템 500L/h', capacity: '500',
      consumables: [
        { name: 'SWRO 멤브레인 4인치', partNo: 'WSRO-MEM-4', unit: '개', replaceIntervalHours: 8760 },
        { name: '스케일 방지제 (20L)', partNo: 'WSRO-ANT-20', unit: 'L', replaceIntervalHours: 360 },
        { name: '고압펌프 씰 키트', partNo: 'WSRO-SEAL-L', unit: 'set', replaceIntervalHours: 8760 },
      ],
    },
    {
      model: 'WSRO-T1000', label: '해수담수화 시스템 1,000L/h', capacity: '1000',
      consumables: [
        { name: 'SWRO 멤브레인 4인치', partNo: 'WSRO-MEM-4', unit: '개', replaceIntervalHours: 8760 },
        { name: '스케일 방지제 (20L)', partNo: 'WSRO-ANT-20', unit: 'L', replaceIntervalHours: 360 },
        { name: '고압펌프 씰 키트', partNo: 'WSRO-SEAL-L', unit: 'set', replaceIntervalHours: 8760 },
      ],
    },
    {
      model: 'WSRO-T5000', label: '해수담수화 시스템 5,000L/h', capacity: '5000',
      consumables: [
        { name: 'SWRO 멤브레인 8인치', partNo: 'WSRO-MEM-8', unit: '개', replaceIntervalHours: 8760 },
        { name: '스케일 방지제 (200L)', partNo: 'WSRO-ANT-200', unit: 'L', replaceIntervalHours: 360 },
        { name: '고압펌프 씰 키트 (대형)', partNo: 'WSRO-SEAL-XL', unit: 'set', replaceIntervalHours: 8760 },
      ],
    },
    {
      model: 'WSRO-T10000', label: '해수담수화 시스템 10,000L/h', capacity: '10000',
      consumables: [
        { name: 'SWRO 멤브레인 8인치', partNo: 'WSRO-MEM-8', unit: '개', replaceIntervalHours: 8760 },
        { name: '스케일 방지제 (200L)', partNo: 'WSRO-ANT-200', unit: 'L', replaceIntervalHours: 360 },
        { name: '고압펌프 씰 키트 (대형)', partNo: 'WSRO-SEAL-XL', unit: 'set', replaceIntervalHours: 8760 },
      ],
    },
  ],
  uf: [
    {
      model: 'WUF-T50', label: '양액회수·재생 시스템 50L/h', capacity: '50',
      consumables: [
        { name: 'UF 중공사 멤브레인', partNo: 'WUF-MEM-HF', unit: '개', replaceIntervalHours: 17520 },
        { name: 'UF 세정제 (Alkaline)', partNo: 'WUF-CLEAN-ALK', unit: 'kg', replaceIntervalHours: 168 },
        { name: 'UF 세정제 (Acid)', partNo: 'WUF-CLEAN-ACD', unit: 'kg', replaceIntervalHours: 168 },
        { name: 'UV 램프', partNo: 'WUF-UV-LAMP', unit: '개', replaceIntervalHours: 8000 },
      ],
    },
    {
      model: 'WUF-T100', label: '양액회수·재생 시스템 100L/h', capacity: '100',
      consumables: [
        { name: 'UF 중공사 멤브레인', partNo: 'WUF-MEM-HF-L', unit: '개', replaceIntervalHours: 17520 },
        { name: 'UF 세정제 (Alkaline)', partNo: 'WUF-CLEAN-ALK', unit: 'kg', replaceIntervalHours: 168 },
        { name: 'UF 세정제 (Acid)', partNo: 'WUF-CLEAN-ACD', unit: 'kg', replaceIntervalHours: 168 },
        { name: 'UV 램프', partNo: 'WUF-UV-LAMP', unit: '개', replaceIntervalHours: 8000 },
      ],
    },
  ],
  small: [
    {
      model: 'T05', label: '소형 정수 시스템 (20L/h)', capacity: '20',
      consumables: [
        { name: '세디먼트 필터', partNo: 'T05-SD', unit: '개', replaceIntervalHours: 2000 },
        { name: '활성탄 필터 (CTO)', partNo: 'T05-CTO', unit: '개', replaceIntervalHours: 4000 },
        { name: 'RO 멤브레인 (소형)', partNo: 'T05-MEM', unit: '개', replaceIntervalHours: 8760 },
        { name: '후처리 인라인 필터', partNo: 'T05-POST', unit: '개', replaceIntervalHours: 6000 },
      ],
    },
    {
      model: 'T20', label: '소형 정수 시스템 (T20)', capacity: '0',
      consumables: [
        { name: '세디먼트 필터', partNo: 'T20-SD', unit: '개', replaceIntervalHours: 2000 },
        { name: '활성탄 필터 (CTO)', partNo: 'T20-CTO', unit: '개', replaceIntervalHours: 4000 },
        { name: 'RO 멤브레인 (소형)', partNo: 'T20-MEM', unit: '개', replaceIntervalHours: 8760 },
      ],
    },
  ],
  prefilter: [
    {
      model: 'WPF-SD', label: '세디먼트 전처리 필터', capacity: '0',
      consumables: [
        { name: '세디먼트 카트리지 5㎛', partNo: 'WPF-SD-5', unit: '개', replaceIntervalHours: 2000 },
        { name: '세디먼트 카트리지 1㎛', partNo: 'WPF-SD-1', unit: '개', replaceIntervalHours: 1000 },
      ],
    },
    {
      model: 'WPF-AC', label: '활성탄 전처리 필터', capacity: '0',
      consumables: [
        { name: '활성탄 블록 카트리지 (CTO)', partNo: 'WPF-AC-CTO', unit: '개', replaceIntervalHours: 4000 },
        { name: '입상 활성탄 (GAC)', partNo: 'WPF-AC-GAC', unit: 'kg', replaceIntervalHours: 8760 },
      ],
    },
    {
      model: 'WPF-MM', label: '멀티미디어 여과기', capacity: '0',
      consumables: [
        { name: '안트라사이트 (Anthracite)', partNo: 'WPF-MM-ANT', unit: 'kg', replaceIntervalHours: 26280 },
        { name: '샌드 (Filter Sand)', partNo: 'WPF-MM-SAND', unit: 'kg', replaceIntervalHours: 26280 },
        { name: '그라벨 (Gravel)', partNo: 'WPF-MM-GRV', unit: 'kg', replaceIntervalHours: 52560 },
      ],
    },
  ],
  uv: [
    {
      model: 'WUV-T10', label: 'UV살균 시스템 10LPM', capacity: '10',
      consumables: [
        { name: 'UV 살균 램프 (T10)', partNo: 'WUV-LAMP-10', unit: '개', replaceIntervalHours: 8000 },
        { name: '석영 슬리브 (Quartz Sleeve)', partNo: 'WUV-QS-10', unit: '개', replaceIntervalHours: 17520 },
      ],
    },
    {
      model: 'WUV-T30', label: 'UV살균 시스템 30LPM', capacity: '30',
      consumables: [
        { name: 'UV 살균 램프 (T30)', partNo: 'WUV-LAMP-30', unit: '개', replaceIntervalHours: 8000 },
        { name: '석영 슬리브 (Quartz Sleeve)', partNo: 'WUV-QS-30', unit: '개', replaceIntervalHours: 17520 },
      ],
    },
    {
      model: 'WUV-T100', label: 'UV살균 시스템 100LPM', capacity: '100',
      consumables: [
        { name: 'UV 살균 램프 (T100)', partNo: 'WUV-LAMP-100', unit: '개', replaceIntervalHours: 8000 },
        { name: '석영 슬리브 (Quartz Sleeve)', partNo: 'WUV-QS-100', unit: '개', replaceIntervalHours: 17520 },
        { name: 'UV 컨트롤러 보드', partNo: 'WUV-CTRL', unit: '개', replaceIntervalHours: 35040 },
      ],
    },
  ],
  softener: [
    {
      model: 'WSF-T100', label: '연수 시스템 100L/h', capacity: '100',
      consumables: [
        { name: '양이온 교환 수지 (Na형)', partNo: 'WSF-RESIN-NA', unit: 'L', replaceIntervalHours: 17520 },
        { name: '재생용 소금 (NaCl)', partNo: 'WSF-SALT', unit: 'kg', replaceIntervalHours: 720 },
      ],
    },
    {
      model: 'WSF-T500', label: '연수 시스템 500L/h', capacity: '500',
      consumables: [
        { name: '양이온 교환 수지 (Na형) 50L', partNo: 'WSF-RESIN-NA-50', unit: 'L', replaceIntervalHours: 17520 },
        { name: '재생용 소금 (NaCl) 25kg', partNo: 'WSF-SALT-25', unit: 'kg', replaceIntervalHours: 360 },
      ],
    },
    {
      model: 'WSF-T2000', label: '연수 시스템 2,000L/h', capacity: '2000',
      consumables: [
        { name: '양이온 교환 수지 (Na형) 200L', partNo: 'WSF-RESIN-NA-200', unit: 'L', replaceIntervalHours: 17520 },
        { name: '재생용 소금 (NaCl) 25kg', partNo: 'WSF-SALT-25', unit: 'kg', replaceIntervalHours: 168 },
      ],
    },
  ],
  filtration: [
    {
      model: 'WFF-T100', label: '여과 시스템 100L/h', capacity: '100',
      consumables: [
        { name: '안트라사이트 여과재', partNo: 'WFF-ANT', unit: 'kg', replaceIntervalHours: 26280 },
        { name: '샌드 여과재', partNo: 'WFF-SAND', unit: 'kg', replaceIntervalHours: 26280 },
        { name: '역세척 보조제', partNo: 'WFF-BWA', unit: 'L', replaceIntervalHours: 8760 },
      ],
    },
    {
      model: 'WFF-T500', label: '여과 시스템 500L/h', capacity: '500',
      consumables: [
        { name: '안트라사이트 여과재 50kg', partNo: 'WFF-ANT-50', unit: 'kg', replaceIntervalHours: 26280 },
        { name: '샌드 여과재 50kg', partNo: 'WFF-SAND-50', unit: 'kg', replaceIntervalHours: 26280 },
      ],
    },
    {
      model: 'WFF-T2000', label: '여과 시스템 2,000L/h', capacity: '2000',
      consumables: [
        { name: '안트라사이트 여과재 200kg', partNo: 'WFF-ANT-200', unit: 'kg', replaceIntervalHours: 26280 },
        { name: '샌드 여과재 200kg', partNo: 'WFF-SAND-200', unit: 'kg', replaceIntervalHours: 26280 },
      ],
    },
  ],
  booster: [
    {
      model: 'WBP-T30', label: '부스터 펌프 30LPM', capacity: '30',
      consumables: [
        { name: '임펠러 씰 키트', partNo: 'WBP-SEAL-30', unit: 'set', replaceIntervalHours: 8760 },
        { name: '커플링', partNo: 'WBP-COUPLING', unit: '개', replaceIntervalHours: 17520 },
      ],
    },
    {
      model: 'WBP-T100', label: '부스터 펌프 100LPM', capacity: '100',
      consumables: [
        { name: '임펠러 씰 키트', partNo: 'WBP-SEAL-100', unit: 'set', replaceIntervalHours: 8760 },
        { name: '베어링 세트', partNo: 'WBP-BEARING', unit: 'set', replaceIntervalHours: 17520 },
      ],
    },
    {
      model: 'WBP-T500', label: '부스터 펌프 500LPM', capacity: '500',
      consumables: [
        { name: '임펠러 씰 키트 (대형)', partNo: 'WBP-SEAL-500', unit: 'set', replaceIntervalHours: 8760 },
        { name: '베어링 세트 (대형)', partNo: 'WBP-BEARING-L', unit: 'set', replaceIntervalHours: 17520 },
      ],
    },
  ],
};

const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, { label: string; icon: string }> = {
  cooling:   { label: '냉각수 스케일제거', icon: '❄️' },
  ro:        { label: '역삼투압 시스템',   icon: '💧' },
  di:        { label: '초순수 시스템',     icon: '⚗️' },
  seawater:  { label: '해수담수화 시스템', icon: '🌊' },
  uf:        { label: '양액회수·재생',     icon: '♻️' },
  small:     { label: '소형 시스템',       icon: '🔹' },
  prefilter: { label: '전처리 필터',       icon: '🫧' },
  uv:        { label: 'UV살균 시스템',     icon: '☀️' },
  softener:  { label: '연수 시스템',       icon: '🧪' },
  filtration:{ label: '여과 시스템',       icon: '🌀' },
  booster:   { label: '부스터펌프',        icon: '⚡' },
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
  const prefixMap: Record<EquipmentType, string> = {
    cooling: 'DCRO', ro: 'WRO', di: 'WDI', seawater: 'WSRO',
    uf: 'WUF', small: 'WSM', prefilter: 'WPF', uv: 'WUV',
    softener: 'WSF', filtration: 'WFF', booster: 'WBP',
  };
  const prefix = prefixMap[type] || 'WEQ';
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix}-${year}-${seq}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd?: (data: FormData) => void;
  onSuccess?: () => void;
  presetCompanyId?: string;
}

export default function AddEquipmentModal({ open, onClose, onAdd, onSuccess, presetCompanyId }: Props) {
  const [step, setStep] = useState<Step>('type');
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM, companyId: presetCompanyId || '' });
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [catalogItems, setCatalogItems] = useState<EquipmentCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<EquipmentCatalogItem | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(f => ({ ...f, companyId: presetCompanyId || '' }));
    setCompaniesLoading(true);
    companiesApi.list()
      .then(data => setCompanies(data as Company[]))
      .catch(() => setCompanies([]))
      .finally(() => setCompaniesLoading(false));
  }, [open, presetCompanyId]);

  // 장비 유형 선택 시 카탈로그 로드
  useEffect(() => {
    if (!form.equipmentType || step !== 'model') return;
    setCatalogLoading(true);
    equipmentCatalogApi.list({ equipment_type: form.equipmentType, active_only: 'true' })
      .then(data => setCatalogItems(data))
      .catch(() => setCatalogItems([]))
      .finally(() => setCatalogLoading(false));
  }, [form.equipmentType, step]);

  if (!open) return null;

  const stepIndex = STEPS.findIndex(s => s.id === step);

  const update = (field: keyof FormData, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleTypeSelect = (t: EquipmentType) => {
    update('equipmentType', t);
    setStep('model');
  };

  const handleModelSelect = (catalogItem: EquipmentCatalogItem) => {
    const serial = generateSerialNo(form.equipmentType as EquipmentType);
    const capacity = String((catalogItem.specs as Record<string, unknown>)?.capacity_lph || '');
    setSelectedCatalogItem(catalogItem);
    setForm(f => ({
      ...f,
      model: catalogItem.model_code,
      capacityLph: capacity,
      serialNo: serial,
      warrantyEnd: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + (catalogItem.warranty_months || 12));
        return d.toISOString().split('T')[0];
      })(),
    }));
    setStep('company');
  };

  const handleLegacyModelSelect = (model: string, capacity: string) => {
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

      const newEquipment = await equipmentApi.create({
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

      // 카탈로그 기본 소모품을 filters 테이블에 자동 등록
      const companyName = selectedCompany?.name;
      const defaultConsumables =
        selectedCatalogItem?.default_consumables ||
        WATERNIX_MODELS[form.equipmentType as EquipmentType]?.find(m => m.model === form.model)?.consumables?.map(c => ({
          part_no: c.partNo || '',
          name: c.name,
          interval_days: c.replaceIntervalHours ? Math.ceil(c.replaceIntervalHours / 24) : 180,
        })) || [];

      if (defaultConsumables.length > 0 && newEquipment?.id) {
        const today = new Date().toISOString().split('T')[0];
        await Promise.allSettled(
          defaultConsumables.map((c, idx) => {
            const intervalDays = c.interval_days || 180;
            const d = new Date();
            d.setDate(d.getDate() + intervalDays);
            const replaceDate = d.toISOString().split('T')[0];
            return filtersApi.create({
              equipment_id: newEquipment.id,
              equipment_name: form.name || form.model,
              company_name: companyName,
              filter_name: c.name,
              filter_type: 'filter',
              stage: idx + 1,
              part_no: c.part_no || undefined,
              supplier: '워터닉스(자사)',
              install_date: today,
              replace_date: replaceDate,
              used_percent: 0,
              status: 'normal',
            });
          })
        );
      }

      setSuccess(true);
      onAdd?.(form);
      onSuccess?.();
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
    if (step === 'type') return !!form.equipmentType;
    if (step === 'model') return !!form.model;
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

  const selectedCompany = companies.find(c => c.id === form.companyId);

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
                    <div className="text-2xl mb-2">{EQUIPMENT_TYPE_LABELS[t].icon}</div>
                    <div className="font-semibold text-sm">{EQUIPMENT_TYPE_LABELS[t].label}</div>
                    <div className="text-xs text-slate-500 mt-1">{WATERNIX_MODELS[t].length}개 모델</div>
                  </button>
                ))}
              </div>
            </div>
          ) : step === 'model' ? (
            <div>
              <p className="text-sm text-slate-400 mb-4">
                {EQUIPMENT_TYPE_LABELS[form.equipmentType as EquipmentType]?.label} 모델을 선택하세요
              </p>
              {catalogLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="animate-spin text-blue-400" size={28} />
                </div>
              ) : catalogItems.length > 0 ? (
                <div className="space-y-2">
                  {catalogItems.map(item => {
                    const cap = (item.specs as Record<string, unknown>)?.capacity_lph as number | undefined;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleModelSelect(item)}
                        className={cn(
                          'w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left',
                          form.model === item.model_code
                            ? 'border-teal-500 bg-teal-500/10 text-teal-300'
                            : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm font-mono">{item.model_code}</span>
                            {item.sell_price && (
                              <span className="text-xs text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">
                                {item.sell_price.toLocaleString()}원
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">{item.model_name}</div>
                          {item.default_consumables && item.default_consumables.length > 0 && (
                            <div className="text-xs text-teal-600 mt-1">
                              소모품 {item.default_consumables.length}종 자동 등록
                            </div>
                          )}
                        </div>
                        {cap && (
                          <div className="text-right flex-shrink-0 ml-4">
                            <div className="text-xs text-slate-500">처리 용량</div>
                            <div className="font-bold text-teal-400">{Number(cap).toLocaleString()} L/h</div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* 카탈로그에 없으면 기존 하드코딩 목록 표시 */
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg text-xs text-slate-400 mb-3">
                    <Box size={14} className="text-blue-400" />
                    카탈로그에 등록된 모델이 없습니다. 직접 입력하거나 카탈로그에 먼저 제품을 등록하세요.
                  </div>
                  {WATERNIX_MODELS[form.equipmentType as EquipmentType]?.map(m => (
                    <button
                      key={m.model}
                      onClick={() => handleLegacyModelSelect(m.model, m.capacity)}
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
              )}
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
              {companiesLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-16 bg-slate-800 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : companies.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <p>등록된 업체가 없습니다.</p>
                  <p className="text-xs mt-1">먼저 업체를 등록해주세요.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {companies.map(c => (
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
                        <div className="text-xs text-slate-500 mt-0.5">{c.city} {c.district}{c.contact ? ` · ${c.contact}` : ''}</div>
                      </div>
                      {form.companyId === c.id && <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : step === 'location' ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">설치 위치를 입력하세요 - 주소를 검색하면 좌표가 자동으로 설정됩니다</p>

              {/* 도로명주소 검색 */}
              <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                <label className="block text-xs text-slate-400 mb-2">도로명주소 검색 *</label>
                <div className="juso-dark-mode">
                  <JusoSearch
                    initialValue={form.address}
                    placeholder="예: 테헤란로 또는 건물명"
                    onSelect={(r: JusoResult & { lat?: number; lng?: number }) => {
                      update('address', r.roadAddr);
                      update('city', r.siNm?.replace('특별시','').replace('광역시','').replace('특별자치시','') || '');
                      update('district', r.sggNm || '');
                      if (r.lat) update('lat', String(r.lat));
                      if (r.lng) update('lng', String(r.lng));
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">상세 주소</label>
                <input type="text" placeholder="층수, 호수 등 상세 정보" value={form.address} onChange={e => update('address', e.target.value)}
                  className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none" />
              </div>

              {/* 위도/경도 (자동설정 or 수동) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">위도 (자동)</label>
                  <input type="number" step="0.0001" placeholder="37.5172" value={form.lat} onChange={e => update('lat', e.target.value)}
                    className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">경도 (자동)</label>
                  <input type="number" step="0.0001" placeholder="127.0473" value={form.lng} onChange={e => update('lng', e.target.value)}
                    className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none" />
                </div>
              </div>

              {/* 미니 지도 (좌표가 있을 때만) */}
              {form.lat && form.lng && (
                <div className="rounded-lg overflow-hidden border border-slate-600" style={{ height: 180 }}>
                  <MiniMap lat={Number(form.lat)} lng={Number(form.lng)} label={form.address || '설치 위치'} />
                </div>
              )}

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
                  { label: '장비 유형', value: EQUIPMENT_TYPE_LABELS[form.equipmentType as EquipmentType]?.label || form.equipmentType },
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
                disabled={!canNext()}
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
