import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';

interface Rule {
  _id: string;
  clubId: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  order: number;
  isActive: boolean;
  details?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface ClubSettings {
  _id: string;
  clubId: string;
  operatingHours: {
    start: number;
    end: number;
  };
  pricing: {
    peakHourFee: number;
    offPeakHourFee: number;
    guestFee: number;
    peakHours: number[];
  };
  membershipFee: {
    annual: number;
    currency: string;
  };
  initialCreditBalance: number;
}

@Component({
  selector: 'app-rules-and-regulations',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="rules-container">
      <div class="header-section">
        <button mat-icon-button (click)="goBack()" class="back-button">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1 class="page-title">
          <mat-icon class="title-icon">gavel</mat-icon>
          Rules and Regulations
        </h1>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <mat-spinner diameter="50"></mat-spinner>
        <p>Loading club rules...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-container">
        <mat-icon class="error-icon">error_outline</mat-icon>
        <p>{{ error }}</p>
        <button mat-raised-button color="primary" (click)="loadRules()">
          <mat-icon>refresh</mat-icon>
          Try Again
        </button>
      </div>

      <!-- Rules Content -->
      <div *ngIf="!loading && !error && rules.length > 0" class="rules-content">
        <mat-card class="rules-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="section-icon">sports_tennis</mat-icon>
            <mat-card-title>{{ clubName }}</mat-card-title>
            <mat-card-subtitle>Court Usage and General Rules</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="rules-section">
              <div *ngFor="let rule of rules" class="rule-item">
                <mat-icon class="rule-icon">{{ rule.icon }}</mat-icon>
                <div class="rule-content">
                  <h3>{{ rule.title }}</h3>
                  <p>{{ rule.description }}</p>
                  <ul *ngIf="rule.details && rule.details.length > 0" class="rule-details">
                    <li *ngFor="let detail of rule.details">{{ detail }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && !error && rules.length === 0" class="empty-container">
        <mat-icon class="empty-icon">info</mat-icon>
        <p>No rules currently available. Please contact club management.</p>
      </div>

      <!-- Footer -->
      <div class="footer-section">
        <p class="footer-text">
          <mat-icon>info</mat-icon>
          These rules are subject to updates and amendments by club management. Members will be
          notified of any changes through official communications.
        </p>
        <button mat-raised-button color="primary" (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
          Back to Dashboard
        </button>
      </div>
    </div>
  `,
  styleUrl: './rules-and-regulations.component.scss',
})
export class RulesAndRegulationsComponent implements OnInit, OnDestroy {
  private apiUrl = environment.apiUrl;
  private subscription = new Subscription();

  rules: Rule[] = [];
  clubSettings: ClubSettings | null = null;
  clubName = 'Club';
  loading = true;
  error: string | null = null;

  constructor(
    private router: Router,
    private http: HttpClient,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.loadRulesAndSettings();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadRulesAndSettings(): void {
    this.loading = true;
    this.error = null;

    // Fetch both rules and settings in parallel
    this.subscription.add(
      forkJoin({
        rules: this.http.get<any>(`${this.apiUrl}/rules`),
        settings: this.http.get<any>(`${this.apiUrl}/club-settings`),
      }).subscribe({
        next: (response) => {
          // Load rules
          if (response.rules.success && response.rules.data) {
            this.rules = response.rules.data.sort((a: Rule, b: Rule) => a.order - b.order);
            // Set club name from response
            if (response.rules.clubName) {
              this.clubName = response.rules.clubName;
            }
          } else {
            this.error = 'Failed to load rules';
            this.loading = false;
            return;
          }

          // Load settings
          if (response.settings.success && response.settings.data) {
            this.clubSettings = response.settings.data;
            // Replace dynamic values in rules with actual settings
            this.injectDynamicValues();
          }

          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading rules or settings:', error);
          this.error = 'Failed to load rules. Please try again.';
          this.loading = false;
        },
      }),
    );
  }

  /**
   * Replace placeholder values in rules with actual settings from database
   */
  private injectDynamicValues(): void {
    if (!this.clubSettings) return;

    const settings = this.clubSettings;
    const peak = settings.pricing.peakHourFee;
    const nonPeak = settings.pricing.offPeakHourFee;
    const guest = settings.pricing.guestFee;
    const peakHours = settings.pricing.peakHours;
    const startHour = settings.operatingHours.start;
    const endHour = settings.operatingHours.end;

    // Format peak hours for display (e.g., "5AM, 6PM, 7PM, 8PM, 9PM")
    const peakHoursStr = peakHours
      .map((h) => (h === 0 ? '12AM' : h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`))
      .join(', ');

    this.rules = this.rules.map((rule) => {
      let updatedDescription = rule.description;
      let updatedDetails = rule.details ? [...rule.details] : [];

      // Replace placeholders in description
      updatedDescription = updatedDescription
        .replace(/\{peakHourFee\}/g, peak.toString())
        .replace(/\{nonPeakHourFee\}/g, nonPeak.toString())
        .replace(/\{guestFee\}/g, guest.toString())
        .replace(/\{peakHours\}/g, peakHoursStr)
        .replace(/\{operatingHoursStart\}/g, startHour.toString())
        .replace(/\{operatingHoursEnd\}/g, endHour.toString());

      // Replace placeholders in details array
      updatedDetails = updatedDetails.map((detail) =>
        detail
          .replace(/\{peakHourFee\}/g, peak.toString())
          .replace(/\{nonPeakHourFee\}/g, nonPeak.toString())
          .replace(/\{guestFee\}/g, guest.toString())
          .replace(/\{peakHours\}/g, peakHoursStr)
          .replace(/\{operatingHoursStart\}/g, startHour.toString())
          .replace(/\{operatingHoursEnd\}/g, endHour.toString()),
      );

      return {
        ...rule,
        description: updatedDescription,
        details: updatedDetails,
      };
    });
  }

  loadRules(): void {
    this.loadRulesAndSettings();
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
