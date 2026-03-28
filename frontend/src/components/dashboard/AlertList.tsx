'use client';

import { Alert } from '@/types';
import { SEVERITY_CONFIG, formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface AlertListProps {
  alerts: Alert[];
  maxItems?: number;
}

const SEVERITY_ICONS = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export default function AlertList({ alerts, maxItems = 8 }: AlertListProps) {
  const displayed = alerts.slice(0, maxItems);

  return (
    <div className="space-y-2">
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <CheckCircle className="w-10 h-10 mb-2 text-emerald-400" />
          <div className="text-sm">모든 장비가 정상 상태입니다</div>
        </div>
      ) : (
        displayed.map((alert) => {
          const config = SEVERITY_CONFIG[alert.severity];
          const Icon = SEVERITY_ICONS[alert.severity];
          return (
            <div
              key={alert.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border text-sm transition-all',
                alert.acknowledged ? 'opacity-60 bg-slate-50 border-slate-100' : `${config.bg} ${config.border}`,
              )}
            >
              <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', config.color)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded', config.bg, config.color, 'border', config.border)}>
                    {config.label}
                  </span>
                  <span className="font-semibold text-slate-800 truncate">{alert.title}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1 truncate">{alert.equipmentName} · {alert.companyName}</div>
                <div className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(alert.createdAt)}</div>
              </div>
              {alert.acknowledged && (
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
