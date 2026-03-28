'use client';

import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Wifi, WifiOff, AlertTriangle, Wrench, CheckCircle, Activity, Droplets, Gauge, Thermometer, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export type EquipmentNodeData = {
  label: string;
  model: string;
  type: string;
  icon: string;
  status: 'normal' | 'warning' | 'error' | 'offline' | 'maintenance';
  commType?: string;
  imageUrl?: string;
  sensor?: {
    flowRate?: number;
    outletTds?: number;
    inletPressure?: number;
    temperature?: number;
    powerKw?: number;
    rejectionRate?: number;
  };
};

const STATUS_GLOW: Record<string, string> = {
  normal:      'shadow-[0_0_20px_rgba(16,185,129,0.4)] border-emerald-500/50',
  warning:     'shadow-[0_0_20px_rgba(245,158,11,0.4)] border-amber-500/50',
  error:       'shadow-[0_0_20px_rgba(239,68,68,0.5)] border-red-500/60',
  offline:     'shadow-none border-slate-600/50',
  maintenance: 'shadow-[0_0_20px_rgba(59,130,246,0.4)] border-blue-500/50',
};

const STATUS_COLOR: Record<string, string> = {
  normal:      'text-emerald-400',
  warning:     'text-amber-400',
  error:       'text-red-400',
  offline:     'text-slate-500',
  maintenance: 'text-blue-400',
};

const STATUS_LABEL: Record<string, string> = {
  normal: '정상', warning: '경고', error: '오류', offline: '오프라인', maintenance: '유지보수',
};

const STATUS_ICON: Record<string, React.ElementType> = {
  normal: CheckCircle, warning: AlertTriangle, error: AlertTriangle,
  offline: WifiOff, maintenance: Wrench,
};

function EquipmentNode({ data, selected }: NodeProps) {
  const nodeData = data as EquipmentNodeData;
  const [expanded, setExpanded] = useState(false);
  const StatusIcon = STATUS_ICON[nodeData.status] || CheckCircle;
  const glowClass = STATUS_GLOW[nodeData.status];
  const colorClass = STATUS_COLOR[nodeData.status];

  return (
    <div
      className={cn(
        'relative bg-slate-900/95 backdrop-blur border rounded-2xl transition-all duration-300 cursor-pointer select-none',
        glowClass,
        selected ? 'ring-2 ring-teal-400/60 ring-offset-1 ring-offset-slate-900' : '',
        'min-w-[200px]'
      )}
    >
      {/* Connection handles */}
      <Handle type="target" position={Position.Top}    className="!w-3 !h-3 !bg-teal-400 !border-2 !border-slate-900 !top-[-6px]" />
      <Handle type="target" position={Position.Left}   className="!w-3 !h-3 !bg-teal-400 !border-2 !border-slate-900 !left-[-6px]" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-teal-400 !border-2 !border-slate-900 !bottom-[-6px]" />
      <Handle type="source" position={Position.Right}  className="!w-3 !h-3 !bg-teal-400 !border-2 !border-slate-900 !right-[-6px]" />

      {/* Status pulse ring for error/warning */}
      {(nodeData.status === 'error' || nodeData.status === 'warning') && (
        <div className={cn(
          'absolute -inset-1 rounded-2xl opacity-30 animate-ping',
          nodeData.status === 'error' ? 'bg-red-500' : 'bg-amber-400'
        )} />
      )}

      {/* Header */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          {/* Icon or Image */}
          <div className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 relative',
            'bg-white/5 border border-white/10'
          )}>
            {nodeData.imageUrl ? (
              <img src={nodeData.imageUrl} alt={nodeData.label} className="w-9 h-9 object-contain rounded-lg" />
            ) : (
              <span>{nodeData.icon}</span>
            )}
            {/* Status dot */}
            <span className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900',
              nodeData.status === 'normal' ? 'bg-emerald-400' :
              nodeData.status === 'warning' ? 'bg-amber-400' :
              nodeData.status === 'error' ? 'bg-red-400' :
              nodeData.status === 'maintenance' ? 'bg-blue-400' : 'bg-slate-500'
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white text-sm leading-tight truncate">{nodeData.label}</div>
            <div className="text-xs text-slate-400 truncate">{nodeData.model}</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Status badge */}
        <div className={cn('flex items-center gap-1.5 mt-2 text-xs font-medium', colorClass)}>
          <StatusIcon className="w-3 h-3" />
          <span>{STATUS_LABEL[nodeData.status]}</span>
          {nodeData.commType && (
            <span className="ml-auto text-slate-500 flex items-center gap-0.5">
              <Wifi className="w-2.5 h-2.5" />
              {nodeData.commType.replace('_', ' ').toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Sensor Data */}
      <div className="p-3">
        <div className="grid grid-cols-2 gap-2">
          {nodeData.sensor?.flowRate !== undefined && nodeData.sensor.flowRate > 0 && (
            <SensorItem icon={Droplets} label="유량" value={nodeData.sensor.flowRate.toFixed(1)} unit="L/min" color="text-cyan-400" />
          )}
          {nodeData.sensor?.outletTds !== undefined && (
            <SensorItem icon={Activity} label="TDS" value={String(nodeData.sensor.outletTds)} unit="ppm"
              color={(nodeData.sensor.outletTds) > 20 ? 'text-red-400' : 'text-emerald-400'} />
          )}
          {nodeData.sensor?.inletPressure !== undefined && nodeData.sensor.inletPressure > 0 && (
            <SensorItem icon={Gauge} label="압력" value={nodeData.sensor.inletPressure.toFixed(1)} unit="bar" color="text-purple-400" />
          )}
          {nodeData.sensor?.temperature !== undefined && nodeData.sensor.temperature > 0 && (
            <SensorItem icon={Thermometer} label="수온" value={nodeData.sensor.temperature.toFixed(1)} unit="°C" color="text-orange-400" />
          )}
        </div>

        {/* Expanded Details */}
        {expanded && nodeData.sensor && (
          <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
            {nodeData.sensor.rejectionRate !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">제거율</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-slate-700 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-emerald-400"
                      style={{ width: `${nodeData.sensor.rejectionRate}%` }}
                    />
                  </div>
                  <span className="text-emerald-400 font-medium">{nodeData.sensor.rejectionRate.toFixed(1)}%</span>
                </div>
              </div>
            )}
            {nodeData.sensor.powerKw !== undefined && nodeData.sensor.powerKw > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">소비전력</span>
                <span className="text-yellow-400 font-medium">{nodeData.sensor.powerKw.toFixed(2)} kW</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live indicator */}
      {nodeData.status === 'normal' && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-teal-400 text-[9px] font-semibold">LIVE</span>
        </div>
      )}
    </div>
  );
}

function SensorItem({ icon: Icon, label, value, unit, color }: {
  icon: React.ElementType; label: string; value: string; unit: string; color: string;
}) {
  return (
    <div className="bg-white/5 rounded-lg p-2">
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className={cn('w-3 h-3', color)} />
        <span className="text-slate-500 text-[10px]">{label}</span>
      </div>
      <div className={cn('text-sm font-bold leading-tight', color)}>{value}</div>
      <div className="text-slate-600 text-[10px]">{unit}</div>
    </div>
  );
}

export default memo(EquipmentNode);
