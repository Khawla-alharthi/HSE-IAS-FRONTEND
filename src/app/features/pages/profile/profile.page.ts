import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../data-access/models/auth.model';

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  incidentUpdates: boolean;
  systemAlerts: boolean;
}

interface ProfileStats {
  totalReports: number;
  lastLogin: Date;
  accountCreated: Date;
  profileCompleteness: number;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.css']
})
export class ProfileComponent implements OnInit {
  currentUser = signal<User | null>(null);
  isLoading = signal(false);
  activeTab = signal<'profile' | 'notifications' | 'preferences'>('profile');
  
  notifications = signal<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: false,
    incidentUpdates: true,
    systemAlerts: true
  });

  successMessage = signal<string>('');
  errorMessage = signal<string>('');

  // Profile stats
  profileStats = signal<ProfileStats>({
    totalReports: 0,
    lastLogin: new Date(),
    accountCreated: new Date(),
    profileCompleteness: 100 // Always 100% for SSO users
  });

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.currentUser.set(user);
    this.loadUserData();
  }

  private loadUserData() {
    const user = this.currentUser();
    if (!user) return;

    // Calculate profile completeness based on available user data
    const completeness = this.calculateProfileCompleteness(user);

    // Load profile stats (in real app, these would come from API)
    this.profileStats.set({
      totalReports: 12,
      lastLogin: new Date(),
      accountCreated: user.userData?.lastDownloadDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      profileCompleteness: completeness
    });
  }

  private calculateProfileCompleteness(user: User): number {
    if (!user.userData) return 50; // Basic info only

    const fields = [
      user.userData.firstName,
      user.userData.lastName,
      user.userData.emailAddress,
      user.userData.department,
      user.userData.jobDescription,
      user.userData.officePhone,
      user.userData.officeBuilding
    ];

    const completedFields = fields.filter(field => field && field.trim().length > 0).length;
    return Math.round((completedFields / fields.length) * 100);
  }

  // Tab navigation
  switchTab(tab: 'profile' | 'notifications' | 'preferences') {
    this.activeTab.set(tab);
    this.clearMessages();
  }

  // Notification settings
  updateNotificationSetting(setting: keyof NotificationSettings, value: boolean) {
    this.notifications.update(current => ({
      ...current,
      [setting]: value
    }));
    
    // Save notification settings to API
    this.saveNotificationSettings();
  }

  private async saveNotificationSettings() {
    try {
      await this.simulateApiCall();
      // Show brief success message
      this.successMessage.set('Notification settings updated!');
      setTimeout(() => this.clearMessages(), 2000);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      this.errorMessage.set('Failed to update notification settings. Please try again.');
    }
  }

  // Account actions
  async exportData() {
    this.isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      // Create export data
      const exportData = {
        profile: this.currentUser(),
        settings: this.notifications(),
        exportDate: new Date().toISOString(),
        totalReports: this.profileStats().totalReports
      };

      // Create and download file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `profile-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      this.successMessage.set('Data exported successfully!');

    } catch (error) {
      console.error('Error exporting data:', error);
      this.errorMessage.set('Failed to export data. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async deactivateAccount() {
    if (!confirm('Are you sure you want to deactivate your account? This action cannot be undone.')) {
      return;
    }

    this.isLoading.set(true);
    try {
      await this.simulateApiCall();
      this.authService.logout();
      this.router.navigate(['/auth/login']);
    } catch (error) {
      console.error('Error deactivating account:', error);
      this.errorMessage.set('Failed to deactivate account. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // Utility methods
  private clearMessages() {
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  private simulateApiCall(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 1000); // Simulate network delay
    });
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateTime(date: Date | string): string {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Helper methods for user data access
  getFirstName(): string {
    return this.currentUser()?.userData?.firstName || 'Not provided';
  }

  getLastName(): string {
    return this.currentUser()?.userData?.lastName || 'Not provided';
  }

  getEmail(): string {
    return this.currentUser()?.userData?.emailAddress || 'Not provided';
  }

  getDisplayName(): string {
    const userData = this.currentUser()?.userData;
    if (userData?.displayName) {
      return userData.displayName;
    }
    if (userData?.firstName && userData?.lastName) {
      return `${userData.firstName} ${userData.lastName}`;
    }
    return this.currentUser()?.userName || 'Unknown User';
  }

  getDepartment(): string {
    return this.currentUser()?.userData?.department || 'Not provided';
  }

  getPosition(): string {
    return this.currentUser()?.userData?.jobDescription || 'Not provided';
  }

  getOfficeLocation(): string {
    const userData = this.currentUser()?.userData;
    if (userData?.officeBuilding && userData?.officeRoom) {
      return `${userData.officeBuilding}, Room ${userData.officeRoom}`;
    }
    return userData?.officeBuilding || userData?.locationDescription || 'Not provided';
  }

  getPhoneNumber(): string {
    return this.currentUser()?.userData?.officePhone || 'Not provided';
  }

  getPersonnelNumber(): string {
    return this.currentUser()?.userData?.personnelNumber || 'Not provided';
  }

  getRoleName(): string {
    return this.currentUser()?.role?.role || 'User';
  }

  isActiveUser(): boolean {
    return this.currentUser()?.active === 1;
  }
}