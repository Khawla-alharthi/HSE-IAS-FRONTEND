import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { delay, map, catchError, tap } from 'rxjs/operators';
import { IncidentRecord, TreeNodeData, IncidentStats, Diagram } from '../models/incident.model';
import { CreateIncidentRequest, UpdateIncidentRequest } from '../dto/incident.dto';
import { ENDPOINTS } from '../api/endpoints';

interface IncidentsData {
  incidents: IncidentRecord[];
  diagrams: Diagram[];
  stats: {
    total: number;
    thisMonth: number;
    byAnalysisLevel: { [key: string]: number };
  };
}

@Injectable({
  providedIn: 'root'
})
export class IncidentRepository {
  private incidentsData: IncidentsData | null = null;
  private dataLoadedSubject = new BehaviorSubject<boolean>(false);
  private loadingPromise: Promise<void> | null = null;

  constructor(private http: HttpClient) {
    this.initializeData();
  }

  private async initializeData(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = new Promise((resolve) => {
      console.log('Initializing incidents data...');
      
      // Always use the embedded data for now to ensure it works
      try {
        this.incidentsData = this.getEmbeddedIncidentsData();
        console.log('Embedded data loaded:', this.incidentsData);
        this.dataLoadedSubject.next(true);
        resolve();
      } catch (error) {
        console.error('Error initializing embedded data:', error);
        this.initializeEmptyData();
        resolve();
      }
    });

    return this.loadingPromise;
  }

