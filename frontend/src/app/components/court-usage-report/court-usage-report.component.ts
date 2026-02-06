import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { interval, Subscription } from 'rxjs';
import { switchMap, filter, tap } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { ClubSelectorComponent, ClubOption } from '../../shared/club-selector/club-selector.component';

interface CourtUsageAPIResponse {
  success: boolean;
  data: CourtUsageData;
  message?: string;
  metadata?: {
    source: string;
    lastModified: string;
    cached: boolean;
    paymentIntegration?: boolean;
  };
}

interface CourtUsageData {
  summary: {
    totalMembers: number;
    totalRecordedPayments: number;
    totalRevenue: string;
    lastUpdated: string;
  };
  rawData: Array<any>;
  headers: string[];
}

@Component({
  selector: 'app-court-usage-report',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    ClubSelectorComponent,
  ],
  template: `
    <div class="report-container">
      <!-- Club Selector for Superadmins -->
      <div class="club-filter-section" *ngIf="isSuperAdminOrPlatformAdmin()">
        <app-club-selector
          [label]="'Select Club to View'"
          [showAllOption]="false"
          [appearance]="'outline'"
          [initialClubId]="selectedFilterClubId"
          (clubSelected)="onClubFilterChange($event)">
        </app-club-selector>
      </div>

      <!-- Modern Gradient Header -->
      <div class="modern-header">
        <div class="header-content">
          <div class="header-left">
            <div class="icon-wrapper">
              <mat-icon>analytics</mat-icon>
            </div>
            <div class="title-group">
              <h1>Court Usage Report</h1>
              <p class="subtitle">Member contributions from recorded payments</p>
            </div>
          </div>
          <div class="header-actions">
            <button
              mat-icon-button
              class="refresh-btn"
              (click)="refreshData()"
              [disabled]="loading"
            >
              <mat-icon [class.spinning]="loading">refresh</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="loading">
        <mat-spinner diameter="50"></mat-spinner>
        <p>Loading court usage data...</p>
      </div>

      <!-- Main Content -->
      <div class="main-content" *ngIf="!loading && reportData">
        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card" style="animation-delay: 0.1s">
            <div class="stat-icon members-icon">
              <mat-icon>people</mat-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">Contributing Members</div>
              <div class="stat-value">{{ reportData.summary.totalMembers }}</div>
            </div>
          </div>

          <div class="stat-card" style="animation-delay: 0.2s">
            <div class="stat-icon payments-icon">
              <mat-icon>receipt_long</mat-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">Recorded Payments</div>
              <div class="stat-value">{{ reportData.summary.totalRecordedPayments }}</div>
            </div>
          </div>

          <div class="stat-card" style="animation-delay: 0.3s">
            <div class="stat-icon revenue-icon">
              <mat-icon>monetization_on</mat-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">Total Revenue</div>
              <div class="stat-value">{{ reportData.summary.totalRevenue }}</div>
            </div>
          </div>

          <div class="stat-card" style="animation-delay: 0.4s">
            <div class="stat-icon update-icon">
              <mat-icon>schedule</mat-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">Last Updated</div>
              <div class="stat-value small">{{ getLastUpdated() }}</div>
            </div>
          </div>
        </div>

        <!-- Data Table Card -->
        <div class="table-card">
          <div class="table-card-header">
            <div class="table-title">
              <mat-icon>table_chart</mat-icon>
              <h2>Member Contributions</h2>
            </div>
          </div>

          <div class="table-wrapper">
            <table mat-table [dataSource]="reportData.rawData" class="data-table">
              <ng-container
                *ngFor="let column of reportData.headers; trackBy: trackByColumn"
                [matColumnDef]="column"
              >
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  [class.frozen-column]="column === 'Players/Members'"
                >
                  {{ column }}
                </th>
                <td
                  mat-cell
                  *matCellDef="let element"
                  [ngClass]="{
                    'member-cell': column === 'Players/Members',
                    'amount-cell':
                      column === 'Total' || column.includes('2025') || column.includes('2026'),
                    'total-cell': column === 'Total',
                  }"
                >
                  {{ element[column] }}
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="reportData.headers; sticky: true"></tr>
              <tr mat-row *matRowDef="let row; columns: reportData.headers"></tr>
            </table>
          </div>

          <div *ngIf="reportData.rawData.length === 0" class="no-data">
            <mat-icon>analytics</mat-icon>
            <h3>No Data Available</h3>
            <p>No recorded payment data found for member contributions.</p>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div class="error-state" *ngIf="!loading && error">
        <div class="error-content">
          <mat-icon>error_outline</mat-icon>
          <h2>Unable to Load Report</h2>
          <p>{{ error }}</p>
          <button mat-raised-button color="primary" (click)="refreshData()">
            <mat-icon>refresh</mat-icon>
            Try Again
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      /* ===== CSS VARIABLES ===== */
      :host {
        --primary-gradient-start: #6366f1;
        --primary-gradient-mid: #4f46e5;
        --primary-gradient-end: #7c3aed;
        --primary-color: #4f46e5;
        --success-color: #10b981;
        --warning-color: #f59e0b;
        --danger-color: #ef4444;
        --text-primary: #1e293b;
        --text-secondary: #64748b;
        --border-color: #e2e8f0;
        --card-bg: #ffffff;
        --neutral-bg: #f8fafc;
        --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
        --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
        --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.1);
      }

      /* ===== CONTAINER ===== */
      .report-container {
        min-height: 100vh;
        background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #ddd6fe 100%);
        padding-bottom: 2rem;
      }

      /* ===== MODERN HEADER ===== */
      .modern-header {
        background: linear-gradient(
          135deg,
          var(--primary-gradient-start) 0%,
          var(--primary-gradient-mid) 50%,
          var(--primary-gradient-end) 100%
        );
        padding: 2rem 2rem 3rem;
        box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
        position: relative;
        overflow: hidden;
      }

      .modern-header::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -10%;
        width: 500px;
        height: 500px;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
        border-radius: 50%;
      }

      .header-content {
        max-width: 1400px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;
        z-index: 1;
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: 1.5rem;
      }

      .icon-wrapper {
        width: 64px;
        height: 64px;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
      }

      .icon-wrapper mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: white;
      }

      .title-group h1 {
        margin: 0;
        color: white;
        font-size: 2.5rem;
        font-weight: 700;
        letter-spacing: -0.025em;
      }

      .subtitle {
        margin: 0.5rem 0 0;
        color: rgba(255, 255, 255, 0.9);
        font-size: 1.1rem;
        font-weight: 400;
      }

      .header-actions {
        display: flex;
        gap: 1rem;
      }

      .refresh-btn {
        width: 48px;
        height: 48px;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        color: white;
        border-radius: 12px;
        transition: all 0.3s ease;
      }

      .refresh-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.05);
      }

      .refresh-btn mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .spinning {
        animation: spin 1s linear infinite;
      }

      /* ===== LOADING STATE ===== */
      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        gap: 1.5rem;
      }

      .loading-state p {
        color: var(--text-secondary);
        font-size: 1rem;
        margin: 0;
      }

      /* ===== MAIN CONTENT ===== */
      .main-content {
        max-width: 1400px;
        margin: -2rem auto 0;
        padding: 0 2rem;
        position: relative;
        z-index: 2;
      }

      /* ===== STATS GRID ===== */
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .stat-card {
        background: var(--card-bg);
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: var(--shadow-lg);
        display: flex;
        align-items: center;
        gap: 1.5rem;
        transition: all 0.3s ease;
        animation: slideUp 0.5s ease forwards;
        opacity: 0;
      }

      .stat-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
      }

      .stat-icon {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .stat-icon mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: white;
      }

      .members-icon {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      }

      .payments-icon {
        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
      }

      .revenue-icon {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      }

      .update-icon {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      }

      .stat-info {
        flex: 1;
      }

      .stat-label {
        color: var(--text-secondary);
        font-size: 0.875rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .stat-value {
        color: var(--text-primary);
        font-size: 2rem;
        font-weight: 700;
        line-height: 1;
      }

      .stat-value.small {
        font-size: 1.25rem;
      }

      /* ===== TABLE CARD ===== */
      .table-card {
        background: var(--card-bg);
        border-radius: 16px;
        box-shadow: var(--shadow-lg);
        overflow: hidden;
        animation: slideUp 0.5s ease 0.2s forwards;
        opacity: 0;
      }

      .table-card-header {
        background: linear-gradient(
          135deg,
          var(--primary-gradient-start) 0%,
          var(--primary-gradient-mid) 100%
        );
        padding: 1.5rem 2rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .table-title {
        display: flex;
        align-items: center;
        gap: 1rem;
        color: white;
      }

      .table-title mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .table-title h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
      }

      /* ===== TABLE WRAPPER ===== */
      .table-wrapper {
        overflow-x: auto;
        overflow-y: auto;
        max-height: 65vh;
        position: relative;
      }

      .data-table {
        width: 100%;
        min-width: 800px;
        border-collapse: separate;
        border-spacing: 0;
      }

      /* Table Headers */
      .data-table th {
        background: var(--neutral-bg);
        color: var(--text-primary);
        font-weight: 600;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 1rem 0.75rem;
        border-bottom: 2px solid var(--border-color);
        white-space: nowrap;
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .frozen-column {
        position: sticky !important;
        left: 0;
        z-index: 15 !important;
        box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
        background: #f1f5f9 !important;
        min-width: 220px;
        max-width: 220px;
      }

      /* Table Rows */
      .data-table tr {
        transition: background-color 0.2s ease;
      }

      .data-table tr:hover {
        background-color: rgba(99, 102, 241, 0.05);
      }

      .data-table tr:nth-child(even) {
        background-color: #fafafa;
      }

      .data-table tr:nth-child(even):hover {
        background-color: rgba(99, 102, 241, 0.08);
      }

      /* Table Cells */
      .data-table td {
        padding: 1rem 0.75rem;
        border-bottom: 1px solid var(--border-color);
        font-size: 0.875rem;
        color: var(--text-primary);
      }

      .member-cell {
        color: var(--primary-color);
        font-weight: 600;
        font-size: 0.9rem;
        position: sticky;
        left: 0;
        z-index: 5;
        background-color: #f8fafc;
        box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
        min-width: 220px;
        max-width: 220px;
      }

      .data-table tr:hover .member-cell {
        background-color: rgba(99, 102, 241, 0.05);
      }

      .data-table tr:nth-child(even) .member-cell {
        background-color: #f1f5f9;
      }

      .data-table tr:nth-child(even):hover .member-cell {
        background-color: rgba(99, 102, 241, 0.08);
      }

      .amount-cell {
        text-align: right;
        font-family: 'Courier New', monospace;
        font-weight: 500;
      }

      .total-cell {
        background-color: rgba(16, 185, 129, 0.1);
        color: #059669;
        font-weight: 700;
        font-size: 0.9rem;
      }

      .data-table tr:nth-child(even) .total-cell {
        background-color: rgba(16, 185, 129, 0.15);
      }

      /* ===== NO DATA STATE ===== */
      .no-data {
        text-align: center;
        padding: 4rem 2rem;
        color: var(--text-secondary);
      }

      .no-data mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        opacity: 0.5;
        margin-bottom: 1rem;
      }

      .no-data h3 {
        margin: 0 0 0.5rem;
        color: var(--text-primary);
        font-size: 1.5rem;
        font-weight: 600;
      }

      .no-data p {
        margin: 0;
        font-size: 1rem;
      }

      /* ===== ERROR STATE ===== */
      .error-state {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 50vh;
        padding: 2rem;
      }

      .error-content {
        text-align: center;
        max-width: 500px;
        background: var(--card-bg);
        border-radius: 16px;
        padding: 3rem 2rem;
        box-shadow: var(--shadow-lg);
        border: 1px solid rgba(239, 68, 68, 0.2);
      }

      .error-content mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: var(--danger-color);
        margin-bottom: 1.5rem;
      }

      .error-content h2 {
        margin: 0 0 1rem;
        color: var(--text-primary);
        font-size: 1.5rem;
        font-weight: 600;
      }

      .error-content p {
        margin: 0 0 2rem;
        color: var(--text-secondary);
        line-height: 1.6;
      }

      .error-content button {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        min-height: 48px;
        padding: 0 2rem;
        border-radius: 8px;
        font-weight: 500;
      }

      /* ===== MOBILE RESPONSIVE ===== */
      @media (max-width: 480px) {
        .modern-header {
          padding: 1rem 1rem 1.5rem;
        }

        .modern-header::before {
          width: 300px;
          height: 300px;
          top: -30%;
          right: -20%;
        }

        .header-content {
          flex-direction: row;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .header-left {
          flex-direction: row;
          gap: 0.75rem;
          align-items: flex-start;
          flex: 1;
        }

        .icon-wrapper {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
        }

        .icon-wrapper mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
        }

        .title-group h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
        }

        .subtitle {
          font-size: 0.8rem;
          margin: 0.25rem 0 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
        }

        .refresh-btn {
          width: 40px;
          height: 40px;
        }

        .refresh-btn mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        .main-content {
          margin-top: -1.5rem;
          padding: 0 0.75rem;
        }

        .stats-grid {
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          padding: 0.85rem;
          gap: 0.5rem;
          animation-duration: 0.4s;
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
        }

        .stat-icon mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        .stat-info {
          flex: 1;
          min-width: 0;
        }

        .stat-label {
          font-size: 0.65rem;
          margin-bottom: 0.25rem;
        }

        .stat-value {
          font-size: 1.15rem;
          font-weight: 700;
        }

        .stat-value.small {
          font-size: 0.95rem;
        }

        .table-card {
          border-radius: 12px;
          animation-duration: 0.4s;
        }

        .table-card-header {
          padding: 1rem;
        }

        .table-title {
          gap: 0.75rem;
        }

        .table-title mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
        }

        .table-title h2 {
          font-size: 1.125rem;
        }

        .table-wrapper {
          max-height: 50vh;
        }

        .data-table {
          min-width: 500px;
          font-size: 0.8rem;
        }

        .data-table th,
        .data-table td {
          padding: 0.75rem 0.5rem;
        }

        .data-table th {
          font-size: 0.75rem;
        }

        .frozen-column,
        .member-cell {
          min-width: 140px;
          max-width: 140px;
          font-size: 0.75rem;
        }

        .amount-cell {
          font-size: 0.75rem;
        }

        .error-content {
          padding: 2rem 1.5rem;
          margin: 0 0.5rem;
        }

        .error-content mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          margin-bottom: 1rem;
        }

        .error-content h2 {
          font-size: 1.25rem;
        }

        .error-content button {
          min-height: 44px;
          padding: 0 1.5rem;
          font-size: 0.875rem;
        }
      }

      @media (max-width: 768px) {
        .modern-header {
          padding: 1.75rem 1.5rem 2.5rem;
        }

        .title-group h1 {
          font-size: 2rem;
        }

        .subtitle {
          font-size: 1rem;
        }

        .main-content {
          padding: 0 1.5rem;
        }

        .stats-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .stat-value {
          font-size: 1.75rem;
        }

        .table-card-header {
          padding: 1.25rem 1.5rem;
        }

        .table-title h2 {
          font-size: 1.375rem;
        }

        .data-table {
          min-width: 700px;
        }

        .frozen-column,
        .member-cell {
          min-width: 180px;
          max-width: 180px;
        }
      }

      @media (max-width: 1024px) {
        .stats-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `,
  ],
})
export class CourtUsageReportComponent implements OnInit, OnDestroy {
  reportData: CourtUsageData | null = null;
  loading = true;
  error: string | null = null;
  lastUpdated: string | null = null;
  autoRefreshEnabled = true;
  nextUpdateCountdown = 30;
  selectedFilterClubId: string = '';

