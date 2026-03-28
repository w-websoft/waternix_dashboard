'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';

export type ImageNodeData = {
  label: string;
  imageUrl: string;
  width?: number;
  height?: number;
};

function CustomImageNode({ data, selected }: NodeProps) {
  const nodeData = data as ImageNodeData;
  const w = nodeData.width || 120;
  const h = nodeData.height || 120;

  return (
    <div className={cn(
      'relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer',
      selected ? 'border-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.5)]' : 'border-transparent hover:border-slate-600'
    )}
      style={{ width: w, height: h }}
    >
      <Handle type="target" position={Position.Top}    className="!w-3 !h-3 !bg-teal-400 !border-2 !border-slate-900" />
      <Handle type="target" position={Position.Left}   className="!w-3 !h-3 !bg-teal-400 !border-2 !border-slate-900" />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-teal-400 !border-2 !border-slate-900" />
      <Handle type="source" position={Position.Right}  className="!w-3 !h-3 !bg-teal-400 !border-2 !border-slate-900" />

      <img src={nodeData.imageUrl} alt={nodeData.label} className="w-full h-full object-contain bg-slate-800/50" />

      {nodeData.label && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs text-center py-1 font-medium truncate px-1">
          {nodeData.label}
        </div>
      )}
    </div>
  );
}

export default memo(CustomImageNode);