  private getEmbeddedIncidentsData(): IncidentsData {
    const rawData = {
      incidents: [
        {
          id: 1,
          userName: 'jdoe',
          title: 'Warehouse Slip Incident',
          description: 'Worker slipped on wet floor in warehouse section B',
          details: 'Worker slipped on wet floor in warehouse section B during morning shift. Occurred near loading dock area. No serious injuries reported but could have been prevented with proper safety measures.',
          analysisLevel: 'Level 3 - Moderate Analysis',
          recordedDate: '2024-01-15T10:30:00.000Z'
        },
        {
          id: 2,
          userName: 'admin',
          title: 'Control Panel Fire',
          description: 'Electrical fire started in control panel due to overloaded circuit',
          details: 'Electrical fire started in control panel due to overloaded circuit. Fire suppression system activated automatically. Production halted for 2 hours. Investigation revealed maintenance schedule gaps.',
          analysisLevel: 'Level 4 - Detailed Analysis',
          recordedDate: '2024-02-20T14:15:00.000Z'
        },
        {
          id: 3,
          userName: 'jdoe',
          title: 'Lab Chemical Spill',
          description: 'Chemical spill in laboratory during transfer process',
          details: 'Chemical spill in laboratory during transfer process. Small amount of acid spilled. Area evacuated and cleaned by hazmat team. Proper PPE prevented injuries.',
          analysisLevel: 'Level 3 - Moderate Analysis',
          recordedDate: '2024-03-05T09:22:00.000Z'
        },
        {
          id: 4,
          userName: 'admin',
          title: 'Conveyor Belt Injury',
          description: 'Machine operator caught finger in conveyor belt mechanism',
          details: 'Machine operator caught finger in conveyor belt mechanism. Operator hospitalized with minor injuries. Machine lacked proper safety guards. Emergency stop was not easily accessible.',
          analysisLevel: 'Level 5 - Comprehensive Analysis',
          recordedDate: '2024-03-22T16:45:00.000Z'
        },
        {
          id: 5,
          userName: 'admin',
          title: 'Gas Leak Detection',
          description: 'Gas leak detected in storage area ventilation system',
          details: 'Gas leak detected in storage area ventilation system. Automatic detection system triggered. Area evacuated immediately. Leak was contained within 30 minutes.',
          analysisLevel: 'Level 4 - Detailed Analysis',
          recordedDate: '2024-04-08T11:18:00.000Z'
        },
        {
          id: 6,
          userName: 'jdoe',
          title: 'Ladder Fall Incident',
          description: 'Employee fell from ladder while changing light bulb',
          details: 'Employee fell from ladder while changing light bulb. Employee sustained minor injuries. Ladder was not properly secured. Work was being performed without proper spotting.',
          analysisLevel: 'Level 4 - Detailed Analysis',
          recordedDate: '2024-07-15T13:20:00.000Z'
        },
        {
          id: 7,
          userName: 'admin',
          title: 'Forklift Near Miss',
          description: 'Near miss - forklift almost collided with pedestrian',
          details: 'Near miss - forklift almost collided with pedestrian. Pedestrian was not following designated walkway. Driver visibility was limited. Speed limits not clearly posted.',
          analysisLevel: 'Level 2 - Basic Analysis',
          recordedDate: '2024-08-10T09:30:00.000Z'
        }
      ],
      diagrams: [
        {
          id: 1,
          incidentId: 1,
          title: 'Warehouse Slip - Root Cause Analysis',
          diagramJson: JSON.stringify([
            { key: 1, name: 'Slip Incident' },
            { key: 2, parent: 1, name: 'Environmental Factors' },
            { key: 3, parent: 1, name: 'Safety Protocol Issues' },
            { key: 4, parent: 2, name: 'Wet Floor Condition' },
            { key: 5, parent: 2, name: 'Poor Lighting' },
            { key: 6, parent: 3, name: 'Missing Warning Signs' },
            { key: 7, parent: 3, name: 'Inadequate Training' }
          ]),
          createdAt: '2024-01-15T10:30:00.000Z'
        },
        {
          id: 2,
          incidentId: 2,
          title: 'Control Panel Fire - Analysis Diagram',
          diagramJson: JSON.stringify([
            { key: 1, name: 'Electrical Fire' },
            { key: 2, parent: 1, name: 'Electrical System Issues' },
            { key: 3, parent: 1, name: 'Maintenance Failures' },
            { key: 4, parent: 2, name: 'Circuit Overload' },
            { key: 5, parent: 2, name: 'Faulty Wiring' }
          ]),
          createdAt: '2024-02-20T14:15:00.000Z'
        }
      ],
      stats: {
        total: 7,
        thisMonth: 3,
        byAnalysisLevel: {
          'Level 2 - Basic Analysis': 1,
          'Level 3 - Moderate Analysis': 2,
          'Level 4 - Detailed Analysis': 3,
          'Level 5 - Comprehensive Analysis': 1
        }
      }
    };

    // Convert string dates to Date objects
    return {
      ...rawData,
      incidents: rawData.incidents.map(incident => ({
        ...incident,
        recordedDate: new Date(incident.recordedDate)
      })),
      diagrams: rawData.diagrams.map(diagram => ({
        ...diagram,
        createdAt: new Date(diagram.createdAt)
      }))
    };
  }

  private initializeEmptyData(): void {
    this.incidentsData = {
      incidents: [],
      diagrams: [],
      stats: {
        total: 0,
        thisMonth: 0,
        byAnalysisLevel: {}
      }
    };
    this.dataLoadedSubject.next(true);
  }

  private async ensureDataLoaded(): Promise<void> {
    if (!this.incidentsData) {
      await this.initializeData();
    }
  }

  generateDiagram(incident: string, level: number): Observable<TreeNodeData[]> {
    return this.fakeApiCall(incident, level);
  }

  saveIncident(userName: string, dto: CreateIncidentRequest): Observable<IncidentRecord> {
    return of(null).pipe(
      delay(500),
      map(() => {
        if (!this.incidentsData) {
          throw new Error('Incidents data not loaded');
        }

        const newRecord: IncidentRecord = {
          id: this.generateId(),
          userName,
          title: dto.title || this.generateTitle(dto.description || ''),
          description: dto.description || '',
          details: dto.details || '',
          analysisLevel: dto.analysisLevel || '',
          recordedDate: new Date()
        };

        this.incidentsData.incidents.push(newRecord);
        this.updateStats();
        console.log('Saved new incident:', newRecord);
        return newRecord;
      }),
      catchError(error => {
        console.error('Save incident error:', error);
        throw error;
      })
    );
  }

