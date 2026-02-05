import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AuthService } from '../../services/auth.service';
import { AnalyticsService } from '../../services/analytics.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' })),
      ]),
    ]),
  ],
  template: `
    <div class="login-container">
      <!-- Left Panel - How It Works -->
      <div class="info-panel">
        <div class="info-header">
          <div class="logo-section">
            <div class="logo-icon">
              <i class="pi pi-trophy"></i>
            </div>
            <div>
              <h1 class="app-title">Court Reservation System</h1>
              <p class="app-tagline">Professional Multi-Club Management</p>
            </div>
          </div>
        </div>

        <div class="features-section">
          <h2 class="features-title">How It Works</h2>
          <div class="features-subtitle">
            <p>
              Manage courts efficiently with rankings, open play sessions, and professional
              reservation management across multiple clubs
            </p>
          </div>

          <div class="feature-item">
            <div class="feature-icon">
              <i class="pi pi-calendar-plus"></i>
            </div>
            <div class="feature-content">
              <h3>Reserve Courts</h3>
              <p>
                Book courts with flexible scheduling. Choose from available time slots and reserve
                your preferred court times instantly.
              </p>
            </div>
          </div>

          <div class="feature-item">
            <div class="feature-icon">
              <i class="pi pi-users"></i>
            </div>
            <div class="feature-content">
              <h3>Member Community</h3>
              <p>
                Join approved club communities. Connect with other players, collaborate on matches,
                and improve together.
              </p>
            </div>
          </div>

          <div class="feature-item">
            <div class="feature-icon">
              <i class="pi pi-credit-card"></i>
            </div>
            <div class="feature-content">
              <h3>Easy Payments</h3>
              <p>
                Handle membership fees and court bookings seamlessly. Track payments, invoices, and
                financial reports all in one place.
              </p>
            </div>
          </div>

          <div class="feature-item">
            <div class="feature-icon">
              <i class="pi pi-cloud"></i>
            </div>
            <div class="feature-content">
              <h3>Weather Integration</h3>
              <p>
                Get real-time weather updates for your location before your game. Plan your matches
                with confidence.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel - Login Form -->
      <div class="login-panel">
        <div class="login-card">
          <div class="card-header">
            <div class="header-icon">
              <i class="pi pi-sign-in"></i>
            </div>
            <div class="header-text">
              <h2 class="login-title">Welcome Back</h2>
              <p class="login-subtitle">Please sign in to your account</p>
            </div>
          </div>

          <div class="card-content">
            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form" novalidate>
              <!-- Username Field -->
              <div class="field">
                <label for="username" class="field-label">Username</label>
                <div class="input-icon-wrapper">
                  <input
                    type="text"
                    id="username"
                    formControlName="username"
                    placeholder="Enter your username"
                    class="modern-input"
                    autocomplete="username"
                    [class.invalid]="false"
                  />
                  <i class="pi pi-user input-icon"></i>
                </div>
              </div>

              <!-- Password Field -->
              <div class="field">
                <label for="password" class="field-label">Password</label>
                <div class="input-icon-wrapper">
                  <input
                    [type]="hidePassword ? 'password' : 'text'"
                    id="password"
                    formControlName="password"
                    placeholder="Enter your password"
                    class="modern-input"
                    autocomplete="current-password"
                    (keydown.enter)="onSubmit()"
                    [class.invalid]="false"
                  />
                  <button
                    type="button"
                    class="password-toggle"
                    (click)="hidePassword = !hidePassword"
                    aria-label="Toggle password visibility"
                  >
                    <i [class]="hidePassword ? 'pi pi-eye' : 'pi pi-eye-slash'"></i>
                  </button>
                </div>
              </div>

              <!-- Modern Error Message -->
              <div *ngIf="loginError" class="error-container" [@slideIn]>
                <div class="modern-error-alert">
                  <div class="error-icon">
                    <i class="pi pi-exclamation-triangle"></i>
                  </div>
                  <div class="error-content">
                    <div class="error-title">Login Failed</div>
                    <div class="error-message">{{ loginError }}</div>
                  </div>
                  <button
                    type="button"
                    class="error-close"
                    (click)="clearError()"
                    aria-label="Close error message"
                  >
                    <i class="pi pi-times"></i>
                  </button>
                </div>
              </div>

              <!-- Login Actions -->
              <div class="login-actions">
                <button type="submit" class="login-button" [disabled]="loading">
                  <i *ngIf="loading" class="pi pi-spinner pi-spin loading-icon"></i>
                  <i *ngIf="!loading" class="pi pi-sign-in button-icon"></i>
                  <span>{{ loading ? 'Signing In...' : 'Sign In' }}</span>
                </button>
              </div>
            </form>
          </div>

          <div class="login-help">
            <div class="help-text">
              <i class="pi pi-info-circle"></i>
              <span>New to our platform?</span>
              <button type="button" class="register-link" (click)="goToRegister()">
                Create your account here
              </button>
            </div>
            <div class="help-text" style="margin-top: 12px;">
              <i class="pi pi-building"></i>
              <span>Want to register your club?</span>
              <button
                type="button"
                class="register-link club-link"
                (click)="goToClubRegistration()"
              >
                Register a Club
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  hidePassword = true;
  loginError: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private analyticsService: AnalyticsService,
  ) {
    console.log('LoginComponent constructor called');
    this.loginForm = this.fb.group({
      username: [''],
      password: [''],
    });
  }

  goToRegister(): void {
    // Track navigation to register page
    this.analyticsService.trackButtonClick('Create Account', 'login', { destination: 'register' });
    this.router.navigate(['/register']);
  }

  goToClubRegistration(): void {
    // Track navigation to club registration page
    this.analyticsService.trackButtonClick('Register Club', 'login', {
      destination: 'register-club',
    });
    this.router.navigate(['/register-club']);
  }

  clearError(): void {
    this.loginError = '';
  }

  ngOnInit(): void {
    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/calendar']);
    }
  }

  onSubmit(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Clear any previous errors
    this.loginError = '';

    // Custom validation
    const username = this.loginForm.get('username')?.value?.trim();
    const password = this.loginForm.get('password')?.value?.trim();

    if (!username || !password) {
      this.loginError = 'Please enter both username and password.';
      return;
    }

    if (!this.loading) {
      this.loading = true;

      this.authService.login(this.loginForm.value).subscribe({
        next: (response: any) => {
          this.loading = false;

          // Track successful login
          const username = this.loginForm.value.username;
          this.analyticsService.trackLogin(username);

          // Check if user has any approved clubs (clubs array is in response.data)
          const clubs = response.data?.clubs || response.clubs || [];
          const hasApprovedClubs = clubs.some((c: any) => c.status === 'approved');
          const user = response.data?.user || response.user;
          const isSuperAdmin =
            user?.role === 'superadmin' || user?.platformRole === 'platform_admin';

          // Check for intended route
          const intendedRoute = this.authService.getIntendedRoute();
          if (intendedRoute) {
            this.authService.clearIntendedRoute();
            this.router.navigate([intendedRoute]);
          } else if (isSuperAdmin && !hasApprovedClubs) {
            // Superadmin with no clubs - redirect to platform admin page
            this.router.navigate(['/admin/pending-clubs']);
          } else if (!hasApprovedClubs) {
            // Regular user with no clubs - redirect to browse clubs
            this.router.navigate(['/browse-clubs']);
          } else {
            // User has clubs - use new logic:
            // Single club: auto-select and go to dashboard
            // Multiple clubs: go to club selector
            const redirectPath = this.authService.getLoginRedirectPath();
            this.router.navigate([redirectPath]);
          }
        },
        error: (error: any) => {
          this.loading = false;

          // Set custom error message for modern error display (no more toast)
          if (error.status === 401) {
            this.loginError =
              error.error?.error ||
              'Invalid username or password. Please check your credentials and try again.';
          } else if (error.status === 403) {
            // Use backend's specific error message for better clarity
            this.loginError =
              error.error?.error ||
              'Your account is pending approval. Please wait for administrator review.';
          } else {
            this.loginError = error.error?.error || 'Login failed. Please try again later.';
          }

          // Don't show toast for login errors anymore - we use the modern inline error
        },
      });
    } else {
      // No-op: already loading
    }
  }
}
