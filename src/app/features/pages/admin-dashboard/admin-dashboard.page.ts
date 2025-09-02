import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

import { AuthService } from '../../../core/services/auth.service';
import { IncidentsStore } from '../../services/incidents.store';
import { AuthRepository } from '../../../data-access/repositories/auth.repository';
import { IncidentRepository } from '../../../data-access/repositories/incident.repository';

import { User, UserData, RegisterData } from '../../../data-access/models/auth.model';
import { IncidentRecord, IncidentStats } from '../../../data-access/models/incident.model';

type AdminSection = 'overview' | 'incidents' | 'users';

interface DashboardStats {
  totalIncidents: number;
  totalUsers: number;
  thisMonthIncidents: number;
  recentActivity: IncidentRecord[];
  incidentsByLevel: { [key: string]: number };
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.css']
})
export class AdminDashboardComponent implements OnInit {
  currentSection = signal<AdminSection>('overview');
  
  // Expose Object for template use
  Object = Object;
  
  // Data signals
  users = signal<User[]>([]);
  incidents = signal<IncidentRecord[]>([]);
  stats = signal<DashboardStats>({
    totalIncidents: 0,
    totalUsers: 0,
    thisMonthIncidents: 0,
    recentActivity: [],
    incidentsByLevel: {}
  });
  
  // Loading states
  isLoading = signal(false);
  isLoadingUsers = signal(false);
  isLoadingIncidents = signal(false);
  isDeletingUser = signal<string | null>(null);
  isDeletingIncident = signal<string | null>(null);
  
  // Search and filter
  userSearchTerm = signal('');
  incidentSearchTerm = signal('');
  selectedAnalysisLevel = signal<string | null>(null);
  
  // Modal states
  showUserModal = signal(false);
  showDeleteConfirm = signal(false);
  deleteTarget = signal<{ type: 'user' | 'incident', id: string, name: string } | null>(null);
  
  // Forms
  userForm: FormGroup;
  editingUserId = signal<string | null>(null);

  // Computed values
  filteredUsers = computed(() => {
    const searchTerm = this.userSearchTerm().toLowerCase();
    return this.users().filter(user => {
      const userData = user.userData;
      if (!userData) return false;
      
      return userData.firstName.toLowerCase().includes(searchTerm) ||
             userData.lastName.toLowerCase().includes(searchTerm) ||
             userData.emailAddress.toLowerCase().includes(searchTerm) ||
             user.userName.toLowerCase().includes(searchTerm);
    });
  });

  filteredIncidents = computed(() => {
    const searchTerm = this.incidentSearchTerm().toLowerCase();
    const levelFilter = this.selectedAnalysisLevel();
    
    return this.incidents().filter(incident => {
      const matchesSearch = incident.description?.toLowerCase().includes(searchTerm) ||
                           incident.title?.toLowerCase().includes(searchTerm) ||
                           incident.details?.toLowerCase().includes(searchTerm);
      const matchesLevel = levelFilter === null || incident.analysisLevel === levelFilter;
      
      return matchesSearch && matchesLevel;
    });
  });