  /**
   * Create a diagram for an incident
   */
  createDiagram(incidentId: number, title: string, diagramData: TreeNodeData[]): Observable<Diagram> {
    return of(null).pipe(
      delay(300),
      map(() => {
        if (!this.incidentsData) {
          throw new Error('Incidents data not loaded');
        }

        const newDiagram: Diagram = {
          id: this.generateId(),
          incidentId,
          title,
          diagramJson: JSON.stringify(diagramData),
          createdAt: new Date()
        };

        this.incidentsData.diagrams.push(newDiagram);
        console.log('Created new diagram:', newDiagram);
        return newDiagram;
      }),
      catchError(error => {
        console.error('Create diagram error:', error);
        throw error;
      })
    );
  }

  /**
   * Update an existing incident record
   */
  updateIncident(incidentId: number, updates: UpdateIncidentRequest): Observable<IncidentRecord> {
    return of(null).pipe(
      delay(500),
      map(() => {
        if (!this.incidentsData) {
          throw new Error('Incidents data not loaded');
        }

        const index = this.incidentsData.incidents.findIndex(record => record.id === incidentId);
        if (index === -1) {
          throw new Error('Incident record not found');
        }

        // Update the incident in the data structure
        this.incidentsData.incidents[index] = {
          ...this.incidentsData.incidents[index],
          ...updates
        };

        // Update the stats
        this.updateStats();

        console.log('Updated incident:', this.incidentsData.incidents[index]);
        return this.incidentsData.incidents[index];
      }),
      catchError(error => {
        console.error('Update incident error:', error);
        throw error;
      })
    );
  }

  /**
   * Update a diagram
   */
  updateDiagram(diagramId: number, title?: string, diagramData?: TreeNodeData[]): Observable<Diagram> {
    return of(null).pipe(
      delay(300),
      map(() => {
        if (!this.incidentsData) {
          throw new Error('Incidents data not loaded');
        }

        const index = this.incidentsData.diagrams.findIndex(d => d.id === diagramId);
        if (index === -1) {
          throw new Error('Diagram not found');
        }

        const updates: Partial<Diagram> = {};
        if (title) updates.title = title;
        if (diagramData) updates.diagramJson = JSON.stringify(diagramData);

        this.incidentsData.diagrams[index] = {
          ...this.incidentsData.diagrams[index],
          ...updates
        };

        console.log('Updated diagram:', this.incidentsData.diagrams[index]);
        return this.incidentsData.diagrams[index];
      }),
      catchError(error => {
        console.error('Update diagram error:', error);
        throw error;
      })
    );
  }
  
  getHistoryForUser(userName: string): Observable<IncidentRecord[]> {
    return new Observable(observer => {
      this.ensureDataLoaded().then(() => {
        console.log('Getting history for user:', userName);
        
        if (!this.incidentsData) {
          console.log('No incidents data available');
          observer.next([]);
          observer.complete();
          return;
        }
        
        const userIncidents = this.incidentsData.incidents
          .filter(record => record.userName === userName)
          .sort((a, b) => b.recordedDate.getTime() - a.recordedDate.getTime())
          .map(incident => ({
            ...incident,
            diagrams: this.incidentsData!.diagrams.filter(d => d.incidentId === incident.id)
          }));
        
        console.log('Found incidents for user:', userIncidents);
        
        setTimeout(() => {
          observer.next(userIncidents);
          observer.complete();
        }, 300);
      }).catch(error => {
        console.error('Get user history error:', error);
        observer.next([]);
        observer.complete();
      });
    });
  }

