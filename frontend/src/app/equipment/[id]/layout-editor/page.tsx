'use client';

import { use, useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant,
  Controls, MiniMap, addEdge, useNodesState, useEdgesState,
  Connection, Edge, Node, Panel, MarkerType,
  ConnectionMode, SelectionMode
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import EquipmentNode, { EquipmentNodeData } from '@/components/layout-editor/EquipmentNode';
import CustomImageNode, { ImageNodeData } from '@/components/layout-editor/CustomImageNode';
import TextLabelNode, { TextLabelData } from '@/components/layout-editor/TextLabelNode';
import { mockEquipment } from '@/lib/mock-data';
import { EQUIPMENT_TYPE_CONFIG } from '@/lib/utils';
import {
  ArrowLeft, Save, ZoomIn, ZoomOut, Maximize2, Grid3X3,
  Plus, Trash2, Upload, Image, Type, Cpu, Link2, RotateCcw,
  Download, Eye, Settings2, ChevronRight, ChevronLeft,
  Droplets, Activity, Gauge, Zap, LayoutDashboard
} from 'lucide-react';

const nodeTypes = {
  equipment: EquipmentNode,
  image: CustomImageNode,
  label: TextLabelNode,
};

const PIPE_COLORS = {
  water:    { stroke: '#06b6d4', label: '수관 (급수)' },
  drain:    { stroke: '#64748b', label: '배수관' },
  signal:   { stroke: '#00d4aa', label: '통신선' },
  power:    { stroke: '#f59e0b', label: '전력선' },
  chemical: { stroke: '#a855f7', label: '약품라인' },
};

type PipeType = keyof typeof PIPE_COLORS;

// 초기 노드 생성 함수
function buildInitialNodes(equipmentId: string): Node[] {
  const eq = mockEquipment.find(e => e.id === equipmentId);
  if (!eq) return [];

  const typeConf = EQUIPMENT_TYPE_CONFIG[eq.equipmentType];
  const nodes: Node[] = [
    {
      id: equipmentId,
      type: 'equipment',
      position: { x: 400, y: 280 },
      data: {
        label: eq.name || eq.model,
        model: eq.model,
        type: eq.equipmentType,
        icon: typeConf.icon,
        status: eq.status,
        commType: eq.commType,
        sensor: eq.sensorData ? {
          flowRate: eq.sensorData.flowRate,
          outletTds: eq.sensorData.outletTds,
          inletPressure: eq.sensorData.inletPressure,
          temperature: eq.sensorData.temperature,
          powerKw: eq.sensorData.powerKw,
          rejectionRate: eq.sensorData.rejectionRate,
        } : undefined,
      } as EquipmentNodeData,
    },
    {
      id: 'pre-filter-1',
      type: 'equipment',
      position: { x: 80, y: 280 },
      data: {
        label: '전처리 필터 #1',
        model: 'Pre-Filter Unit',
        type: 'prefilter',
        icon: '🔧',
        status: 'normal',
        commType: 'modbus_rtu',
        sensor: { flowRate: 7.2, inletPressure: 4.5, temperature: 18.2 },
      } as EquipmentNodeData,
    },
    {
      id: 'carbon-filter',
      type: 'equipment',
      position: { x: 240, y: 180 },
      data: {
        label: '활성탄 필터',
        model: 'Carbon Block',
        type: 'prefilter',
        icon: '🔧',
        status: 'warning',
        commType: 'modbus_rtu',
        sensor: { flowRate: 7.0, inletPressure: 4.3 },
      } as EquipmentNodeData,
    },
    {
      id: 'uv-sterilizer',
      type: 'equipment',
      position: { x: 620, y: 180 },
      data: {
        label: 'UV 살균기',
        model: 'UV-T Series',
        type: 'uv',
        icon: '☀️',
        status: 'normal',
        commType: 'mqtt',
        sensor: { flowRate: 6.8 },
      } as EquipmentNodeData,
    },
    {
      id: 'product-tank',
      type: 'equipment',
      position: { x: 620, y: 380 },
      data: {
        label: '정수 저장탱크',
        model: 'Storage Tank',
        type: 'booster',
        icon: '🪣',
        status: 'normal',
        commType: 'mqtt',
        sensor: { flowRate: 0, temperature: 19.5 },
      } as EquipmentNodeData,
    },
    {
      id: 'label-input',
      type: 'label',
      position: { x: 60, y: 200 },
      data: { label: '🌊 원수 입수', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' } as TextLabelData,
    },
    {
      id: 'label-output',
      type: 'label',
      position: { x: 640, y: 500 },
      data: { label: '✅ 정수 출수', color: '#10b981', bg: 'rgba(16,185,129,0.1)' } as TextLabelData,
    },
  ];
  return nodes;
}

function buildInitialEdges(equipmentId: string): Edge[] {
  return [
    {
      id: 'e1', source: 'label-input', target: 'pre-filter-1',
      type: 'smoothstep', animated: true,
      style: { stroke: '#64748b', strokeWidth: 2.5, strokeDasharray: '6 3' },
      label: '원수',
      labelStyle: { fill: '#94a3b8', fontSize: 10 },
    },
    {
      id: 'e2', source: 'pre-filter-1', target: 'carbon-filter',
      type: 'smoothstep', animated: true,
      style: { stroke: '#06b6d4', strokeWidth: 3 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' },
      label: '전처리수',
      labelStyle: { fill: '#06b6d4', fontSize: 10 },
    },
    {
      id: 'e3', source: 'carbon-filter', target: equipmentId,
      type: 'smoothstep', animated: true,
      style: { stroke: '#06b6d4', strokeWidth: 3 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#06b6d4' },
    },
    {
      id: 'e4', source: equipmentId, target: 'uv-sterilizer',
      type: 'smoothstep', animated: true,
      style: { stroke: '#00d4aa', strokeWidth: 3 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#00d4aa' },
      label: '정수',
      labelStyle: { fill: '#00d4aa', fontSize: 10 },
    },
    {
      id: 'e5', source: 'uv-sterilizer', target: 'product-tank',
      type: 'smoothstep', animated: true,
      style: { stroke: '#00d4aa', strokeWidth: 3 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#00d4aa' },
    },
    {
      id: 'e6', source: 'product-tank', target: 'label-output',
      type: 'smoothstep', animated: true,
      style: { stroke: '#10b981', strokeWidth: 2.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    },
    {
      id: 'e-comm1', source: equipmentId, target: 'pre-filter-1',
      type: 'straight',
      style: { stroke: '#00d4aa', strokeWidth: 1, strokeDasharray: '4 4' },
      label: 'MQTT',
      labelStyle: { fill: '#00d4aa', fontSize: 9 },
    },
  ];
}

function LayoutEditorInner({ id }: { id: string }) {
  const router = useRouter();
  const eq = mockEquipment.find(e => e.id === id);

  const [nodes, setNodes, onNodesChange] = useNodesState(buildInitialNodes(id));
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildInitialEdges(id));
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [pipeType, setPipeType] = useState<PipeType>('water');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'equipment' | 'shapes' | 'settings'>('equipment');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onConnect = useCallback((connection: Connection) => {
    const color = PIPE_COLORS[pipeType].stroke;
    const edge: Edge = {
      ...connection,
      id: `e-${Date.now()}`,
      type: 'smoothstep',
      animated: pipeType === 'water' || pipeType === 'signal',
      style: {
        stroke: color,
        strokeWidth: pipeType === 'signal' ? 1.5 : 3,
        strokeDasharray: pipeType === 'signal' ? '6 3' : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color },
      label: PIPE_COLORS[pipeType].label,
      labelStyle: { fill: color, fontSize: 10 },
    };
    setEdges(eds => addEdge(edge, eds));
  }, [pipeType, setEdges]);

  const handleSave = () => {
    const layoutData = { nodes, edges, savedAt: new Date().toISOString() };
    localStorage.setItem(`layout_${id}`, JSON.stringify(layoutData));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLoad = useCallback(() => {
    const saved = localStorage.getItem(`layout_${id}`);
    if (saved) {
      const data = JSON.parse(saved);
      setNodes(data.nodes);
      setEdges(data.edges);
    }
  }, [id, setNodes, setEdges]);

  useEffect(() => { handleLoad(); }, [handleLoad]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const newNode: Node = {
      id: `img-${Date.now()}`,
      type: 'image',
      position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: { label: file.name.replace(/\.[^/.]+$/, ''), imageUrl: url, width: 140, height: 140 } as ImageNodeData,
    };
    setNodes(nds => [...nds, newNode]);
  };

  const addEquipmentNode = (eq: typeof mockEquipment[0]) => {
    const typeConf = EQUIPMENT_TYPE_CONFIG[eq.equipmentType];
    const newNode: Node = {
      id: `eq-${Date.now()}`,
      type: 'equipment',
      position: { x: 100 + Math.random() * 400, y: 100 + Math.random() * 300 },
      data: {
        label: eq.name || eq.model,
        model: eq.model,
        type: eq.equipmentType,
        icon: typeConf.icon,
        status: eq.status,
        commType: eq.commType,
        sensor: eq.sensorData ? {
          flowRate: eq.sensorData.flowRate,
          outletTds: eq.sensorData.outletTds,
          inletPressure: eq.sensorData.inletPressure,
          temperature: eq.sensorData.temperature,
        } : undefined,
      } as EquipmentNodeData,
    };
    setNodes(nds => [...nds, newNode]);
  };

  const addShapeNode = (type: string, label: string) => {
    const colors = { text: '#00d4aa', area: '#3b82f6', zone: '#8b5cf6' };
    const newNode: Node = {
      id: `shape-${Date.now()}`,
      type: 'label',
      position: { x: 200 + Math.random() * 300, y: 200 + Math.random() * 200 },
      data: {
        label,
        color: colors[type as keyof typeof colors] || '#00d4aa',
        bg: `${colors[type as keyof typeof colors] || '#00d4aa'}15`,
        fontSize: 13,
      } as TextLabelData,
    };
    setNodes(nds => [...nds, newNode]);
  };

  const deleteSelected = useCallback(() => {
    setNodes(nds => nds.filter(n => !n.selected));
    setEdges(eds => eds.filter(e => !e.selected));
  }, [setNodes, setEdges]);

  const handleExport = () => {
    const data = { nodes, edges, equipment: eq?.name, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `layout_${eq?.serialNo || id}.json`;
    a.click();
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden" style={{ background: '#060d1a' }}>
      {/* ─── Top Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 flex-shrink-0"
        style={{ background: 'rgba(6,13,26,0.95)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> 뒤로
          </button>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-teal-400" />
            <div>
              <div className="text-white font-semibold text-sm leading-tight">{eq?.name || eq?.model} — 시설 배치도</div>
              <div className="text-slate-500 text-xs">{eq?.companyName} · {eq?.address}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pipe Type Selector */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl px-2 py-1.5 border border-white/10">
            <Link2 className="w-3.5 h-3.5 text-slate-400 mr-1" />
            {(Object.entries(PIPE_COLORS) as [PipeType, { stroke: string; label: string }][]).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setPipeType(key)}
                title={val.label}
                className={`w-5 h-5 rounded-full border-2 transition-all ${pipeType === key ? 'scale-125 border-white' : 'border-transparent opacity-60 hover:opacity-100'}`}
                style={{ background: val.stroke }}
              />
            ))}
            <span className="text-xs text-slate-400 ml-1 hidden sm:block">{PIPE_COLORS[pipeType].label}</span>
          </div>

          <div className="w-px h-6 bg-white/10" />

          <button onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-lg transition-colors ${showGrid ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500 hover:text-white hover:bg-white/10'}`}>
            <Grid3X3 className="w-4 h-4" />
          </button>

          <button onClick={deleteSelected}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>

          <button onClick={handleExport}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors">
            <Download className="w-4 h-4" />
          </button>

          <button onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${
              saved ? 'bg-emerald-500 text-white' : 'bg-teal-500 hover:bg-teal-400 text-white shadow-lg shadow-teal-500/30'
            }`}>
            <Save className="w-3.5 h-3.5" />
            {saved ? '저장됨 ✓' : '저장'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Left Sidebar ──────────────────────────────────────────────────────── */}
        <div className={`flex-shrink-0 transition-all duration-300 overflow-hidden border-r border-white/10 flex flex-col ${sidebarOpen ? 'w-64' : 'w-0'}`}
          style={{ background: 'rgba(6,13,26,0.95)' }}>
          {/* Tabs */}
          <div className="flex border-b border-white/10 flex-shrink-0">
            {([
              { id: 'equipment', label: '장비', icon: Cpu },
              { id: 'shapes', label: '도형', icon: Grid3X3 },
              { id: 'settings', label: '설정', icon: Settings2 },
            ] as const).map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                    activeTab === tab.id ? 'text-teal-400 border-b-2 border-teal-400' : 'text-slate-500 hover:text-slate-300'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />{tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {/* Equipment Tab */}
            {activeTab === 'equipment' && (
              <>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-1">캔버스에 드래그하여 추가</div>
                {mockEquipment.map(eq => {
                  const tc = EQUIPMENT_TYPE_CONFIG[eq.equipmentType];
                  return (
                    <button key={eq.id} onClick={() => addEquipmentNode(eq)}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-teal-500/40 transition-all text-left group">
                      <span className="text-xl flex-shrink-0">{tc.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-white text-xs font-medium truncate">{eq.name || eq.model}</div>
                        <div className="text-slate-500 text-[10px] truncate">{eq.city} · {tc.label}</div>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-slate-600 group-hover:text-teal-400 flex-shrink-0" />
                    </button>
                  );
                })}
              </>
            )}

            {/* Shapes Tab */}
            {activeTab === 'shapes' && (
              <>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-1">도형/레이블 추가</div>

                {/* Image Upload */}
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 hover:border-teal-400/60 transition-all">
                  <Upload className="w-4 h-4 text-teal-400" />
                  <div className="text-left">
                    <div className="text-teal-300 text-xs font-medium">이미지 업로드</div>
                    <div className="text-teal-600 text-[10px]">PNG, JPG, SVG 지원</div>
                  </div>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

                <div className="w-full h-px bg-white/10 my-1" />
                <div className="text-[10px] text-slate-600 px-1 mb-1">텍스트 레이블</div>

                {[
                  { label: '🌊 원수 입수', type: 'text' },
                  { label: '✅ 정수 출수', type: 'text' },
                  { label: '⚡ 전력 공급', type: 'area' },
                  { label: '📡 통신 허브', type: 'zone' },
                  { label: '🔴 긴급 차단', type: 'area' },
                  { label: '🏭 제어반', type: 'zone' },
                  { label: '🪣 저장탱크', type: 'text' },
                  { label: '⚗️ 약품투입', type: 'area' },
                ].map(s => (
                  <button key={s.label} onClick={() => addShapeNode(s.type, s.label)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left text-xs text-slate-300 hover:text-white">
                    <span className="flex-1">{s.label}</span>
                    <Plus className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                ))}
              </>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <>
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-1">연결선 설정</div>
                {(Object.entries(PIPE_COLORS) as [PipeType, { stroke: string; label: string }][]).map(([key, val]) => (
                  <button key={key} onClick={() => setPipeType(key)}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                      pipeType === key ? 'border-white/30 bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}>
                    <div className="w-8 h-1 rounded-full flex-shrink-0" style={{ background: val.stroke }} />
                    <span className="text-xs text-slate-300 flex-1 text-left">{val.label}</span>
                    {pipeType === key && <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />}
                  </button>
                ))}

                <div className="w-full h-px bg-white/10 my-2" />
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-1">범례</div>
                <div className="bg-white/5 rounded-xl p-3 space-y-2 border border-white/10">
                  {(Object.entries(PIPE_COLORS) as [PipeType, { stroke: string; label: string }][]).map(([, val]) => (
                    <div key={val.label} className="flex items-center gap-2 text-xs text-slate-400">
                      <div className="w-8 h-0.5 rounded" style={{ background: val.stroke }} />
                      <span>{val.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Toggle Sidebar Button */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-4 h-12 rounded-r-lg bg-slate-700 hover:bg-teal-500 text-slate-400 hover:text-white transition-all flex items-center justify-center"
          style={{ left: sidebarOpen ? 256 : 0 }}>
          {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

        {/* ─── Canvas ──────────────────────────────────────────────────────────── */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            connectionMode={ConnectionMode.Loose}
            selectionMode={SelectionMode.Partial}
            onNodeClick={(_, node) => setSelectedNode(node)}
            onPaneClick={() => setSelectedNode(null)}
            defaultEdgeOptions={{
              type: 'smoothstep',
              style: { stroke: PIPE_COLORS[pipeType].stroke, strokeWidth: 2.5 },
              markerEnd: { type: MarkerType.ArrowClosed, color: PIPE_COLORS[pipeType].stroke },
              animated: true,
            }}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            style={{ background: 'transparent' }}
          >
            {/* Dark grid background */}
            {showGrid && (
              <Background
                variant={BackgroundVariant.Dots}
                gap={24}
                size={1.5}
                color="rgba(255,255,255,0.05)"
              />
            )}

            <Controls
              className="!bg-slate-900/90 !border !border-white/10 !rounded-xl !overflow-hidden"
              style={{ bottom: 20, right: 20 }}
            />

            <MiniMap
              className="!bg-slate-900 !border !border-white/10 !rounded-xl"
              nodeColor={(n) => {
                if (n.type === 'equipment') {
                  const s = (n.data as EquipmentNodeData).status;
                  return s === 'normal' ? '#10b981' : s === 'warning' ? '#f59e0b' : s === 'error' ? '#ef4444' : s === 'offline' ? '#64748b' : '#3b82f6';
                }
                return '#00d4aa';
              }}
              maskColor="rgba(6,13,26,0.8)"
              style={{ bottom: 20, right: 110, width: 160, height: 100 }}
            />

            {/* Status Legend Panel */}
            <Panel position="top-right">
              <div className="bg-slate-900/90 border border-white/10 rounded-xl p-3 text-xs space-y-1.5 backdrop-blur"
                style={{ minWidth: 160 }}>
                <div className="text-slate-400 font-semibold mb-2">장비 상태</div>
                {[
                  { color: '#10b981', label: '정상 가동' },
                  { color: '#f59e0b', label: '경고' },
                  { color: '#ef4444', label: '오류/정지' },
                  { color: '#3b82f6', label: '유지보수' },
                  { color: '#64748b', label: '오프라인' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2 text-slate-400">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    {s.label}
                  </div>
                ))}
                <div className="border-t border-white/10 pt-1.5 mt-1.5">
                  <div className="text-slate-500">노드: {nodes.length} · 연결: {edges.length}</div>
                </div>
              </div>
            </Panel>

            {/* Help Panel */}
            <Panel position="bottom-left">
              <div className="bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-slate-500 backdrop-blur space-y-0.5">
                <div><kbd className="bg-white/10 px-1 rounded">드래그</kbd> 노드 이동</div>
                <div><kbd className="bg-white/10 px-1 rounded">핸들→핸들</kbd> 연결</div>
                <div><kbd className="bg-white/10 px-1 rounded">Delete</kbd> 선택 삭제</div>
                <div><kbd className="bg-white/10 px-1 rounded">Ctrl+Z</kbd> 되돌리기</div>
              </div>
            </Panel>
          </ReactFlow>

          {/* Selected Node Info Panel */}
          {selectedNode && selectedNode.type === 'equipment' && (() => {
            const d = selectedNode.data as EquipmentNodeData;
            return (
              <div className="absolute top-4 left-4 w-64 bg-slate-900/95 border border-teal-500/40 rounded-2xl overflow-hidden shadow-2xl shadow-teal-500/20 backdrop-blur z-10">
                <div className="bg-gradient-to-r from-teal-600/20 to-blue-600/10 px-4 py-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{d.icon}</span>
                    <div>
                      <div className="text-white font-semibold text-sm">{d.label}</div>
                      <div className="text-slate-400 text-xs">{d.model}</div>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  {d.sensor && Object.entries({
                    '유량': d.sensor.flowRate ? `${d.sensor.flowRate.toFixed(1)} L/min` : '-',
                    'TDS': d.sensor.outletTds !== undefined ? `${d.sensor.outletTds} ppm` : '-',
                    '압력': d.sensor.inletPressure ? `${d.sensor.inletPressure.toFixed(1)} bar` : '-',
                    '수온': d.sensor.temperature ? `${d.sensor.temperature.toFixed(1)} °C` : '-',
                    '전력': d.sensor.powerKw ? `${d.sensor.powerKw.toFixed(2)} kW` : '-',
                    '제거율': d.sensor.rejectionRate ? `${d.sensor.rejectionRate.toFixed(1)} %` : '-',
                  }).map(([k, v]) => v !== '-' && (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-slate-500">{k}</span>
                      <span className="text-teal-300 font-mono font-semibold">{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs border-t border-white/10 pt-2 mt-1">
                    <span className="text-slate-500">통신</span>
                    <span className="text-blue-400">{d.commType?.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default function LayoutEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ReactFlowProvider>
      <LayoutEditorInner id={id} />
    </ReactFlowProvider>
  );
}
