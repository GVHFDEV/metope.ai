export interface Project {
  id: string;
  name: string;
  description?: string;
  category?: 'Residencial' | 'Comercial' | 'Corporativo' | 'Interiores' | 'Outro';
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  project_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'doc' | 'txt' | 'floorplan';
  mime_type: string;
  size: number;
  url: string; // Signed Supabase Storage URL, short-lived (1h)
  content_text?: string; // Extracted text or JSON string for floorplans
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id?: string;
  project_id?: string;
  role: 'user' | 'assistant';
  content: string;
  action_type?: 'general' | 'summary' | 'memorial' | 'layout_analysis' | 'generate_floorplan';
  created_at: string;
}

export type QuickActionType = 'summary' | 'memorial' | 'layout_analysis' | 'generate_floorplan';

export interface QuickActionOption {
  id: QuickActionType;
  label: string;
  description: string;
  promptTemplate: string;
}

export interface RoomGeometry {
  id: string;
  name: string;
  x: number; // in meters from top-left origin
  y: number; // in meters from top-left origin
  width: number; // in meters
  height: number; // in meters
  area_m2: number;
}

export interface FloorPlanData {
  id: string;
  title: string;
  total_area_m2: number;
  boundary: {
    width: number; // in meters
    depth: number; // in meters
  };
  rooms: RoomGeometry[];
  version: number;
  updated_at: string;
}

export interface FloorPlanIntentJSON {
  area_total_m2: number;
  comodos: {
    nome: string;
    area_min_m2: number;
    area_max_m2: number;
    aspect_ratio?: number;
  }[];
  adjacencias?: [string, string][];
  restricoes_terreno?: {
    largura_m: number;
    profundidade_m: number;
  };
}

export interface IDETab {
  id: string;
  title: string;
  type: 'chat' | 'floorplan';
  fileId?: string;
  floorPlanData?: FloorPlanData;
}