  getAllIncidents(): Observable<IncidentRecord[]> {
    return new Observable(observer => {
      this.ensureDataLoaded().then(() => {
        console.log('Getting all incidents');
        
        if (!this.incidentsData) {
          console.log('No incidents data available');
          observer.next([]);
          observer.complete();
          return;
        }
        
        const allIncidents = this.incidentsData.incidents
          .sort((a, b) => b.recordedDate.getTime() - a.recordedDate.getTime())
          .map(incident => ({
            ...incident,
            diagrams: this.incidentsData!.diagrams.filter(d => d.incidentId === incident.id)
          }));
        
        console.log('Found all incidents:', allIncidents);
        
        setTimeout(() => {
          observer.next(allIncidents);
          observer.complete();
        }, 300);
      }).catch(error => {
        console.error('Get all incidents error:', error);
        observer.next([]);
        observer.complete();
      });
    });
  }

  getAllHistory(): Observable<IncidentRecord[]> {
    return this.getAllIncidents();
  }

  deleteIncident(incidentId: number): Observable<boolean> {
    return of(null).pipe(
      delay(300),
      map(() => {
        if (!this.incidentsData) {
          throw new Error('Incidents data not loaded');
        }

        const index = this.incidentsData.incidents.findIndex(record => record.id === incidentId);
        if (index === -1) {
          throw new Error('Incident record not found');
        }

        // Also delete associated diagrams
        this.incidentsData.diagrams = this.incidentsData.diagrams.filter(d => d.incidentId !== incidentId);

        this.incidentsData.incidents.splice(index, 1);
        this.updateStats();
        return true;
      }),
      catchError(error => {
        console.error('Delete incident error:', error);
        throw error;
      })
    );
  }

  getIncidentById(incidentId: number): Observable<IncidentRecord | null> {
    return new Observable(observer => {
      this.ensureDataLoaded().then(() => {
        if (!this.incidentsData) {
          observer.next(null);
          observer.complete();
          return;
        }
        
        const incident = this.incidentsData.incidents.find(record => record.id === incidentId);
        if (incident) {
          const incidentWithDiagrams = {
            ...incident,
            diagrams: this.incidentsData.diagrams.filter(d => d.incidentId === incident.id)
          };
          
          setTimeout(() => {
            observer.next(incidentWithDiagrams);
            observer.complete();
          }, 200);
        } else {
          observer.next(null);
          observer.complete();
        }
      }).catch(error => {
        console.error('Get incident by ID error:', error);
        observer.next(null);
        observer.complete();
      });
    });
  }

