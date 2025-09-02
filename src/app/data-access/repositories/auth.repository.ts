import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, map, catchError } from 'rxjs/operators';
import { User, LoginCredentials, RegisterData, UserData, Role } from '../models/auth.model';
import { ENDPOINTS } from '../api/endpoints';

interface UserWithPassword extends User {
  password: string;
}

interface UsersData {
  users: UserWithPassword[];
  roles: Role[];
  sessions: any[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthRepository {
  private usersData: UsersData | null = null;

  constructor(private http: HttpClient) {
    this.loadUsersData();
  }

  private loadUsersData(): void {
    // Load users data from JSON file or fallback to hardcoded data
    this.http.get<UsersData>('assets/data/users.json').subscribe({
      next: (data) => {
        this.usersData = data;
      },
      error: (error) => {
        console.error('Failed to load users data:', error);
        // Fallback to hardcoded data that matches backend structure
        this.usersData = {
          roles: [
            { id: 1, role: 'Administrator' },
            { id: 2, role: 'Manager' },
            { id: 3, role: 'User' },
            { id: 4, role: 'Guest' }
          ],
          users: [
            {
              id: 1,
              userName: 'admin',
              password: 'admin123',
              roleId: 1,
              active: 1,
              role: { id: 1, role: 'Administrator' },
              userData: {
                personnelNumber: 'ADM001',
                companyNumber: 'admin',
                firstName: 'System',
                lastName: 'Administrator',
                displayName: 'System Administrator',
                officePhone: '+1234567890',
                officeBuilding: 'HQ',
                officeRoom: '101',
                jobDescription: 'System Administrator',
                referenceInstructor: '',
                emailAddress: 'admin@hse.com',
                supervisorId: '',
                superSupervisorId: '',
                locationCode: 'HQ01',
                locationDescription: 'Headquarters',
                isActive: 'Y',
                activeStatus: 'Active',
                accountType: 'Employee',
                departmentLead: '',
                department: 'IT',
                departmentOuId: 1,
                director: '',
                directorate: 'Technology',
                directorateOuId: 1,
                sectionLead: '',
                section: 'Systems',
                sectionOuId: 1,
                teamLead: '',
                team: 'Infrastructure',
                teamOuId: 1,
                lastDownloadDate: new Date()
              }
            },
            {
              id: 2,
              userName: 'jdoe',
              password: 'password123',
              roleId: 3,
              active: 1,
              role: { id: 3, role: 'User' },
              userData: {
                personnelNumber: 'EMP002',
                companyNumber: 'jdoe',
                firstName: 'John',
                lastName: 'Doe',
                displayName: 'John Doe',
                officePhone: '+1234567891',
                officeBuilding: 'B1',
                officeRoom: '205',
                jobDescription: 'Safety Engineer',
                referenceInstructor: '',
                emailAddress: 'john.doe@company.com',
                supervisorId: 'admin',
                superSupervisorId: '',
                locationCode: 'B101',
                locationDescription: 'Building 1',
                isActive: 'Y',
                activeStatus: 'Active',
                accountType: 'Employee',
                departmentLead: 'manager1',
                department: 'Safety',
                departmentOuId: 2,
                director: 'admin',
                directorate: 'Operations',
                directorateOuId: 2,
                sectionLead: 'manager1',
                section: 'HSE',
                sectionOuId: 2,
                teamLead: 'jdoe',
                team: 'Field Safety',
                teamOuId: 2,
                lastDownloadDate: new Date()
              }
            }
          ],
          sessions: []
        };
      }
    });
  }

  login(credentials: LoginCredentials): Observable<User> {
    // In real app, this would be: return this.http.post<User>(ENDPOINTS.auth.login, credentials);
    return of(null).pipe(
      delay(1000),
      map(() => {
        if (!this.usersData) {
          throw new Error('User data not loaded');
        }

        const user = this.usersData.users.find(u => 
          u.userName === credentials.userName && u.password === credentials.password
        );
        
        if (user && user.active === 1) {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        } else if (user && user.active !== 1) {
          throw new Error('Account is inactive');
        } else {
          throw new Error('Invalid username or password');
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  register(data: RegisterData): Observable<User> {
  return of(null).pipe(
    delay(1000),
    map(() => {
      if (!this.usersData) {
        throw new Error('User data not loaded');
      }

      const existingUser = this.usersData.users.find(u => u.userName === data.userName);
      if (existingUser) {
        throw new Error('User with this username already exists');
      }

      const newUser: UserWithPassword = {
        id: this.usersData.users.length + 1,
        userName: data.userName,
        password: data.password,
        roleId: data.roleId,
        active: data.active,
        role: this.usersData.roles.find(r => r.id === data.roleId),
        userData: data.userData as UserData 
      };

      this.usersData.users.push(newUser);
      const { password, ...userWithoutPassword } = newUser;
      return userWithoutPassword as User; // Explicit cast
    }),
    catchError(error => {
      console.error('Registration error:', error);
      return throwError(() => error);
    })
  );
}

  updateProfile(userId: number, updateData: Partial<User>): Observable<User> {
    // In real app: return this.http.put<User>(`${ENDPOINTS.auth.profile}/${userId}`, updateData);
    return of(null).pipe(
      delay(500),
      map(() => {
        if (!this.usersData) {
          throw new Error('User data not loaded');
        }

        const userIndex = this.usersData.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
          throw new Error('User not found');
        }

        // Update user data
        const updatedUser = {
          ...this.usersData.users[userIndex],
          ...updateData,
          id: userId // Ensure ID doesn't change
        };

        // If role changed, update role object
        if (updateData.roleId) {
          updatedUser.role = this.usersData.roles.find(r => r.id === updateData.roleId);
        }

        this.usersData.users[userIndex] = updatedUser;
        const { password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
      }),
      catchError(error => {
        console.error('Profile update error:', error);
        return throwError(() => error);
      })
    );
  }

  // Additional method to get user by ID
  getUserById(userId: number): Observable<User | null> {
    return of(null).pipe(
      delay(300),
      map(() => {
        if (!this.usersData) {
          return null;
        }

        const user = this.usersData.users.find(u => u.id === userId);
        if (user) {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        }
        return null;
      }),
      catchError(error => {
        console.error('Get user error:', error);
        return of(null);
      })
    );
  }

  // Get user by userName
  getUserByUserName(userName: string): Observable<User | null> {
    return of(null).pipe(
      delay(300),
      map(() => {
        if (!this.usersData) {
          return null;
        }

        const user = this.usersData.users.find(u => u.userName === userName);
        if (user) {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        }
        return null;
      }),
      catchError(error => {
        console.error('Get user by userName error:', error);
        return of(null);
      })
    );
  }

  // Additional method to get all users (admin only)
  getAllUsers(): Observable<User[]> {
    return of(null).pipe(
      delay(500),
      map(() => {
        if (!this.usersData) {
          return [];
        }

        return this.usersData.users.map(user => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });
      }),
      catchError(error => {
        console.error('Get all users error:', error);
        return of([]);
      })
    );
  }

  // Get all roles
  getAllRoles(): Observable<Role[]> {
    return of(null).pipe(
      delay(300),
      map(() => {
        if (!this.usersData) {
          return [];
        }
        return this.usersData.roles;
      }),
      catchError(error => {
        console.error('Get all roles error:', error);
        return of([]);
      })
    );
  }
}