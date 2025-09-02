import { Component, OnInit, OnDestroy, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AuthService } from '../../../core/services/auth.service';
import { IncidentRepository } from '../../../data-access/repositories/incident.repository';
import { User } from '../../../data-access/models/auth.model';
import { IncidentRecord } from '../../../data-access/models/incident.model';

interface DashboardStats {
  totalIncidents: number;
  recentIncidents: IncidentRecord[];
  incidentsByLevel: { [key: string]: number }; // Changed from number to string key
  mostViewedIncidents: IncidentRecord[];
  completionRate: number;
  averageLevel: number;
}

interface FilterCriteria {
  dateRange: string;
  level: string[]; // Changed from number[] to string[] to match analysisLevel
  customDateFrom?: string;
  customDateTo?: string;
}

interface DateRangeOption {
  value: string;
  label: string;
}

interface LevelOption {
  value: string; // Changed from number to string
  label: string;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingSpinnerComponent,
    FormsModule
  ],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.css']
})
export class UserDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('filterDropdown') filterDropdownRef!: ElementRef;

  currentUser = signal<User | null>(null);
  stats = signal<DashboardStats>({
    totalIncidents: 0,
    recentIncidents: [],
    incidentsByLevel: {},
    mostViewedIncidents: [],
    completionRate: 0,
    averageLevel: 0
  });

  allIncidents = signal<IncidentRecord[]>([]);
  filteredIncidents = signal<IncidentRecord[]>([]);
  activeFilters = signal<FilterCriteria>({ 
    dateRange: 'all', 
    level: [], 
    customDateFrom: '', 
    customDateTo: '' 
  });
  
  // Search and filter UI state
  searchQuery = signal<string>('');
  showFilters = signal<boolean>(false);
  showDropdownFilters = signal<boolean>(false);
  sortBy = signal<string>('date-desc');
  customDateFrom = signal<string>('');
  customDateTo = signal<string>('');
  
  // Loading states
  isLoading = signal(false);
  
  // Filter options - Updated to use string values for analysisLevel
  dateRangeOptions: DateRangeOption[] = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  levelOptions: LevelOption[] = [
    { value: 'Level 1 - Minor', label: 'Level 1 - Minor', color: '#17a2b8' },
    { value: 'Level 2 - Basic Analysis', label: 'Level 2 - Basic Analysis', color: '#17a2b8' },
    { value: 'Level 3 - Moderate Analysis', label: 'Level 3 - Moderate Analysis', color: '#f39c12' },
    { value: 'Level 4 - Detailed Analysis', label: 'Level 4 - Detailed Analysis', color: '#e74c3c' },
    { value: 'Level 5 - Comprehensive Analysis', label: 'Level 5 - Comprehensive Analysis', color: '#e74c3c' }
  ];
  
  Math = Math; 
  Object = Object;

  // Computed values
  hasIncidents = computed(() => this.filteredIncidents().length > 0);
  
  topIncidentLevel = computed(() => {
    const incidents = this.filteredIncidents();
    if (incidents.length === 0) return '';
    
    // Find the highest level by parsing the analysisLevel string
    const levels = incidents
      .map(inc => this.extractLevelNumber(inc.analysisLevel || ''))
      .filter(level => level > 0);
    
    if (levels.length === 0) return '';
    
    const maxLevel = Math.max(...levels);
    return `Level ${maxLevel}`;
  });

  constructor(
    private router: Router,
    private authService: AuthService,
    private incidentRepository: IncidentRepository
  ) {
    // Bind the method to maintain context
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
  }

  async ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.currentUser.set(user);
    await this.loadDashboardData();
    
    // Add document click listener
    document.addEventListener('click', this.handleDocumentClick);
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.handleDocumentClick);
  }

  async loadDashboardData() {
    this.isLoading.set(true);
    
    try {
      console.log('Loading dashboard data...');

      const incidentsObservable = this.incidentRepository.getAllIncidents();
      const incidents = await firstValueFrom(incidentsObservable);

      console.log('Loaded all incidents:', incidents);

      this.allIncidents.set(incidents || []);
      this.applyFilters();

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.allIncidents.set([]);
      this.filteredIncidents.set([]);
      this.updateStats([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Dropdown functionality
  toggleDropdownFilters() {
    this.showDropdownFilters.update(show => !show);
  }

  private handleDocumentClick(event: Event) {
    if (this.filterDropdownRef && !this.filterDropdownRef.nativeElement.contains(event.target)) {
      this.showDropdownFilters.set(false);
    }
  }

  // Legacy filter toggle for backward compatibility
  toggleFilters() {
    this.showFilters.update(show => !show);
  }

  // Search and Filter Methods
  applyFilters() {
    const filters = this.activeFilters();
    const search = this.searchQuery().toLowerCase().trim();
    const sort = this.sortBy();
    
    let filtered = [...this.allIncidents()];

    // Apply search filter
    if (search) {
      filtered = filtered.filter(incident => 
        (incident.title?.toLowerCase().includes(search)) ||
        (incident.description?.toLowerCase().includes(search)) ||
        (incident.details?.toLowerCase().includes(search)) ||
        (incident.analysisLevel?.toLowerCase().includes(search))
      );
    }

    // Apply date range filter - Use recordedDate instead of createdAt
    if (filters.dateRange && filters.dateRange !== 'all') {
      filtered = this.filterByDateRange(filtered, filters.dateRange);
    }

    // Apply level filter - Use analysisLevel string matching
    if (filters.level && filters.level.length > 0) {
      filtered = filtered.filter(inc => filters.level!.includes(inc.analysisLevel || ''));
    }

    // Apply sorting
    filtered = this.sortIncidents(filtered, sort);

    this.filteredIncidents.set(filtered);
    this.updateStats(filtered);
  }

  private filterByDateRange(incidents: IncidentRecord[], dateRange: string): IncidentRecord[] {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        const startOfWeek = now.getDate() - now.getDay(); // Sunday
        startDate = new Date(now.setDate(startOfWeek));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        const customFrom = this.customDateFrom();
        const customTo = this.customDateTo();
        if (customFrom) {
          startDate = new Date(customFrom);
          startDate.setHours(0, 0, 0, 0);
        }
        if (customTo) {
          endDate = new Date(customTo);
          endDate.setHours(23, 59, 59, 999);
        }
        break;
      default:
        return incidents;
    }

    return incidents.filter(inc => {
      const incidentDate = new Date(inc.recordedDate); // Use recordedDate
      return incidentDate >= startDate && incidentDate <= endDate;
    });
  }

  private sortIncidents(incidents: IncidentRecord[], sortBy: string): IncidentRecord[] {
    return incidents.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.recordedDate).getTime() - new Date(a.recordedDate).getTime(); // Use recordedDate
        case 'date-asc':
          return new Date(a.recordedDate).getTime() - new Date(b.recordedDate).getTime(); // Use recordedDate
        case 'level-desc':
          const aLevel = this.extractLevelNumber(a.analysisLevel || '');
          const bLevel = this.extractLevelNumber(b.analysisLevel || '');
          return bLevel - aLevel;
        case 'level-asc':
          const aLevelAsc = this.extractLevelNumber(a.analysisLevel || '');
          const bLevelAsc = this.extractLevelNumber(b.analysisLevel || '');
          return aLevelAsc - bLevelAsc;
        case 'title-asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'views-desc':
          // Mock view count since it's not in the data model
          const aViews = this.getMockViewCount(a);
          const bViews = this.getMockViewCount(b);
          return bViews - aViews;
        default:
          return 0;
      }
    });
  }

  // UI Event Handlers - Updated to use string levels
  handleLevelToggle(level: string) {
    this.activeFilters.update(filters => {
      const currentLevels = filters.level || [];
      const newLevels = currentLevels.includes(level)
        ? currentLevels.filter(l => l !== level)
        : [...currentLevels, level];
      
      return { ...filters, level: newLevels };
    });
    this.applyFilters();
  }

  clearAllFilters() {
    this.activeFilters.set({ dateRange: 'all', level: [] });
    this.searchQuery.set('');
    this.customDateFrom.set('');
    this.customDateTo.set('');
    this.sortBy.set('date-desc');
    this.showDropdownFilters.set(false);
    this.applyFilters();
  }

  closeDropdownAndApply() {
    this.showDropdownFilters.set(false);
    this.applyFilters();
  }

  getActiveFilterCount(): number {
    const filters = this.activeFilters();
    let count = 0;
    
    if (this.searchQuery()) count++;
    if (filters.dateRange && filters.dateRange !== 'all') count++;
    if (filters.level && filters.level.length > 0) count++;
    
    return count;
  }

  // Handle custom date changes
  onCustomDateFromChange() {
    this.activeFilters.update(filters => ({
      ...filters,
      customDateFrom: this.customDateFrom()
    }));
    this.applyFilters();
  }

  onCustomDateToChange() {
    this.activeFilters.update(filters => ({
      ...filters,
      customDateTo: this.customDateTo()
    }));
    this.applyFilters();
  }

  onDateRangeChange() {
    this.applyFilters();
  }

  onSortChange() {
    this.applyFilters();
  }

  private updateStats(incidents: IncidentRecord[]) {
    // Group by analysisLevel instead of numeric level
    const incidentsByLevel = incidents.reduce((acc, inc) => {
      const level = inc.analysisLevel || 'Unknown';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    // Get most viewed incidents (mock viewCount)
    const mostViewedIncidents = incidents
      .map(inc => ({ ...inc, viewCount: this.getMockViewCount(inc) }))
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5);

    // Calculate completion rate based on whether incidents have diagrams
    const completedIncidents = incidents.filter(inc => 
      inc.diagrams && inc.diagrams.length > 0
    );
    const completionRate = incidents.length > 0 
      ? Math.round((completedIncidents.length / incidents.length) * 100)
      : 0;

    // Calculate average level from analysisLevel strings
    const levels = incidents
      .map(inc => this.extractLevelNumber(inc.analysisLevel || ''))
      .filter(level => level > 0);
    
    const averageLevel = levels.length > 0
      ? Math.round((levels.reduce((sum, level) => sum + level, 0) / levels.length) * 10) / 10
      : 0;

    // Get recent incidents (last 5) - Use recordedDate
    const recentIncidents = incidents
      .sort((a, b) => new Date(b.recordedDate).getTime() - new Date(a.recordedDate).getTime())
      .slice(0, 5);

    this.stats.set({
      totalIncidents: incidents.length,
      recentIncidents,
      incidentsByLevel,
      mostViewedIncidents,
      completionRate,
      averageLevel
    });
  }

  // Navigation methods
  navigateToCreateIncident() {
    this.router.navigate(['/main']);
  }

  navigateToIncidentHistory() {
    this.router.navigate(['/history']);
  }

  navigateToProfile() {
    this.router.navigate(['/profile']);
  }

  viewIncident(incident: IncidentRecord) {
    this.router.navigate(['/incidents/view', incident.id]);
  }

  editIncident(incident: IncidentRecord) {
    this.router.navigate(['/incidents/edit', incident.id]);
  }

  // Utility methods - Updated for analysisLevel
  getIncidentLevelBadgeClass(level: string): string {
    const levelNum = this.extractLevelNumber(level);
    switch (levelNum) {
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

  getIncidentLevelColor(level: string): string {
    const levelNum = this.extractLevelNumber(level);
    switch (levelNum) {
      case 1:
      case 2:
        return '#17a2b8';
      case 3:
        return '#f39c12';
      case 4:
      case 5:
        return '#e74c3c';
      default:
        return '#6c757d';
    }
  }

  // Extract numeric level from analysisLevel string
  private extractLevelNumber(analysisLevel: string): number {
    if (!analysisLevel) return 0;
    const match = analysisLevel.match(/Level (\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  // Utility method for template to extract numeric level
  extractLevelNumberForTemplate(analysisLevel: string): number {
    return this.extractLevelNumber(analysisLevel);
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

  // Additional utility methods for the template
  getDateRangeLabel(): string {
    const dateRange = this.activeFilters().dateRange;
    const option = this.dateRangeOptions.find(opt => opt.value === dateRange);
    return option ? option.label : 'All Time';
  }

  highlightSearchTerm(text: string): string {
    const search = this.searchQuery().trim();
    if (!search || !text) return text;
    
    const regex = new RegExp(`(${search})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  // TrackBy functions for performance
  trackIncidentById(index: number, incident: IncidentRecord): string {
    return incident.id.toString();
  }

  // Mock view count method since viewCount is not in IncidentRecord model
  getMockViewCount(incident: IncidentRecord): number {
    // Generate consistent mock view count based on incident ID
    const hash = incident.id.toString().split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return Math.abs(hash % 15) + 1;
  }

  // Method to handle date range changes
  onDateRangeChangeHandler(event: string): void {
    this.activeFilters.update(current => ({
      ...current,
      dateRange: event
    }));
    this.onDateRangeChange();
  }

  // Method to clear date filter
  clearDateFilter(): void {
    this.activeFilters.update(current => ({
      ...current,
      dateRange: 'all'
    }));
    this.applyFilters();
  }
}