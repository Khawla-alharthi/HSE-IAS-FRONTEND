import { Routes } from '@angular/router';
import { LoginPage } from './features/auth/login.page';
import { MainPage } from './features/pages/main/main.page';
import { AdminDashboardComponent } from './features/pages/admin-dashboard/admin-dashboard.page'; 
import { AdminGuard } from './core/guards/admin.guard';
import { UserDashboardComponent  } from './features/pages/dashboard/dashboard.page';
import { HistoryComponent } from './features/pages/history/history.page';
import { ProfileComponent } from './features/pages/profile/profile.page';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginPage },
  { path: 'main', component: MainPage },
  { path: 'admin-dashboard', component: AdminDashboardComponent, canActivate: [AdminGuard] },
  { path: 'dashboard', component: UserDashboardComponent },
  { path: 'history', component: HistoryComponent }, // Check if this exists
  { path: 'profile', component: ProfileComponent }, // Check if this exists
];