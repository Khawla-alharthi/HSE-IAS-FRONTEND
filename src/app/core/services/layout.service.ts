import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private sidebarCollapsed = signal(false);
  private mobileMenuOpen = signal(false);

  get isSidebarCollapsed() {
    return this.sidebarCollapsed;
  }

  get isMobileMenuOpen() {
    return this.mobileMenuOpen;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(collapsed => !collapsed);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(open => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}