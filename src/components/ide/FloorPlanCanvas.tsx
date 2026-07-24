'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Line, Group } from 'react-konva';
import { FloorPlanData, RoomGeometry } from '@/types';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Info,
  Layers,
  Save,
  RotateCcw,
} from 'lucide-react';

interface FloorPlanCanvasProps {
  data: FloorPlanData;
  onUpdateData?: (updatedData: FloorPlanData) => void;
}

export function FloorPlanCanvas({ data, onUpdateData }: FloorPlanCanvasProps) {
  const [floorPlan, setFloorPlan] = useState<FloorPlanData>(data);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  
  // Canvas Viewport Transformation (Pan & Zoom)
  const [scale, setScale] = useState(40); // 1 meter = 40 pixels initial scale
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isPanning, setIsPanning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);

  // Sync internal state when prop changes
  useEffect(() => {
    setFloorPlan(data);
  }, [data]);

  // Center canvas on load
  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      const planPixelWidth = floorPlan.boundary.width * scale;
      const planPixelHeight = floorPlan.boundary.depth * scale;
      setPosition({
        x: Math.max(40, (clientWidth - planPixelWidth) / 2),
        y: Math.max(40, (clientHeight - planPixelHeight) / 2),
      });
    }
  }, [floorPlan.boundary.width, floorPlan.boundary.depth]);

  // Handle Zooming via Wheel
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.08;
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = scale;
    const pointer = stage.getPointerPosition();

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    // Restrict scale bounds (10px per meter to 150px per meter)
    const clampedScale = Math.max(12, Math.min(160, newScale));
    setScale(clampedScale);

    if (pointer) {
      const mousePointTo = {
        x: (pointer.x - position.x) / oldScale,
        y: (pointer.y - position.y) / oldScale,
      };
      setPosition({
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      });
    }
  };

  // Dragging a Room on the Canvas
  const handleRoomDragEnd = (roomId: string, e: any) => {
    const node = e.target;
    // Calculate new position in meters
    const newMetersX = Math.max(0, Math.round(((node.x() - position.x) / scale) * 10) / 10);
    const newMetersY = Math.max(0, Math.round(((node.y() - position.y) / scale) * 10) / 10);

    const updatedRooms = floorPlan.rooms.map((r) => {
      if (r.id === roomId) {
        return {
          ...r,
          x: newMetersX,
          y: newMetersY,
        };
      }
      return r;
    });

    const updatedPlan = {
      ...floorPlan,
      rooms: updatedRooms,
      updated_at: new Date().toISOString(),
    };

    setFloorPlan(updatedPlan);
    onUpdateData?.(updatedPlan);
  };

  // Reset Zoom & Center View
  const handleResetView = () => {
    setScale(40);
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      const planPixelWidth = floorPlan.boundary.width * 40;
      const planPixelHeight = floorPlan.boundary.depth * 40;
      setPosition({
        x: Math.max(40, (clientWidth - planPixelWidth) / 2),
        y: Math.max(40, (clientHeight - planPixelHeight) / 2),
      });
    }
  };

  // Export Canvas Image to PNG
  const handleExportPNG = () => {
    if (stageRef.current) {
      const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${floorPlan.title.toLowerCase().replace(/\s+/g, '_')}.png`;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const totalCalculatedArea = floorPlan.rooms.reduce((acc, r) => acc + r.area_m2, 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8f9fa] relative select-none overflow-hidden font-sans">
      {/* Top Toolbar Bar */}
      <div className="h-12 px-6 bg-white border-b border-[#e4e4e7] flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#fdf5f2] border border-[#BA4E20]/30 rounded-md text-xs font-mono font-semibold text-[#BA4E20]">
            <Layers className="w-3.5 h-3.5" />
            <span>ESTUDO DE LAYOUT 2D</span>
          </div>
          <h2 className="text-sm font-semibold text-[#09090b] truncate max-w-xs">
            {floorPlan.title}
          </h2>
          <span className="text-xs font-mono text-[#71717a] bg-[#f4f4f5] px-2 py-0.5 rounded border border-[#e4e4e7]">
            {floorPlan.boundary.width.toFixed(2)}m × {floorPlan.boundary.depth.toFixed(2)}m ({Math.round(totalCalculatedArea * 100) / 100} m²)
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetView}
            className="p-1.5 bg-[#f8f9fa] hover:bg-[#fdf5f2] border border-[#e4e4e7] hover:border-[#BA4E20]/50 rounded-lg text-[#71717a] hover:text-[#BA4E20] transition-colors cursor-pointer text-xs flex items-center gap-1 font-mono"
            title="Resetar Visualização"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Resetar</span>
          </button>

          <button
            onClick={handleExportPNG}
            className="p-1.5 bg-[#BA4E20] hover:bg-[#9c3f19] text-white rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1.5 font-medium shadow-2xs"
            title="Exportar Imagem PNG"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar PNG</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Konva Canvas Container */}
      <div
        ref={containerRef}
        className="flex-1 relative bg-[#fafafa] cursor-grab active:cursor-grabbing overflow-hidden"
        onMouseDown={() => setIsPanning(true)}
        onMouseUp={() => setIsPanning(false)}
      >
        <Stage
          ref={stageRef}
          width={1200}
          height={800}
          onWheel={handleWheel}
          draggable
          x={position.x}
          y={position.y}
          onDragEnd={(e) => {
            if (e.target === stageRef.current) {
              setPosition({ x: e.target.x(), y: e.target.y() });
            }
          }}
        >
          <Layer>
            {/* Fine Grid Background */}
            <Group>
              {Array.from({ length: 40 }).map((_, i) => (
                <React.Fragment key={`grid-${i}`}>
                  <Line
                    points={[i * 2 * scale, -1000, i * 2 * scale, 2000]}
                    stroke="#e4e4e7"
                    strokeWidth={0.5}
                    dash={[4, 4]}
                  />
                  <Line
                    points={[-1000, i * 2 * scale, 2000, i * 2 * scale]}
                    stroke="#e4e4e7"
                    strokeWidth={0.5}
                    dash={[4, 4]}
                  />
                </React.Fragment>
              ))}
            </Group>

            {/* Boundary Lot / Perimeter Walls (Thick black line) */}
            <Rect
              x={0}
              y={0}
              width={floorPlan.boundary.width * scale}
              height={floorPlan.boundary.depth * scale}
              stroke="#09090b"
              strokeWidth={5}
              fill="#ffffff"
              shadowColor="black"
              shadowBlur={8}
              shadowOpacity={0.06}
            />

            {/* Boundary Dimension Lines (Cotas Gerais) */}
            {/* Top Boundary Cota */}
            <Group y={-24}>
              <Line
                points={[0, 0, floorPlan.boundary.width * scale, 0]}
                stroke="#71717a"
                strokeWidth={1}
              />
              <Line points={[0, -5, 0, 5]} stroke="#71717a" strokeWidth={1} />
              <Line
                points={[
                  floorPlan.boundary.width * scale,
                  -5,
                  floorPlan.boundary.width * scale,
                  5,
                ]}
                stroke="#71717a"
                strokeWidth={1}
              />
              <Text
                x={0}
                y={-14}
                width={floorPlan.boundary.width * scale}
                text={`${floorPlan.boundary.width.toFixed(2)} m`}
                align="center"
                fontSize={11}
                fontStyle="bold"
                fontFamily="monospace"
                fill="#09090b"
              />
            </Group>

            {/* Left Boundary Cota */}
            <Group x={-28}>
              <Line
                points={[0, 0, 0, floorPlan.boundary.depth * scale]}
                stroke="#71717a"
                strokeWidth={1}
              />
              <Line points={[-5, 0, 5, 0]} stroke="#71717a" strokeWidth={1} />
              <Line
                points={[
                  -5,
                  floorPlan.boundary.depth * scale,
                  5,
                  floorPlan.boundary.depth * scale,
                ]}
                stroke="#71717a"
                strokeWidth={1}
              />
              <Text
                x={-60}
                y={floorPlan.boundary.depth * scale / 2 - 6}
                width={50}
                text={`${floorPlan.boundary.depth.toFixed(2)} m`}
                align="right"
                fontSize={11}
                fontStyle="bold"
                fontFamily="monospace"
                fill="#09090b"
              />
            </Group>

            {/* Render Each Room with Retainable CAD Monochrome Styling */}
            {floorPlan.rooms.map((room) => {
              const isSelected = selectedRoomId === room.id;
              const roomPxX = room.x * scale;
              const roomPxY = room.y * scale;
              const roomPxW = room.width * scale;
              const roomPxH = room.height * scale;

              return (
                <Group
                  key={room.id}
                  x={roomPxX}
                  y={roomPxY}
                  draggable
                  onClick={() => setSelectedRoomId(room.id)}
                  onTap={() => setSelectedRoomId(room.id)}
                  onDragEnd={(e) => handleRoomDragEnd(room.id, e)}
                >
                  {/* Room Rectangle Box */}
                  <Rect
                    width={roomPxW}
                    height={roomPxH}
                    fill={isSelected ? '#fdf5f2' : '#ffffff'}
                    stroke={isSelected ? '#BA4E20' : '#18181b'}
                    strokeWidth={isSelected ? 3 : 2}
                    cornerRadius={2}
                  />

                  {/* Room Internal Text Labels */}
                  <Text
                    x={4}
                    y={Math.max(6, roomPxH / 2 - 14)}
                    width={roomPxW - 8}
                    text={room.name.toUpperCase()}
                    align="center"
                    fontSize={Math.max(10, Math.min(13, scale * 0.28))}
                    fontStyle="bold"
                    fontFamily="sans-serif"
                    fill={isSelected ? '#BA4E20' : '#09090b'}
                  />
                  <Text
                    x={4}
                    y={Math.max(6, roomPxH / 2 + 4)}
                    width={roomPxW - 8}
                    text={`${room.area_m2.toFixed(2)} m²`}
                    align="center"
                    fontSize={Math.max(9, Math.min(11, scale * 0.24))}
                    fontFamily="monospace"
                    fill="#71717a"
                  />

                  {/* Individual Room Dimension Lines (Linhas de Cota do Cômodo) */}
                  {/* Bottom Cota */}
                  <Line
                    points={[2, roomPxH + 8, roomPxW - 2, roomPxH + 8]}
                    stroke="#a1a1aa"
                    strokeWidth={1}
                  />
                  <Line
                    points={[2, roomPxH + 5, 2, roomPxH + 11]}
                    stroke="#a1a1aa"
                    strokeWidth={1}
                  />
                  <Line
                    points={[roomPxW - 2, roomPxH + 5, roomPxW - 2, roomPxH + 11]}
                    stroke="#a1a1aa"
                    strokeWidth={1}
                  />
                  <Text
                    x={0}
                    y={roomPxH + 10}
                    width={roomPxW}
                    text={`${room.width.toFixed(2)} m`}
                    align="center"
                    fontSize={9}
                    fontFamily="monospace"
                    fill="#71717a"
                  />

                  {/* Right Cota */}
                  <Line
                    points={[roomPxW + 8, 2, roomPxW + 8, roomPxH - 2]}
                    stroke="#a1a1aa"
                    strokeWidth={1}
                  />
                  <Line
                    points={[roomPxW + 5, 2, roomPxW + 11, 2]}
                    stroke="#a1a1aa"
                    strokeWidth={1}
                  />
                  <Line
                    points={[
                      roomPxW + 5,
                      roomPxH - 2,
                      roomPxW + 11,
                      roomPxH - 2,
                    ]}
                    stroke="#a1a1aa"
                    strokeWidth={1}
                  />
                  <Text
                    x={roomPxW + 10}
                    y={roomPxH / 2 - 5}
                    text={`${room.height.toFixed(2)} m`}
                    fontSize={9}
                    fontFamily="monospace"
                    fill="#71717a"
                  />
                </Group>
              );
            })}
          </Layer>
        </Stage>

        {/* Floating Zoom & Pan Control Widget (Bottom Right) */}
        <div className="absolute bottom-6 right-6 bg-white border border-[#e4e4e7] rounded-xl shadow-lg p-1.5 flex items-center gap-1 z-20">
          <button
            onClick={() => setScale((s) => Math.min(160, s * 1.15))}
            className="p-1.5 hover:bg-[#f4f4f5] rounded-lg text-[#09090b] transition-colors cursor-pointer"
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono font-semibold px-2 text-[#71717a]">
            {Math.round((scale / 40) * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.max(12, s / 1.15))}
            className="p-1.5 hover:bg-[#f4f4f5] rounded-lg text-[#09090b] transition-colors cursor-pointer"
            title="Diminuir Zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-[#e4e4e7] mx-0.5" />
          <button
            onClick={handleResetView}
            className="p-1.5 hover:bg-[#f4f4f5] rounded-lg text-[#09090b] transition-colors cursor-pointer"
            title="Centralizar Planta"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Legal & Technical Disclaimer Banner (Bottom Left) */}
        <div className="absolute bottom-4 left-6 bg-white/90 backdrop-blur-xs border border-[#e4e4e7] rounded-lg px-3 py-1.5 max-w-md shadow-2xs z-20 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-[#BA4E20] shrink-0" />
          <p className="text-[10px] font-mono text-[#71717a] leading-tight">
            <strong>Aviso Técnico:</strong> Estudo preliminar de layout para apoio conceitual. Não substitui projeto executivo nem Responsabilidade Técnica (ART/RRT).
          </p>
        </div>
      </div>
    </div>
  );
}
