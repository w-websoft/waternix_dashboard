'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';

export type TextLabelData = {
  label: string;
  fontSize?: number;
  color?: string;
  bg?: string;
};

function TextLabelNode({ data, selected }: NodeProps) {
  const nodeData = data as TextLabelData;
  return (
    <div className={cn(
      'px-4 py-2 rounded-lg border-2 text-white font-medium transition-all cursor-pointer text-center',
      selected ? 'border-teal-400' : 'border-transparent'
    )}
      style={{
        background: nodeData.bg || 'rgba(0,212,170,0.15)',
        border: selected ? undefined : `1px solid ${nodeData.color || '#00d4aa'}40`,
        color: nodeData.color || '#00d4aa',
        fontSize: nodeData.fontSize || 14,
      }}
    >
      <Handle type="target" position={Position.Left}  className="!w-2.5 !h-2.5 !bg-teal-400 !border-2 !border-slate-900" />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !bg-teal-400 !border-2 !border-slate-900" />
      {nodeData.label}
    </div>
  );
}

export default memo(TextLabelNode);
