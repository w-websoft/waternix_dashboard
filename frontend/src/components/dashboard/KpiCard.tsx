import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: string; positive: boolean };
  subtitle?: string;
  urgent?: boolean;
}

export default function KpiCard({
  title, value, unit, icon: Icon, iconColor = 'text-blue-600',
  iconBg = 'bg-blue-50', trend, subtitle, urgent = false,
}: KpiCardProps) {
  return (
    <div className={cn(
      'bg-white rounded-xl p-5 border transition-shadow hover:shadow-md',
      urgent ? 'border-red-200 shadow-sm shadow-red-100' : 'border-slate-200'
    )}>
      <div className="flex items-start justify-between">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
        {urgent && (
          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">주의</span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-sm font-medium text-slate-500">{title}</div>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className={cn('text-3xl font-bold', urgent ? 'text-red-600' : 'text-slate-900')}>
            {typeof value === 'number' ? value.toLocaleString('ko-KR') : value}
          </span>
          {unit && <span className="text-sm text-slate-500">{unit}</span>}
        </div>
        {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
        {trend && (
          <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', trend.positive ? 'text-emerald-600' : 'text-red-500')}>
            <span>{trend.positive ? '▲' : '▼'}</span>
            <span>{trend.value}</span>
          </div>
        )}
      </div>
    </div>
  );
}
