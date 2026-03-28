'use client';

import { useEffect, useRef, useState } from 'react';
import { Equipment } from '@/types';
import { STATUS_CONFIG, EQUIPMENT_TYPE_CONFIG, MAP_STATUS_COLORS, formatRelativeTime } from '@/lib/utils';

interface EquipmentMapProps {
  equipment: Equipment[];
  selectedId?: string;
  onSelect?: (equipment: Equipment) => void;
  height?: string;
}

export default function EquipmentMap({ equipment, selectedId, onSelect, height = '100%' }: EquipmentMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const markersRef = useRef<Map<string, unknown>>(new Map());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const map = L.map(mapRef.current, {
        center: [36.5, 127.8],
        zoom: 7,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
      setIsLoaded(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      markersRef.current.forEach((marker) => {
        (marker as { remove: () => void }).remove();
      });
      markersRef.current.clear();

      equipment.forEach((eq) => {
        if (!eq.lat || !eq.lng) return;

        const color = MAP_STATUS_COLORS[eq.status];
        const isSelected = eq.id === selectedId;
        const typeConfig = EQUIPMENT_TYPE_CONFIG[eq.equipmentType];
        const statusConfig = STATUS_CONFIG[eq.status];

        const markerHtml = `
          <div style="position:relative;width:${isSelected ? 44 : 36}px;height:${isSelected ? 44 : 36}px;">
            ${eq.status === 'error' || eq.status === 'offline' ? `
              <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.3;animation:pulse 2s infinite;transform:scale(1.5);"></div>
            ` : ''}
            <div style="
              position:absolute;inset:0;
              border-radius:50%;
              background:${color};
              border:${isSelected ? '3px solid white' : '2.5px solid white'};
              box-shadow:0 2px 8px rgba(0,0,0,0.3)${isSelected ? ',0 0 0 3px ' + color : ''};
              display:flex;align-items:center;justify-content:center;
              font-size:${isSelected ? '18px' : '15px'};
              cursor:pointer;
              transition:all 0.2s;
            ">
              ${typeConfig.icon}
            </div>
          </div>
        `;

        const icon = L.divIcon({
          html: markerHtml,
          className: 'equipment-marker',
          iconSize: [isSelected ? 44 : 36, isSelected ? 44 : 36],
          iconAnchor: [isSelected ? 22 : 18, isSelected ? 22 : 18],
        });

        const lastSeenStr = formatRelativeTime(eq.lastSeen);
        const sensor = eq.sensorData;

        const popupContent = `
          <div style="font-family:'Apple SD Gothic Neo',sans-serif;padding:16px;min-width:260px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
              <span style="font-size:20px;">${typeConfig.icon}</span>
              <div>
                <div style="font-weight:700;font-size:14px;color:#0f172a;">${eq.name || eq.model}</div>
                <div style="font-size:12px;color:#64748b;">${eq.companyName}</div>
              </div>
              <span style="margin-left:auto;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:${color}20;color:${color};">${statusConfig.label}</span>
            </div>
            <div style="border-top:1px solid #f1f5f9;padding-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div>
                <div style="font-size:11px;color:#94a3b8;">모델</div>
                <div style="font-size:12px;font-weight:600;color:#334155;">${eq.model}</div>
              </div>
              <div>
                <div style="font-size:11px;color:#94a3b8;">시리얼번호</div>
                <div style="font-size:12px;font-weight:600;color:#334155;">${eq.serialNo}</div>
              </div>
              ${sensor && sensor.flowRate !== undefined && sensor.flowRate > 0 ? `
              <div>
                <div style="font-size:11px;color:#94a3b8;">유량</div>
                <div style="font-size:12px;font-weight:600;color:#334155;">${sensor.flowRate.toFixed(1)} L/min</div>
              </div>
              <div>
                <div style="font-size:11px;color:#94a3b8;">오늘 생산량</div>
                <div style="font-size:12px;font-weight:600;color:#334155;">${(sensor.dailyVolume || 0).toLocaleString('ko-KR')} L</div>
              </div>
              ` : ''}
              ${sensor && sensor.outletTds !== undefined ? `
              <div>
                <div style="font-size:11px;color:#94a3b8;">정수 TDS</div>
                <div style="font-size:12px;font-weight:600;color:${(sensor.outletTds || 0) > 20 ? '#ef4444' : '#334155'};">${sensor.outletTds} ppm</div>
              </div>
              <div>
                <div style="font-size:11px;color:#94a3b8;">통신방식</div>
                <div style="font-size:12px;font-weight:600;color:#334155;">${eq.commType?.toUpperCase() || '-'}</div>
              </div>
              ` : ''}
            </div>
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid #f1f5f9;font-size:11px;color:#94a3b8;">
              📍 ${eq.address || `${eq.city} ${eq.district}`} &nbsp;·&nbsp; 최근 수신: ${lastSeenStr}
            </div>
          </div>
        `;

        const marker = L.marker([eq.lat, eq.lng], { icon })
          .bindPopup(popupContent, { maxWidth: 300 })
          .on('click', () => {
            if (onSelect) onSelect(eq);
          });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        marker.addTo(mapInstanceRef.current as any);
        markersRef.current.set(eq.id, marker);
      });
    });
  }, [equipment, selectedId, isLoaded, onSelect]);

  useEffect(() => {
    if (!isLoaded || !selectedId || !mapInstanceRef.current) return;

    const eq = equipment.find(e => e.id === selectedId);
    if (eq && eq.lat && eq.lng) {
      import('leaflet').then(() => {
        (mapInstanceRef.current as { setView: (c: [number, number], z: number, o: object) => void })
          .setView([eq.lat, eq.lng], 13, { animate: true });
        const marker = markersRef.current.get(selectedId);
        if (marker) {
          (marker as { openPopup: () => void }).openPopup();
        }
      });
    }
  }, [selectedId, equipment, isLoaded]);

  return (
    <div ref={mapRef} style={{ height }} className="w-full rounded-lg overflow-hidden" />
  );
}
