export interface User {
  id: number;
  userName: string; 
  roleId: number; 
  active: number; 
  role?: Role; 
  userRoles?: UserRole[]; 
  userData?: UserData; 
}

export interface Role {
  id: number;
  role: string; 
}

export interface UserRole {
  userName: string;
  roleId: number;
}

export interface UserData {
  personnelNumber: string;
  companyNumber: string;
  firstName: string;
  lastName: string;
  displayName: string;
  officePhone: string;
  officeBuilding: string;
  officeRoom: string;
  jobDescription: string;
  referenceInstructor: string;
  emailAddress: string;
  supervisorId: string;
  superSupervisorId: string;
  locationCode: string;
  locationDescription: string;
  isActive: string;
  activeStatus: string;
  accountType: string;
  departmentLead: string;
  department: string;
  departmentOuId?: number;
  director: string;
  directorate: string;
  directorateOuId?: number;
  sectionLead: string;
  section: string;
  sectionOuId?: number;
  teamLead: string;
  team: string;
  teamOuId?: number;
  lastDownloadDate?: Date;
}

export interface LoginCredentials {
  userName: string; 
  password: string; 
}

export interface RegisterData {
  userName: string; 
  password: string; 
  roleId: number; 
  active: number; 
  userData?: Partial<UserData>; 
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ProfileUpdateData {
  userData?: Partial<UserData>; 
  roleId?: number;
  active?: number;
}