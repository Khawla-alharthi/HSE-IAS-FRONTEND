import { User } from "./auth.model";

export interface TreeNodeData {
  key: number;
  name: string;
  parent?: number;
  level?: number;
  category?: string;
  color?: string;
  description?: string;
  children?: TreeNodeData[];
}

export interface Diagram {
  id: number;
  incidentId: number;
  title: string;
  diagramJson: string; 
  diagramPdf?: Uint8Array; 
  createdAt: Date;
}

export interface IncidentRecord {
  id: number; 
  userName: string; 
  title: string; 
  description?: string; 
  details?: string; 
  analysisLevel?: string; 
  recordedDate: Date; 
  diagrams?: Diagram[]; 
  user?: User; 
}

export interface IncidentStats {
  total: number;
  thisMonth: number;
  byLevel: { [key: string]: number }; 
  recentActivity: IncidentRecord[];
}

export interface AnalysisOptions {
  incident: string;
  level: number;
}

export interface DiagramExportOptions {
  format: 'svg' | 'pdf' | 'png';
  title?: string;
  includeMetadata?: boolean;
}


