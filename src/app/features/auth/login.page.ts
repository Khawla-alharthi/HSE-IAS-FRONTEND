import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../core/services/auth.service';
import { LoginCredentials } from '../../data-access/models/auth.model';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    RouterModule,
    LoadingSpinnerComponent
  ],
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.css']
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';
  returnUrl = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Updated to use userName instead of email to match the model
    this.loginForm = this.formBuilder.group({
      userName: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Get return url from route parameters or default to dashboard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/main';
    
    // If user is already logged in, redirect to appropriate dashboard
    if (this.authService.isAuthenticated) {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser?.role?.role.toLowerCase() === 'administrator') {
        this.router.navigate(['/admin-dashboard']);
      } else {
        this.router.navigate([this.returnUrl]);
      }
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  fillDemoCredentials(type: 'admin' | 'user'): void {
    if (type === 'admin') {
      this.loginForm.patchValue({
        userName: 'admin',
        password: 'admin123'
      });
    } else {
      this.loginForm.patchValue({
        userName: 'jdoe',
        password: 'password123'
      });
    }
    
    // Mark fields as touched to show they're filled
    this.loginForm.get('userName')?.markAsTouched();
    this.loginForm.get('password')?.markAsTouched();
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading = true;
      this.errorMessage = '';

      const credentials: LoginCredentials = this.loginForm.value;

      this.authService.login(credentials).subscribe({
        next: (user) => {
          this.loading = false;

          // Redirect based on role using the proper role structure
          if (user.role?.role.toLowerCase() === 'administrator') {
            this.router.navigate(['/admin-dashboard']);
          } else {
            this.router.navigate(['/main']);
          }
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error.message || 'Login failed. Please try again.';
          this.loginForm.get('password')?.setValue('');
        }
      });
    } else {
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }
}