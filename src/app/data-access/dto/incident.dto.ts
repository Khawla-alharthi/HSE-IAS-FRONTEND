export interface CreateIncidentRequest {
  userName: string;
  title: string;
  description?: string;
  details?: string;
  analysisLevel?: string;
}

export interface CreateIncidentDto {
  userName: string;
  title: string;
  description?: string;
  details?: string;
  analysisLevel?: string;
}

export interface UpdateIncidentRequest {
  title?: string;
  description?: string;
  details?: string;
  analysisLevel?: string;
}

export interface CreateDiagramRequest {
  incidentId: number;
  title: string;
  diagramJson: string; 
}

export interface UpdateDiagramRequest {
  title?: string;
  diagramJson?: string;
}