  getIncidentStats(userName?: string): Observable<IncidentStats> {
    return new Observable(observer => {
      this.ensureDataLoaded().then(() => {
        console.log('Getting incident stats for user:', userName);
        
        if (!this.incidentsData) {
          observer.next({
            total: 0,
            thisMonth: 0,
            byLevel: {},
            recentActivity: []
          });
          observer.complete();
          return;
        }

        const records = userName 
          ? this.incidentsData.incidents.filter(r => r.userName === userName)
          : this.incidentsData.incidents;

        console.log('Filtered records:', records);

        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        const thisMonthCount = records.filter(r => r.recordedDate >= thisMonth).length;
        
        // Group by analysis level instead of numeric level
        const byLevel = records.reduce((acc, record) => {
          const level = record.analysisLevel || 'Unknown';
          acc[level] = (acc[level] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number });

        const recentActivity = records
          .sort((a, b) => b.recordedDate.getTime() - a.recordedDate.getTime())
          .slice(0, 5);

        const stats = {
          total: records.length,
          thisMonth: thisMonthCount,
          byLevel,
          recentActivity
        };

        console.log('Calculated stats:', stats);

        setTimeout(() => {
          observer.next(stats);
          observer.complete();
        }, 200);
      }).catch(error => {
        console.error('Get incident stats error:', error);
        observer.next({
          total: 0,
          thisMonth: 0,
          byLevel: {},
          recentActivity: []
        });
        observer.complete();
      });
    });
  }

  getUserIncidents(userName: string): Observable<IncidentRecord[]> {
    return this.getHistoryForUser(userName);
  }

  // Search incidents
  searchIncidents(query: string, userName?: string): Observable<IncidentRecord[]> {
    return new Observable(observer => {
      this.ensureDataLoaded().then(() => {
        if (!this.incidentsData) {
          observer.next([]);
          observer.complete();
          return;
        }

        let filteredIncidents = this.incidentsData.incidents;

        // Filter by userName if provided
        if (userName) {
          filteredIncidents = filteredIncidents.filter(i => i.userName === userName);
        }

        // Search in title, description, and details
        if (query.trim()) {
          const searchTerm = query.toLowerCase();
          filteredIncidents = filteredIncidents.filter(incident =>
            incident.title?.toLowerCase().includes(searchTerm) ||
            incident.description?.toLowerCase().includes(searchTerm) ||
            incident.details?.toLowerCase().includes(searchTerm) ||
            incident.analysisLevel?.toLowerCase().includes(searchTerm)
          );
        }

        // Add diagrams to each incident
        const incidentsWithDiagrams = filteredIncidents.map(incident => ({
          ...incident,
          diagrams: this.incidentsData!.diagrams.filter(d => d.incidentId === incident.id)
        }));

        setTimeout(() => {
          observer.next(incidentsWithDiagrams);
          observer.complete();
        }, 300);
      }).catch(error => {
        console.error('Search incidents error:', error);
        observer.next([]);
        observer.complete();
      });
    });
  }

  // Simulate API call for diagram generation
  private fakeApiCall(incident: string, level: number): Observable<TreeNodeData[]> {
    const mockData = this.generateGenericData(incident, level);
    return of(mockData).pipe(delay(1500));
  }

  private generateGenericData(incident: string, level: number): TreeNodeData[] {
    const data: TreeNodeData[] = [{ key: 1, name: this.truncateIncidentName(incident) }];
    
    let keyCounter = 2;
    
    // Level 1 nodes (always create these - direct children of root)
    const level1Keys = [];
    const level1Names = ['Human Factor', 'Equipment Issue', 'Environmental Factor', 'Process Issue', 'Management Factor'];
    for (let i = 0; i < Math.min(5, level + 2); i++) {
      const node = { key: keyCounter++, parent: 1, name: level1Names[i] };
      data.push(node);
      level1Keys.push(node.key);
    }
    
    // Additional levels based on level parameter
    if (level >= 2) {
      const level2Names = ['Inadequate Training', 'Fatigue/Stress', 'Maintenance Issue', 'Design Flaw', 'Unsafe Conditions', 'Weather Impact'];
      for (let i = 0; i < Math.min(level1Keys.length * 2, 6); i++) {
        const parentKey = level1Keys[i % level1Keys.length];
        const node = { key: keyCounter++, parent: parentKey, name: level2Names[i] };
        data.push(node);
      }
    }

    return data;
  }

  private truncateIncidentName(incident: string): string {
    if (incident.length <= 30) {
      return incident;
    }
    return incident.substring(0, 27) + '...';
  }

  private updateStats(): void {
    if (!this.incidentsData) return;

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const thisMonthCount = this.incidentsData.incidents.filter(r => r.recordedDate >= thisMonth).length;
    
    const byAnalysisLevel = this.incidentsData.incidents.reduce((acc, record) => {
      const level = record.analysisLevel || 'Unknown';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    this.incidentsData.stats = {
      total: this.incidentsData.incidents.length,
      thisMonth: thisMonthCount,
      byAnalysisLevel
    };
  }

  private generateId(): number {
    if (!this.incidentsData) return 1;
    const maxId = Math.max(
      ...this.incidentsData.incidents.map(i => i.id),
      ...this.incidentsData.diagrams.map(d => d.id),
      0
    );
    return maxId + 1;
  }

  private generateTitle(description: string): string {
    if (!description) return 'Untitled Incident';
    const words = description.split(' ').slice(0, 4);
    return words.join(' ') + (description.split(' ').length > 4 ? '...' : '');
  }
}