  // Get unique analysis levels for filter dropdown
  availableAnalysisLevels = computed(() => {
    const levels = new Set<string>();
    this.incidents().forEach(incident => {
      if (incident.analysisLevel) {
        levels.add(incident.analysisLevel);
      }
    });
    return Array.from(levels).sort();
  });

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private incidentsStore: IncidentsStore,
    private authRepository: AuthRepository,
    private incidentRepository: IncidentRepository
  ) {
    this.userForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['3', [Validators.required]] // Default to User role (roleId 3)
    });
  }

  async ngOnInit() {
    // Check if current user is admin
    const currentUser = this.authService.currentUserValue;
    if (!currentUser || !this.authService.isAdmin()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    await this.loadDashboardData();
  }

  async loadDashboardData() {
    this.isLoading.set(true);
    
    try {
      await Promise.all([
        this.loadUsers(),
        this.loadIncidents()
      ]);
      
      await this.loadStats();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadUsers() {
    this.isLoadingUsers.set(true);
    try {
      const users = await firstValueFrom(this.authRepository.getAllUsers());
      this.users.set(users);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      this.isLoadingUsers.set(false);
    }
  }

  async loadIncidents() {
    this.isLoadingIncidents.set(true);
    try {
      const incidents = await firstValueFrom(this.incidentRepository.getAllHistory());
      this.incidents.set(incidents);
    } catch (error) {
      console.error('Error loading incidents:', error);
    } finally {
      this.isLoadingIncidents.set(false);
    }
  }

  async loadStats() {
    try {
      const incidentStats = await firstValueFrom(this.incidentRepository.getIncidentStats());
      const users = this.users();
      
      this.stats.set({
        totalIncidents: incidentStats.total,
        totalUsers: users.length,
        thisMonthIncidents: incidentStats.thisMonth,
        recentActivity: incidentStats.recentActivity,
        incidentsByLevel: incidentStats.byLevel
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  // Section navigation
  setActiveSection(section: AdminSection) {
    this.currentSection.set(section);
    
    // Load data when switching to sections
    if (section === 'users' && this.users().length === 0) {
      this.loadUsers();
    } else if (section === 'incidents' && this.incidents().length === 0) {
      this.loadIncidents();
    }
  }

  // User management
  openUserModal(user?: User) {
    if (user && user.userData) {
      this.editingUserId.set(user.id.toString());
      this.userForm.patchValue({
        firstName: user.userData.firstName,
        lastName: user.userData.lastName,
        email: user.userData.emailAddress,
        role: user.roleId.toString()
      });
    } else {
      this.editingUserId.set(null);
      this.userForm.reset({
        firstName: '',
        lastName: '',
        email: '',
        role: '3' // Default to User role
      });
    }
    this.showUserModal.set(true);
  }

  closeUserModal() {
    this.showUserModal.set(false);
    this.editingUserId.set(null);
    this.userForm.reset();
  }

  async saveUser() {
  if (this.userForm.invalid) {
    this.markFormGroupTouched(this.userForm);
    return;
  }

  const formValue = this.userForm.value;
  const userId = this.editingUserId();

  try {
    if (userId) {
      // Update existing user
      const currentUser = this.users().find(u => u.id.toString() === userId);
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Create updated user data
      const updatedUserData: UserData = {
        ...currentUser.userData!,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        emailAddress: formValue.email,
        displayName: `${formValue.firstName} ${formValue.lastName}`
      };

      // Call updateProfile with the correct parameters
      const updatedUser = await firstValueFrom(
        this.authRepository.updateProfile(parseInt(userId), {
          roleId: parseInt(formValue.role),
          userData: updatedUserData
        })
      );
      
      // Update users list
      const currentUsers = this.users();
      const updatedUsers = currentUsers.map(user => 
        user.id.toString() === userId ? updatedUser : user
      );
      this.users.set(updatedUsers);
    } else {
      // Create new user using the register method
      const newUserData: RegisterData = {
        userName: formValue.email, // Use email as username for new users
        password: 'tempPassword123', // In real app, this should be generated or set by admin
        roleId: parseInt(formValue.role),
        active: 1, // Active by default
        userData: {
          personnelNumber: `EMP${Date.now()}`, // Generate unique personnel number
          companyNumber: formValue.email,
          firstName: formValue.firstName,
          lastName: formValue.lastName,
          displayName: `${formValue.firstName} ${formValue.lastName}`,
          officePhone: '',
          officeBuilding: '',
          officeRoom: '',
          jobDescription: '',
          referenceInstructor: '',
          emailAddress: formValue.email,
          supervisorId: '',
          superSupervisorId: '',
          locationCode: '',
          locationDescription: '',
          isActive: 'Y',
          activeStatus: 'Active',
          accountType: 'Employee',
          departmentLead: '',
          department: '',
          departmentOuId: undefined,
          director: '',
          directorate: '',
          directorateOuId: undefined,
          sectionLead: '',
          section: '',
          sectionOuId: undefined,
          teamLead: '',
          team: '',
          teamOuId: undefined,
          lastDownloadDate: new Date()
        }
      };

      const newUser = await firstValueFrom(
        this.authRepository.register(newUserData)
      );

      // Add to users list
      const currentUsers = this.users();
      this.users.set([...currentUsers, newUser]);
    }
    
    this.closeUserModal();
    
    // Show success message (you might want to add a toast service)
    console.log(`User ${userId ? 'updated' : 'created'} successfully`);
    
  } catch (error) {
    console.error('Error saving user:', error);
    // In a real app, you'd show an error message to the user
    // You might want to add a toast/notification service for this
  }
}

  confirmDeleteUser(user: User) {
    const displayName = user.userData 
      ? `${user.userData.firstName} ${user.userData.lastName}` 
      : user.userName;
      
    this.deleteTarget.set({
      type: 'user',
      id: user.id.toString(),
      name: displayName
    });
    this.showDeleteConfirm.set(true);
  }

  confirmDeleteIncident(incident: IncidentRecord) {
    this.deleteTarget.set({
      type: 'incident',
      id: incident.id.toString(),
      name: incident.title || incident.description?.substring(0, 50) + '...' || 'Untitled Incident'
    });
    this.showDeleteConfirm.set(true);
  }

  async executeDelete() {
    const target = this.deleteTarget();
    if (!target) return;

    try {
      if (target.type === 'user') {
        this.isDeletingUser.set(target.id);
        // In real app, you'd call a deleteUser endpoint
        console.log('Delete user:', target.id);
        await this.loadUsers(); // Reload for now
      } else {
        this.isDeletingIncident.set(target.id);
        await firstValueFrom(this.incidentRepository.deleteIncident(parseInt(target.id)));
        await this.loadIncidents();
      }
      
      this.closeDeleteConfirm();
    } catch (error) {
      console.error('Error deleting:', error);
    } finally {
      this.isDeletingUser.set(null);
      this.isDeletingIncident.set(null);
    }
  }

  closeDeleteConfirm() {
    this.showDeleteConfirm.set(false);
    this.deleteTarget.set(null);
  }

  // Incident management
  editIncident(incident: IncidentRecord) {
    this.router.navigate(['/incidents/edit', incident.id]);
  }

  viewIncident(incident: IncidentRecord) {
    this.router.navigate(['/incidents/view', incident.id]);
  }

  // Search and filter methods
  onUserSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.userSearchTerm.set(target.value);
  }

  onIncidentSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.incidentSearchTerm.set(target.value);
  }

  onAnalysisLevelFilterChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const level = target.value;
    this.selectedAnalysisLevel.set(level || null);
  }

  // Utility methods
  getUserRoleBadgeClass(user: User): string {
    if (!user.role) return 'badge-secondary';
    
    const roleName = user.role.role.toLowerCase();
    switch (roleName) {
      case 'administrator':
        return 'badge-danger';
      case 'manager':
        return 'badge-warning';
      case 'user':
        return 'badge-primary';
      case 'guest':
        return 'badge-info';
      default:
        return 'badge-secondary';
    }
  }

  getAnalysisLevelBadgeClass(analysisLevel?: string): string {
    if (!analysisLevel) return 'badge-secondary';
    
    const level = analysisLevel.toLowerCase();
    if (level.includes('level 1') || level.includes('basic')) {
      return 'badge-info';
    } else if (level.includes('level 2') || level.includes('moderate')) {
      return 'badge-info';
    } else if (level.includes('level 3') || level.includes('moderate')) {
      return 'badge-warning';
    } else if (level.includes('level 4') || level.includes('detailed')) {
      return 'badge-danger';
    } else if (level.includes('level 5') || level.includes('comprehensive')) {
      return 'badge-danger';
    }
    return 'badge-secondary';
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) {
        const minLength = field.errors['minlength'].requiredLength;
        return `${fieldName} must be at least ${minLength} characters`;
      }
      if (field.errors['email']) return 'Please enter a valid email';
    }
    return '';
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // TrackBy functions for performance
  trackUserById(index: number, user: User): number {
    return user.id;
  }

  trackIncidentById(index: number, incident: IncidentRecord): number {
    return incident.id;
  }
}