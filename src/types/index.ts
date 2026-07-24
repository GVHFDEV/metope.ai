export interface Project {
  id: string;
  name: string;
  description?: string;
  category?: 'Residencial' | 'Comercial' | 'Corporativo' | 'Interiores' | 'Outro';
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'doc' | 'txt';
  mime_type: string;
  size: number;
  url: string; // Access-checked download URL resolved by the backend (Convex storage.getUrl)
  content_text?: string; // Extracted text for text-like documents
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action_type?: 'general' | 'summary' | 'memorial' | 'layout_analysis';
  created_at: string;
}

export type QuickActionType = 'summary' | 'memorial' | 'layout_analysis';

export interface QuickActionOption {
  id: QuickActionType;
  label: string;
  description: string;
  promptTemplate: string;
}
