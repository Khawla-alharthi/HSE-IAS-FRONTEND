import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { IncidentViewModalComponent } from './components/view.component/incident-view-modal';
import { IncidentEditModalComponent } from './components/edit.component/incident-edit-modal';
import { AuthService } from '../../../core/services/auth.service';
import { IncidentRepository } from '../../../data-access/repositories/incident.repository';
import { User } from '../../../data-access/models/auth.model';
import { IncidentRecord } from '../../../data-access/models/incident.model';

interface FilterOptions {
  search: string;
  level: string;
  dateFrom: string;
  dateTo: string;
  sortBy: 'date' | 'level' | 'title';
  sortOrder: 'asc' | 'desc';
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    LoadingSpinnerComponent,
    IncidentViewModalComponent,
    IncidentEditModalComponent
  ],
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.css']
})
export class HistoryComponent implements OnInit {
  currentUser = signal<User | null>(null);
  allIncidents = signal<IncidentRecord[]>([]);
  isLoading = signal(false);
  
  // Modal states
  selectedIncidentForView = signal<IncidentRecord | null>(null);
  selectedIncidentForEdit = signal<IncidentRecord | null>(null);
  
  // Filters
  filters = signal<FilterOptions>({
    search: '',
    level: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Pagination
  currentPage = signal(1);
  itemsPerPage = signal(10);

  // Computed filtered and paginated incidents
  filteredIncidents = computed(() => {
    let incidents = this.allIncidents();
    const filterOptions = this.filters();

    // Apply search filter
    if (filterOptions.search) {
      const searchTerm = filterOptions.search.toLowerCase();
      incidents = incidents.filter(inc => 
        (inc.title && inc.title.toLowerCase().includes(searchTerm)) ||
        (inc.description && inc.description.toLowerCase().includes(searchTerm)) ||
        (inc.details && inc.details.toLowerCase().includes(searchTerm))
      );
    }

    // Apply level filter
    if (filterOptions.level) {
      incidents = incidents.filter(inc => {
        const level = this.extractLevelFromAnalysisLevel(inc.analysisLevel || '');
        return level.toString() === filterOptions.level;
      });
    }

    // Apply date filters
    if (filterOptions.dateFrom) {
      const fromDate = new Date(filterOptions.dateFrom);
      incidents = incidents.filter(inc => new Date(inc.recordedDate) >= fromDate);
    }

    if (filterOptions.dateTo) {
      const toDate = new Date(filterOptions.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      incidents = incidents.filter(inc => new Date(inc.recordedDate) <= toDate);
    }

    // Apply sorting
    incidents.sort((a, b) => {
      let comparison = 0;
      
      switch (filterOptions.sortBy) {
        case 'date':
          comparison = new Date(a.recordedDate).getTime() - new Date(b.recordedDate).getTime();
          break;
        case 'level':
          const aLevel = this.extractLevelFromAnalysisLevel(a.analysisLevel || '');
          const bLevel = this.extractLevelFromAnalysisLevel(b.analysisLevel || '');
          comparison = aLevel - bLevel;
          break;
        case 'title':
          const aTitle = a.title || a.description?.substring(0, 50) || '';
          const bTitle = b.title || b.description?.substring(0, 50) || '';
          comparison = aTitle.localeCompare(bTitle);
          break;
      }

      return filterOptions.sortOrder === 'desc' ? -comparison : comparison;
    });

    return incidents;
  });

  paginatedIncidents = computed(() => {
    const incidents = this.filteredIncidents();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return incidents.slice(start, end);
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredIncidents().length / this.itemsPerPage());
  });

  constructor(
    private router: Router,
    private authService: AuthService,
    private incidentRepository: IncidentRepository
  ) {}

  async ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.currentUser.set(user);
    await this.loadIncidents();
  }

  async loadIncidents() {
    this.isLoading.set(true);
    
    try {
      const user = this.currentUser();
      if (!user) return;

      const incidents = await firstValueFrom(
        this.incidentRepository.getHistoryForUser(user.userName)
      );
      
      this.allIncidents.set(incidents);
    } catch (error) {
      console.error('Error loading incidents:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Extract numeric level from analysisLevel string
  private extractLevelFromAnalysisLevel(analysisLevel: string): number {
    const match = analysisLevel.match(/Level (\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  }

  // Modal methods
  viewIncident(incident: IncidentRecord) {
    this.selectedIncidentForView.set(incident);
  }

  editIncident(incident: IncidentRecord) {
    this.selectedIncidentForEdit.set(incident);
  }

  closeViewModal() {
    this.selectedIncidentForView.set(null);
  }

  closeEditModal() {
    this.selectedIncidentForEdit.set(null);
  }

  onEditFromView(incident: IncidentRecord) {
    this.selectedIncidentForView.set(null);
    this.selectedIncidentForEdit.set(incident);
  }

  async saveIncident(updatedIncident: Partial<IncidentRecord>) {
    try {
      if (!updatedIncident.id) return;

      // Update the incident in the repository
      await firstValueFrom(
        this.incidentRepository.updateIncident(updatedIncident.id, updatedIncident)
      );

      // Update the local state
      this.allIncidents.update(incidents => 
        incidents.map(inc => 
          inc.id === updatedIncident.id 
            ? { ...inc, ...updatedIncident } as IncidentRecord
            : inc
        )
      );

      console.log('Incident updated successfully');
    } catch (error) {
      console.error('Error updating incident:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  }

  // Filter methods
  updateSearch(search: string) {
    this.filters.update(f => ({ ...f, search }));
    this.currentPage.set(1);
  }

  updateLevel(level: string) {
    this.filters.update(f => ({ ...f, level }));
    this.currentPage.set(1);
  }

  updateDateFrom(dateFrom: string) {
    this.filters.update(f => ({ ...f, dateFrom }));
    this.currentPage.set(1);
  }

  updateDateTo(dateTo: string) {
    this.filters.update(f => ({ ...f, dateTo }));
    this.currentPage.set(1);
  }

  updateSort(sortBy: 'date' | 'level' | 'title') {
    this.filters.update(f => {
      if (f.sortBy === sortBy) {
        return { ...f, sortOrder: f.sortOrder === 'asc' ? 'desc' : 'asc' };
      }
      return { ...f, sortBy, sortOrder: 'desc' };
    });
  }

  clearFilters() {
    this.filters.set({
      search: '',
      level: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'date',
      sortOrder: 'desc'
    });
    this.currentPage.set(1);
  }

  // Pagination methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  // Navigation methods
  navigateToCreateIncident() {
    this.router.navigate(['/main']);
  }

  // Utility methods
  getIncidentLevelBadgeClass(level: number): string {
    switch (level) {
      case 1:
      case 2:
        return 'badge-info';
      case 3:
        return 'badge-warning';
      case 4:
      case 5:
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  getIncidentLevel(incident: IncidentRecord): number {
    return this.extractLevelFromAnalysisLevel(incident.analysisLevel || '');
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  formatDateShort(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return d.toLocaleDateString();
    }
  }

  getIncidentTitle(incident: IncidentRecord): string {
    return incident.title || 'Untitled Report';
  }

  getIncidentDescription(incident: IncidentRecord): string {
    const description = incident.description || incident.details || '';
    return description.length > 150 ? description.substring(0, 150) + '...' : description;
  }

  hasAnalysisComplete(incident: IncidentRecord): boolean {
    return !!(incident.diagrams && incident.diagrams.length > 0);
  }

  trackIncidentById(index: number, incident: IncidentRecord): string {
    return incident.id.toString();
  }
}