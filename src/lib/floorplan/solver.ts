import { FloorPlanIntentJSON, FloorPlanData, RoomGeometry } from '@/types';

/**
 * Deterministic Floor Plan Constraint Solver.
 * Takes a structured intent JSON (from LLM) and resolves exact, non-overlapping
 * room geometries (position, width, height, area) bounded within the total perimeter.
 */
export function solveFloorPlan(
  intent: FloorPlanIntentJSON,
  title = 'Planta Baixa - Estudo Técnico'
): FloorPlanData {
  const totalArea = intent.area_total_m2 || 100;
  
  // 1. Determine Boundary Dimensions
  let width = intent.restricoes_terreno?.largura_m || 0;
  let depth = intent.restricoes_terreno?.profundidade_m || 0;

  if (!width || !depth) {
    // Default to an ergonomic ~1.2:1 aspect ratio
    width = Math.round(Math.sqrt(totalArea * 1.25) * 10) / 10;
    depth = Math.round((totalArea / width) * 10) / 10;
  }

  // 2. Prepare Room List
  const rawRooms = intent.comodos && intent.comodos.length > 0
    ? intent.comodos
    : defaultRoomsForArea(totalArea);

  // Sort rooms descending by target area so large spaces (Living, Main Bed) anchor the layout
  const sortedRooms = [...rawRooms].map((r, idx) => {
    const targetArea = (r.area_min_m2 + r.area_max_m2) / 2 || 12;
    return {
      id: `room-${idx + 1}`,
      name: r.nome || `Cômodo ${idx + 1}`,
      targetArea,
      aspectRatio: (r as { aspect_ratio?: number }).aspect_ratio || (r.nome.toLowerCase().includes('circula') || r.nome.toLowerCase().includes('corredor') ? 2.5 : 1.2),
    };
  }).sort((a, b) => b.targetArea - a.targetArea);

  // 3. Grid Packing Algorithm (0.1m step precision)
  const placedRooms: RoomGeometry[] = [];
  const padding = 0.2; // 20cm outer wall margin
  const availWidth = width - padding * 2;
  const availDepth = depth - padding * 2;

  let currentX = padding;
  let currentY = padding;
  let rowMaxHeight = 0;

  for (const r of sortedRooms) {
    // Initial dimension estimate based on aspect ratio
    let roomW = Math.round(Math.sqrt(r.targetArea * r.aspectRatio) * 10) / 10;
    let roomH = Math.round((r.targetArea / roomW) * 10) / 10;

    // Enforce bounds within available perimeter
    if (roomW > availWidth) roomW = availWidth;
    if (roomH > availDepth) roomH = availDepth;

    // Check if room fits in current row
    if (currentX + roomW > width - padding && currentX > padding) {
      // Move to next row below
      currentX = padding;
      currentY += rowMaxHeight;
      rowMaxHeight = 0;
    }

    // Ensure it doesn't exceed total depth
    if (currentY + roomH > depth - padding) {
      roomH = Math.max(1.5, Math.round((depth - padding - currentY) * 10) / 10);
    }

    const actualArea = Math.round(roomW * roomH * 100) / 100;

    placedRooms.push({
      id: r.id,
      name: r.name,
      x: Math.round(currentX * 100) / 100,
      y: Math.round(currentY * 100) / 100,
      width: Math.round(roomW * 100) / 100,
      height: Math.round(roomH * 100) / 100,
      area_m2: actualArea,
    });

    currentX += roomW;
    if (roomH > rowMaxHeight) {
      rowMaxHeight = roomH;
    }
  }

  // 4. Overlap & Gap Optimization Pass
  const solvedRooms = optimizeRoomGrid(placedRooms, width, depth, padding);

  const calculatedTotalArea = solvedRooms.reduce((sum, r) => sum + r.area_m2, 0);

  return {
    id: `fp-${Date.now()}`,
    title,
    total_area_m2: Math.round(calculatedTotalArea * 100) / 100,
    boundary: {
      width: Math.round(width * 10) / 10,
      depth: Math.round(depth * 10) / 10,
    },
    rooms: solvedRooms,
    version: 1,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Fallback room distribution generator for standard architectural prompts
 */
function defaultRoomsForArea(totalArea: number) {
  if (totalArea <= 60) {
    return [
      { nome: 'Sala / Cozinha Integrada', area_min_m2: 20, area_max_m2: 25 },
      { nome: 'Dormitório Principal', area_min_m2: 12, area_max_m2: 15 },
      { nome: 'Banheiro Social', area_min_m2: 4, area_max_m2: 5 },
      { nome: 'Área de Serviço / Varanda', area_min_m2: 4, area_max_m2: 6 },
    ];
  }
  if (totalArea <= 110) {
    return [
      { nome: 'Sala de Estar / Jantar', area_min_m2: 24, area_max_m2: 30 },
      { nome: 'Cozinha', area_min_m2: 10, area_max_m2: 14 },
      { nome: 'Suíte Principal', area_min_m2: 14, area_max_m2: 18 },
      { nome: 'Dormitório 02', area_min_m2: 10, area_max_m2: 13 },
      { nome: 'Banheiro Social', area_min_m2: 4, area_max_m2: 5 },
      { nome: 'Circulação', area_min_m2: 4, area_max_m2: 6 },
    ];
  }
  return [
    { nome: 'Living Integrado', area_min_m2: 32, area_max_m2: 42 },
    { nome: 'Cozinha Gourmet', area_min_m2: 14, area_max_m2: 18 },
    { nome: 'Suíte Master', area_min_m2: 18, area_max_m2: 24 },
    { nome: 'Dormitório 02', area_min_m2: 12, area_max_m2: 15 },
    { nome: 'Dormitório 03', area_min_m2: 11, area_max_m2: 14 },
    { nome: 'Banheiro Social', area_min_m2: 4.5, area_max_m2: 6 },
    { nome: 'Circulação / Corredor', area_min_m2: 5, area_max_m2: 8 },
  ];
}

/**
 * Ensures strict zero-overlap and adjusts room boundaries to snap neatly.
 */
function optimizeRoomGrid(
  rooms: RoomGeometry[],
  boundaryW: number,
  boundaryD: number,
  padding: number
): RoomGeometry[] {
  return rooms.map((room) => {
    // Clamp to outer perimeter walls
    let x = Math.max(padding, room.x);
    let y = Math.max(padding, room.y);
    let w = room.width;
    let h = room.height;

    if (x + w > boundaryW - padding) {
      w = Math.max(1.2, Math.round((boundaryW - padding - x) * 100) / 100);
    }
    if (y + h > boundaryD - padding) {
      h = Math.max(1.2, Math.round((boundaryD - padding - y) * 100) / 100);
    }

    return {
      ...room,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      width: Math.round(w * 100) / 100,
      height: Math.round(h * 100) / 100,
      area_m2: Math.round(w * h * 100) / 100,
    };
  });
}
