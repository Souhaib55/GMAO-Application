// Chat Models
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: ChatMetadata;
  visualizations?: Visualization[];
  suggestions?: string[];
  showSql?: boolean; // UI state for toggling SQL visibility
}

export interface ChatMetadata {
  sqlQuery?: string;
  sqlResult?: any[];
  context?: string;
}

export interface Visualization {
  type: string;
  data: string; // base64 encoded
}

export interface ChatQueryDto {
  query: string;
}

export interface ChatResponse {
  response: string;
  metadata?: ChatMetadata;
  visualizations?: Visualization[];
  suggestions?: string[];
}
