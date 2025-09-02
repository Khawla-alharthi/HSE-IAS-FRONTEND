import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../data-access/models/auth.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: 'header.component.html',
  styleUrls: ['header.component.css']
})
export class HeaderComponent {
  constructor(
    private router: Router,
    public authService: AuthService // Make it public so template can access it
  ) {}

  goToLogin() {
    // Navigate to login page
    this.router.navigate(['/login']);
  }

  logout() {
    // Handle logout using your existing auth service
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  // Helper method to get display name with fallback
  getUserDisplayName(user: User): string {
    if (user.userData?.firstName && user.userData?.lastName) {
      return `${user.userData.firstName} ${user.userData.lastName}`;
    }
    if (user.userData?.displayName) {
      return user.userData.displayName;
    }
    if (user.userName) {
      return user.userName;
    }
    return 'User';
  }
}