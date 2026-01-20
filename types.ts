
export interface FileNode {
  path: string;
  name: string;
  content: string;
  extension: string;
  size: number;
}

export interface ConceptBundle {
  id: string;
  name: string;
  description: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ProcessingStats {
  totalFiles: number;
  totalLines: number;
  totalSize: number;
  fileTypes: Record<string, number>;
}

export enum AppStatus {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  PROCESSING_AI = 'PROCESSING_AI',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface GeneratedOutputs {
  flattened: string;
  summary: string;
  aiContext: string;
  concepts: ConceptBundle[];
  recreatedContext?: string;
}

export interface Project {
  id: string;
  name: string;
  status: AppStatus;
  stats: ProcessingStats | null;
  outputs: GeneratedOutputs;
  knowledgeBridgeEnabled: boolean;
  createdAt: number;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
