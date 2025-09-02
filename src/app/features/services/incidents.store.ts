import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { IncidentRecord, TreeNodeData, Diagram } from '../../data-access/models/incident.model';
import { CreateIncidentRequest, UpdateIncidentRequest, CreateDiagramRequest } from '../../data-access/dto/incident.dto';

export interface IncidentSaveData {
  incident: string;
  level: number;
  title?: string;
  notes?: string;
}

export interface IncidentsState {
  incidents: IncidentRecord[];
  loading: boolean;
  error: string | null;
  selectedIncident: IncidentRecord | null;
}

@Injectable({
  providedIn: 'root'
})
export class IncidentsStore {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/incidents`;

  // State management
  private state$ = new BehaviorSubject<IncidentsState>({
    incidents: [],
    loading: false,
    error: null,
    selectedIncident: null
  });

  // Public observables
  public readonly incidents$ = this.state$.pipe(map(state => state.incidents));
  public readonly loading$ = this.state$.pipe(map(state => state.loading));
  public readonly error$ = this.state$.pipe(map(state => state.error));
  public readonly selectedIncident$ = this.state$.pipe(map(state => state.selectedIncident));

  // Getters for current state
  get currentState(): IncidentsState {
    return this.state$.value;
  }

  get incidents(): IncidentRecord[] {
    return this.currentState.incidents;
  }

  /**
   * Load all incidents for a specific user
   */
  getUserIncidents(userName: string): Observable<IncidentRecord[]> {
    this.updateState({ loading: true, error: null });

    return this.http.get<IncidentRecord[]>(`${this.baseUrl}/user/${userName}`).pipe(
      tap(incidents => {
        this.updateState({ 
          incidents: incidents.sort((a, b) => 
            new Date(b.recordedDate).getTime() - new Date(a.recordedDate).getTime()
          ),
          loading: false,
          error: null 
        });
      }),
      catchError(error => {
        this.updateState({ 
          loading: false, 
          error: this.getErrorMessage(error),
          incidents: []
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Get a specific incident by ID
   */
  getIncidentById(incidentId: number): Observable<IncidentRecord | null> {
    this.updateState({ loading: true, error: null });

    return this.http.get<IncidentRecord>(`${this.baseUrl}/${incidentId}`).pipe(
      tap(incident => {
        this.updateState({ 
          selectedIncident: incident,
          loading: false,
          error: null 
        });
      }),
      catchError(error => {
        this.updateState({ 
          loading: false, 
          error: this.getErrorMessage(error),
          selectedIncident: null
        });
        
        if (error.status === 404) {
          return of(null);
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Generate diagram data from incident description
   */
  generateDiagram(incident: string, level: number): Observable<TreeNodeData[]> {
    this.updateState({ loading: true, error: null });

    const payload = {
      incident: incident.trim(),
      level: Math.max(1, Math.min(5, level)) // Ensure level is between 1-5
    };

    return this.http.post<{ diagramData: TreeNodeData[] }>(`${this.baseUrl}/generate-diagram`, payload).pipe(
      map(response => response.diagramData || []),
      tap(() => {
        this.updateState({ loading: false, error: null });
      }),
      catchError(error => {
        this.updateState({ 
          loading: false, 
          error: this.getErrorMessage(error)
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Save a new incident analysis
   */
  saveIncident(userName: string, incidentData: CreateIncidentRequest, diagramData?: TreeNodeData[]): Observable<IncidentRecord> {
    this.updateState({ loading: true, error: null });

    const payload = {
      userName,
      title: incidentData.title?.trim() || '',
      description: incidentData.description?.trim() || '',
      details: incidentData.details?.trim() || '',
      analysisLevel: incidentData.analysisLevel?.trim() || ''
    };

    return this.http.post<IncidentRecord>(this.baseUrl, payload).pipe(
      switchMap(savedIncident => {
        // If we have diagram data, create the diagram
        if (diagramData && diagramData.length > 0) {
          const diagramRequest: CreateDiagramRequest = {
            incidentId: savedIncident.id,
            title: `${savedIncident.title} - Analysis Diagram`,
            diagramJson: JSON.stringify(diagramData)
          };
          
          return this.createDiagram(diagramRequest).pipe(
            map(diagram => ({
              ...savedIncident,
              diagrams: [diagram]
            }))
          );
        }
        return of(savedIncident);
      }),
      tap(savedIncident => {
        const currentIncidents = this.currentState.incidents;
        const updatedIncidents = [savedIncident, ...currentIncidents];
        
        this.updateState({ 
          incidents: updatedIncidents,
          selectedIncident: savedIncident,
          loading: false,
          error: null 
        });
      }),
      catchError(error => {
        this.updateState({ 
          loading: false, 
          error: this.getErrorMessage(error)
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Update an existing incident
   */
  updateIncident(incidentId: number, incidentData: UpdateIncidentRequest): Observable<IncidentRecord> {
    this.updateState({ loading: true, error: null });

    const payload = {
      title: incidentData.title?.trim(),
      description: incidentData.description?.trim(),
      details: incidentData.details?.trim(),
      analysisLevel: incidentData.analysisLevel?.trim()
    };

    // Remove undefined values
    Object.keys(payload).forEach(key => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload];
      }
    });

    return this.http.put<IncidentRecord>(`${this.baseUrl}/${incidentId}`, payload).pipe(
      tap(updatedIncident => {
        const currentIncidents = this.currentState.incidents;
        const updatedIncidents = currentIncidents.map(incident => 
          incident.id === incidentId ? updatedIncident : incident
        );
        
        this.updateState({ 
          incidents: updatedIncidents,
          selectedIncident: updatedIncident,
          loading: false,
          error: null 
        });
      }),
      catchError(error => {
        this.updateState({ 
          loading: false, 
          error: this.getErrorMessage(error)
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Create a diagram for an incident
   */
  createDiagram(diagramData: CreateDiagramRequest): Observable<Diagram> {
    return this.http.post<Diagram>(`${this.baseUrl}/${diagramData.incidentId}/diagrams`, diagramData).pipe(
      catchError(error => {
        console.error('Create diagram error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update a diagram
   */
  updateDiagram(diagramId: number, diagramData: { title?: string; diagramJson?: string }): Observable<Diagram> {
    return this.http.put<Diagram>(`${this.baseUrl}/diagrams/${diagramId}`, diagramData).pipe(
      catchError(error => {
        console.error('Update diagram error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete an incident
   */
  deleteIncident(incidentId: number): Observable<void> {
    this.updateState({ loading: true, error: null });

    return this.http.delete<void>(`${this.baseUrl}/${incidentId}`).pipe(
      tap(() => {
        const currentIncidents = this.currentState.incidents;
        const updatedIncidents = currentIncidents.filter(incident => incident.id !== incidentId);
        
        // Clear selected incident if it was the deleted one
        const selectedIncident = this.currentState.selectedIncident?.id === incidentId 
          ? null 
          : this.currentState.selectedIncident;
        
        this.updateState({ 
          incidents: updatedIncidents,
          selectedIncident,
          loading: false,
          error: null 
        });
      }),
      catchError(error => {
        this.updateState({ 
          loading: false, 
          error: this.getErrorMessage(error)
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Search incidents by text
   */
  searchIncidents(query: string, userName?: string): Observable<IncidentRecord[]> {
    const params = new URLSearchParams();
    params.append('q', query.trim());
    if (userName) {
      params.append('userName', userName);
    }

    return this.http.get<IncidentRecord[]>(`${this.baseUrl}/search?${params.toString()}`).pipe(
      catchError(error => {
        console.error('Search error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get incident statistics for a user
   */
  getUserStats(userName: string): Observable<{
    total: number;
    byAnalysisLevel: { [level: string]: number };
    recentCount: number;
    avgDiagrams: number;
  }> {
    return this.http.get<any>(`${this.baseUrl}/stats/${userName}`).pipe(
      catchError(error => {
        console.error('Stats error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Export incident data
   */
  exportIncident(incidentId: number, format: 'json' | 'pdf' | 'png' = 'json'): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${incidentId}/export`, {
      params: { format },
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Export error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Clear all state
   */
  clearState(): void {
    this.updateState({
      incidents: [],
      loading: false,
      error: null,
      selectedIncident: null
    });
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.updateState({ error: null });
  }

  /**
   * Set selected incident
   */
  setSelectedIncident(incident: IncidentRecord | null): void {
    this.updateState({ selectedIncident: incident });
  }

  /**
   * Refresh incidents for current user
   */
  refreshIncidents(userName: string): Observable<IncidentRecord[]> {
    return this.getUserIncidents(userName);
  }

  // Private helper methods
  private updateState(partial: Partial<IncidentsState>): void {
    this.state$.next({
      ...this.currentState,
      ...partial
    });
  }

  private getErrorMessage(error: any): string {
    if (error.error?.message) {
      return error.error.message;
    }
    
    switch (error.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'You are not authorized to perform this action.';
      case 403:
        return 'Access denied.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'A conflict occurred. The resource may already exist.';
      case 422:
        return 'Validation failed. Please check your input.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  private getIncidentFromCache(incidentId: number): IncidentRecord | null {
    return this.currentState.incidents.find(incident => incident.id === incidentId) || null;
  }
}