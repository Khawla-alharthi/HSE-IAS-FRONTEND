import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { User, LoginCredentials, RegisterData, UserData } from '../../data-access/models/auth.model';
import { AuthRepository } from '../../data-access/repositories/auth.repository';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'hse_auth_token';
  private readonly USER_KEY = 'hse_current_user';
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  constructor(
    private authRepository: AuthRepository,
    private router: Router
  ) {
    // Initialize from localStorage on service creation
    this.initializeFromStorage();
  }

  private initializeFromStorage(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.clearStorage();
      }
    }
  }

  get isAuthenticated(): boolean {
    return !!this.currentUserSubject.value && !!localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  login(credentials: LoginCredentials): Observable<User> {
    return new Observable(observer => {
      this.authRepository.login(credentials).subscribe({
        next: (user) => {
          // Generate a mock token
          const token = this.generateMockToken();
          
          // Store in localStorage
          localStorage.setItem(this.TOKEN_KEY, token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
          
          // Update current user subject
          this.currentUserSubject.next(user);
          
          observer.next(user);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  register(data: RegisterData): Observable<User> {
    return new Observable(observer => {
      this.authRepository.register(data).subscribe({
        next: (user) => {
          // Generate a mock token
          const token = this.generateMockToken();
          
          // Store in localStorage
          localStorage.setItem(this.TOKEN_KEY, token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
          
          // Update current user subject
          this.currentUserSubject.next(user);
          
          observer.next(user);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  logout(): void {
    this.clearStorage();
    this.currentUserSubject.next(null);
  }

  updateProfile(updateData: Partial<User>): Observable<User> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return throwError(() => new Error('No authenticated user'));
    }

    return new Observable(observer => {
      this.authRepository.updateProfile(currentUser.id, updateData).subscribe({
        next: (updatedUser) => {
          // Update localStorage
          localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
          
          // Update current user subject
          this.currentUserSubject.next(updatedUser);
          
          observer.next(updatedUser);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  refreshToken(): Observable<string> {
    // In a real app, this would refresh the JWT token
    const newToken = this.generateMockToken();
    localStorage.setItem(this.TOKEN_KEY, newToken);
    return new Observable(observer => {
      observer.next(newToken);
      observer.complete();
    });
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private generateMockToken(): string {
    // Generate a mock JWT-like token
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      userId: this.currentUserSubject.value?.id || 'unknown',
      userName: this.currentUserSubject.value?.userName || 'unknown',
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }));
    const signature = btoa('mock_signature');
    
    return `${header}.${payload}.${signature}`;
  }

  private clearStorage(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  // Helper methods updated for backend role structure
  hasRole(roleId: number): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.roleId === roleId;
  }

  // Check if user has a specific role name
  hasRoleName(roleName: string): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.role?.role.toLowerCase() === roleName.toLowerCase();
  }

  // Helper method to check if user is admin (assuming admin role has specific roleId or name)
  isAdmin(): boolean {
    return this.hasRoleName('admin') || this.hasRoleName('administrator');
  }

  // Check if user is active
  isActiveUser(): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.active === 1;
  }

  // Get user display name from UserData
  getUserDisplayName(): string {
    const currentUser = this.getCurrentUser();
    if (currentUser?.userData?.displayName) {
      return currentUser.userData.displayName;
    }
    if (currentUser?.userData?.firstName && currentUser?.userData?.lastName) {
      return `${currentUser.userData.firstName} ${currentUser.userData.lastName}`;
    }
    return currentUser?.userName || 'Unknown User';
  }
}
