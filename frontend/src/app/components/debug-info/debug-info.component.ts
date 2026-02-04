import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-debug-info',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="debug-panel">
      <button mat-mini-fab color="primary" (click)="toggle()" class="debug-toggle">
        <mat-icon>{{ isOpen ? 'close' : 'bug_report' }}</mat-icon>
      </button>

      <mat-card *ngIf="isOpen" class="debug-card">
        <mat-card-header>
          <mat-card-title>🐛 Multi-Tenant Debug Info</mat-card-title>
        </mat-card-header>
        <mat-card-content>

          <!-- Current User -->
          <div class="debug-section">
            <h3>👤 Current User</h3>
            <pre>{{ currentUser | json }}</pre>
          </div>

          <!-- Selected Club -->
          <div class="debug-section">
            <h3>🏢 Selected Club</h3>
            <pre>{{ selectedClub | json }}</pre>
          </div>

          <!-- All Clubs -->
          <div class="debug-section">
            <h3>🏢 All Clubs ({{ clubs.length }})</h3>
            <pre>{{ clubs | json }}</pre>
          </div>

          <!-- Auth State -->
          <div class="debug-section">
            <h3>🔐 Auth State</h3>
            <div class="debug-grid">
              <div><strong>Is Authenticated:</strong> {{ isAuthenticated }}</div>
              <div><strong>Is Loading:</strong> {{ isLoading }}</div>
              <div><strong>Has Token:</strong> {{ hasToken }}</div>
              <div><strong>Platform Role:</strong> {{ currentUser?.platformRole || 'N/A' }}</div>
              <div><strong>Old Role:</strong> {{ currentUser?.role || 'N/A' }}</div>
              <div><strong>Club Role:</strong> {{ selectedClub?.role || 'N/A' }}</div>
              <div><strong>Is Platform Admin:</strong> {{ isPlatformAdmin }}</div>
              <div><strong>Is Club Admin:</strong> {{ isClubAdmin }}</div>
            </div>
          </div>

          <!-- LocalStorage -->
          <div class="debug-section">
            <h3>💾 LocalStorage</h3>
            <div class="debug-grid">
              <div><strong>token:</strong> {{ hasLocalStorageToken ? '✅ Present' : '❌ Missing' }}</div>
              <div><strong>user:</strong> {{ hasLocalStorageUser ? '✅ Present' : '❌ Missing' }}</div>
              <div><strong>clubs:</strong> {{ hasLocalStorageClubs ? '✅ Present' : '❌ Missing' }}</div>
              <div><strong>selectedClub:</strong> {{ hasLocalStorageSelectedClub ? '✅ Present' : '❌ Missing' }}</div>
            </div>
          </div>

          <!-- HTTP Headers Test -->
          <div class="debug-section">
            <h3>📡 HTTP Headers (What Gets Sent)</h3>
            <div class="debug-info-box">
              <div><strong>Authorization:</strong> Bearer {{ token ? '✅ [TOKEN]' : '❌ Missing' }}</div>
              <div><strong>X-Club-Id:</strong> {{ selectedClub?.clubId || '❌ Missing' }}</div>
            </div>
            <button mat-stroked-button color="primary" (click)="testApiCall()" [disabled]="testingApi" style="margin-top: 8px; width: 100%;">
              {{ testingApi ? 'Testing...' : 'Test API Call (Members)' }}
            </button>
            <div *ngIf="apiTestResult" class="api-test-result" [class.success]="apiTestSuccess" [class.error]="!apiTestSuccess">
              <strong>{{ apiTestSuccess ? '✅ Success' : '❌ Error' }}</strong>
              <pre>{{ apiTestResult | json }}</pre>
            </div>
          </div>

          <button mat-raised-button color="warn" (click)="clearAuth()">
            Clear Auth & Reload
          </button>

        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .debug-panel {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
    }

    .debug-toggle {
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .debug-card {
      position: fixed;
      bottom: 80px;
      right: 20px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }

    .debug-section {
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e0e0e0;
    }

    .debug-section:last-of-type {
      border-bottom: none;
    }

    .debug-section h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
      color: #1976d2;
    }

    .debug-section pre {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
      margin: 0;
    }

    .debug-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 13px;
    }

    .debug-grid div {
      padding: 4px;
    }

    button[color="warn"] {
      margin-top: 16px;
      width: 100%;
    }

    .debug-info-box {
      background: #e3f2fd;
      padding: 12px;
      border-radius: 4px;
      border-left: 4px solid #1976d2;
    }

    .debug-info-box div {
      padding: 4px 0;
      font-size: 13px;
      font-family: monospace;
    }

    .api-test-result {
      margin-top: 8px;
      padding: 12px;
      border-radius: 4px;
    }

    .api-test-result.success {
      background: #e8f5e9;
      border-left: 4px solid #4caf50;
    }

    .api-test-result.error {
      background: #ffebee;
      border-left: 4px solid #f44336;
    }

    .api-test-result pre {
      margin: 8px 0 0 0;
      font-size: 11px;
    }
  `]
})
export class DebugInfoComponent implements OnInit {
  isOpen = false;
  currentUser: any = null;
  selectedClub: any = null;
  clubs: any[] = [];
  isAuthenticated = false;
  isLoading = false;
  hasToken = false;
  token: string | null = null;
  isPlatformAdmin = false;
  isClubAdmin = false;

  hasLocalStorageToken = false;
  hasLocalStorageUser = false;
  hasLocalStorageClubs = false;
  hasLocalStorageSelectedClub = false;

  testingApi = false;
  apiTestResult: any = null;
  apiTestSuccess = false;

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.updateDebugInfo();

    // Subscribe to auth changes
    this.authService.currentUser$.subscribe(() => this.updateDebugInfo());
    this.authService.selectedClub$.subscribe(() => this.updateDebugInfo());
    this.authService.clubs$.subscribe(() => this.updateDebugInfo());
  }

  updateDebugInfo(): void {
    this.currentUser = this.authService.currentUser;
    this.selectedClub = this.authService.selectedClub;
    this.clubs = this.authService.clubs;
    this.isAuthenticated = this.authService.isAuthenticated();
    this.isLoading = this.authService.isLoading();
    this.token = this.authService.token;
    this.hasToken = !!this.token;
    this.isPlatformAdmin = this.authService.isPlatformAdmin();
    this.isClubAdmin = this.authService.isClubAdmin();

    // Check localStorage
    this.hasLocalStorageToken = !!localStorage.getItem('token');
    this.hasLocalStorageUser = !!localStorage.getItem('user');
    this.hasLocalStorageClubs = !!localStorage.getItem('clubs');
    this.hasLocalStorageSelectedClub = !!localStorage.getItem('selectedClub');
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.updateDebugInfo();
    }
  }

  clearAuth(): void {
    localStorage.clear();
    window.location.reload();
  }

  testApiCall(): void {
    this.testingApi = true;
    this.apiTestResult = null;
    this.apiTestSuccess = false;

    // Make a test API call to members endpoint
    this.http.get(`${environment.apiUrl}/members`).subscribe({
      next: (response: any) => {
        this.testingApi = false;
        this.apiTestSuccess = true;
        this.apiTestResult = {
          status: 'Success',
          membersCount: response.data?.length || 0,
          message: 'API call successful! X-Club-Id header was sent.',
          note: 'Check browser DevTools > Network tab to see actual headers'
        };
      },
      error: (error) => {
        this.testingApi = false;
        this.apiTestSuccess = false;
        this.apiTestResult = {
          status: 'Error',
          message: error.error?.message || error.message || 'API call failed',
          errorCode: error.status
        };
      }
    });
  }
}