  private apiUrl = environment.apiBaseUrl;
  private autoRefreshSubscription?: Subscription;
  private countdownSubscription?: Subscription;
  private readonly REFRESH_INTERVAL = 30000; // 30 seconds

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    // Initialize with current selected club
    const currentClub = this.authService.selectedClub;
    if (currentClub && currentClub.clubId) {
      this.selectedFilterClubId = currentClub.clubId;
    }

    this.loadCourtUsageData();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  loadCourtUsageData(): void {
    this.loading = true;
    this.error = null;

    // Log API URL for debugging
    const apiEndpoint = `${this.apiUrl}/api/reports/static-court-usage`;
    console.log('🔗 Court Usage API URL:', apiEndpoint);
    console.log('🌍 Environment:', environment.production ? 'production' : 'development');

    let headers = new HttpHeaders({
      Authorization: `Bearer ${this.authService.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    // If superadmin has selected a specific club, add X-Club-Id header
    if (this.selectedFilterClubId && this.isSuperAdminOrPlatformAdmin()) {
      headers = headers.set('X-Club-Id', this.selectedFilterClubId);
    }

    this.http
      .get<CourtUsageAPIResponse>(apiEndpoint, {
        headers,
        observe: 'response', // Get full response to see status codes
      })
      .subscribe({
        next: (httpResponse) => {
          const response = httpResponse.body;
          console.log('📊 Court Usage API Response:', httpResponse.status, response);

          if (response && response.success) {
            const isDataChanged = this.hasDataChanged(response.data);
            this.reportData = response.data;
            this.lastUpdated = response.metadata?.lastModified || response.data.summary.lastUpdated;

            if (isDataChanged && this.lastUpdated) {
              this.snackBar.open('📊 Recorded payments updated!', 'Close', {
                duration: 4000,
                panelClass: ['success-snack'],
              });
            }
          } else {
            this.error = response?.message || 'Failed to load court usage data';
            console.error('❌ API returned unsuccessful response:', response);
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error loading court usage data:', error);
          console.error('❌ Error status:', error.status);
          console.error('❌ Error message:', error.message);
          console.error('❌ Full error object:', JSON.stringify(error, null, 2));

          let errorMessage = 'Failed to load recorded payments data';
          if (error.status === 0) {
            errorMessage =
              'Network error: Unable to connect to server. Please check your internet connection and try again.';
          } else if (error.status === 401) {
            errorMessage = 'Authentication error: Please log in again';
            // Redirect to login if authentication fails
            this.authService.logout();
          } else if (error.status === 403) {
            errorMessage = 'Access denied: You do not have permission to view this report';
          } else if (error.status === 404) {
            errorMessage = 'API endpoint not found. Please contact support if this persists.';
          } else if (error.status === 500) {
            errorMessage =
              'Server error: There was a problem processing your request. Please try again later.';
          } else if (error.status >= 500) {
            errorMessage =
              'Server unavailable: The service is temporarily unavailable. Please try again later.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.name === 'TimeoutError') {
            errorMessage =
              'Request timeout: The server is taking too long to respond. Please try again.';
          }

          this.error = errorMessage;
          this.loading = false;
          this.snackBar.open(`Error: ${errorMessage}`, 'Close', {
            duration: 10000,
            panelClass: ['error-snack'],
          });
        },
      });
  }

  refreshData(): void {
    this.loadCourtUsageData();
  }

  getLastUpdated(): string {
    if (!this.reportData?.summary.lastUpdated) return '';
    const date = new Date(this.reportData.summary.lastUpdated);
    return date.toLocaleDateString();
  }

  trackByColumn(index: number, column: string): string {
    return column;
  }

  private hasDataChanged(newData: CourtUsageData): boolean {
    if (!this.reportData) return true;
    return JSON.stringify(this.reportData) !== JSON.stringify(newData);
  }

  private startAutoRefresh(): void {
    if (this.autoRefreshEnabled) {
      this.autoRefreshSubscription = interval(this.REFRESH_INTERVAL)
        .pipe(
          filter(() => this.autoRefreshEnabled),
          switchMap(() => {
            if (!this.loading) {
              return this.http.get<CourtUsageAPIResponse>(
                `${this.apiUrl}/api/reports/static-court-usage`,
                {
                  headers: new HttpHeaders({
                    Authorization: `Bearer ${this.authService.token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                  }),
                },
              );
            }
            return [];
          }),
        )
        .subscribe({
          next: (response: CourtUsageAPIResponse) => {
            if (response.success) {
              const isDataChanged = this.hasDataChanged(response.data);
              this.reportData = response.data;
              this.lastUpdated =
                response.metadata?.lastModified || response.data.summary.lastUpdated;

              if (isDataChanged) {
                console.log('🔄 Recorded payments data auto-updated');
                this.snackBar.open('📊 Data refreshed automatically', 'Close', {
                  duration: 2000,
                  panelClass: ['info-snack'],
                });
              }
            }
          },
          error: (error) => {
            console.error('Auto-refresh error:', error);
          },
        });

      this.startCountdown();
    }
  }

  private startCountdown(): void {
    this.nextUpdateCountdown = this.REFRESH_INTERVAL / 1000;
    this.countdownSubscription = interval(1000).subscribe(() => {
      if (this.nextUpdateCountdown > 0) {
        this.nextUpdateCountdown--;
      } else {
        this.nextUpdateCountdown = this.REFRESH_INTERVAL / 1000;
      }
    });
  }

  private stopAutoRefresh(): void {
    this.autoRefreshSubscription?.unsubscribe();
    this.countdownSubscription?.unsubscribe();
  }

  toggleAutoRefresh(): void {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;

    if (this.autoRefreshEnabled) {
      this.startAutoRefresh();
      this.snackBar.open('🔄 Auto-refresh enabled', 'Close', {
        duration: 2000,
        panelClass: ['success-snack'],
      });
    } else {
      this.stopAutoRefresh();
      this.snackBar.open('⏸️ Auto-refresh disabled', 'Close', {
        duration: 2000,
        panelClass: ['info-snack'],
      });
    }
  }

  getTimeAgo(dateString: string): string {
    const now = new Date().getTime();
    const updated = new Date(dateString).getTime();
    const diffSeconds = Math.floor((now - updated) / 1000);

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  }

  isSuperAdminOrPlatformAdmin(): boolean {
    return this.authService.isSuperAdmin() || this.authService.isPlatformAdmin();
  }

  onClubFilterChange(club: ClubOption | null): void {
    if (club) {
      this.selectedFilterClubId = club._id;
    } else {
      // If null (All Clubs), use current selected club
      const currentClub = this.authService.selectedClub;
      this.selectedFilterClubId = currentClub?.clubId || '';
    }

    // Reload data with new club filter
    this.loadCourtUsageData();
  }
}
