import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { AnalyticsService } from '../../services/analytics.service';
import { ActivityMonitorService } from '../../services/activity-monitor.service';
import { WebSocketService, OpenPlayNotificationEvent } from '../../services/websocket.service';
import { NotificationService } from '../../services/notification.service';
import { PWANotificationService } from '../../services/pwa-notification.service';
import { OpenPlayNotificationModalComponent } from '../open-play-notification-modal/open-play-notification-modal.component';
import { TennisBallMachineDialogComponent } from '../tennis-ball-machine-dialog/tennis-ball-machine-dialog.component';
import { ModalManagerService } from '../../services/modal-manager.service';
import { CourtStatusWidgetComponent } from '../court-status-widget/court-status-widget.component';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatGridListModule,
    MatBadgeModule,
    MatDialogModule,
    CourtStatusWidgetComponent
  ],
  template: `
    <div class="dashboard-container">
      <!-- Action Cards Grid -->
      <div class="dashboard-content">

        <!-- Court Status Widget -->
        <app-court-status-widget></app-court-status-widget>

        <div class="action-grid">
          <!-- Reserve Court -->
          <mat-card class="action-card primary-action" data-icon="calendar_today" data-title="Reserve Court" 
                   (click)="testNavigation()" 
                   (touchstart)="handleTouchStart($event)"
                   (touchend)="handleTouchEnd($event, 'testNavigation')">
            <!-- Mobile Icon -->
            <div class="mobile-card-icon">
              <mat-icon>calendar_today</mat-icon>
            </div>
            <div class="mobile-card-title">Reserve Court</div>
            
            <!-- Desktop Content -->
            <mat-card-header>
              <mat-icon mat-card-avatar class="action-icon">calendar_today</mat-icon>
              <mat-card-title>Reserve Court</mat-card-title>
              <mat-card-subtitle>Book your next tennis session</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Schedule your court time and invite other players.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button class="primary-btn" (click)="testNavigation()">
                <mat-icon>calendar_today</mat-icon>
                Book Now
              </button>
            </mat-card-actions>
          </mat-card>

          <!-- My Reservations -->
          <mat-card class="action-card" data-icon="event" data-title="My Reservations" 
                   (click)="navigateTo('/my-reservations')" 
                   (touchstart)="handleTouchStart($event)"
                   (touchend)="handleTouchEnd($event, '/my-reservations')">
            <!-- Mobile Icon -->
            <div class="mobile-card-icon">
              <mat-icon>event</mat-icon>
            </div>
            <div class="mobile-card-title">My Reservations</div>
            
            <!-- Desktop Content -->
            <mat-card-header>
              <mat-icon mat-card-avatar class="action-icon">event</mat-icon>
              <mat-card-title>My Reservations</mat-card-title>
              <mat-card-subtitle>View and manage your bookings</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Check upcoming games and payment status.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button class="info-btn" (click)="navigateTo('/my-reservations')">
                <mat-icon>event</mat-icon>
                View All Bookings
              </button>
            </mat-card-actions>
          </mat-card>

          <!-- Payments -->
          <mat-card class="action-card" data-icon="payment" data-title="Payments" 
                   (click)="navigateTo('/payments')" 
                   (touchstart)="handleTouchStart($event)"
                   (touchend)="handleTouchEnd($event, '/payments')">
            <!-- Mobile Icon -->
            <div class="mobile-card-icon">
              <mat-icon>payment</mat-icon>
            </div>
            <div class="mobile-card-title">Payments</div>
            
            <!-- Desktop Content -->
            <mat-card-header>
              <mat-icon mat-card-avatar class="action-icon">payment</mat-icon>
              <mat-card-title>Payments</mat-card-title>
              <mat-card-subtitle>Manage your payments</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>View payment history and manage your transactions.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button class="primary-btn" (click)="navigateTo('/payments')">
                <mat-icon>payment</mat-icon>
                Manage Payments
              </button>
            </mat-card-actions>
          </mat-card>

          <!-- Weather Info -->
          <mat-card class="action-card" data-icon="wb_sunny" data-title="Weather Forecast" 
                   (click)="navigateTo('/weather')" 
                   (touchstart)="handleTouchStart($event)"
                   (touchend)="handleTouchEnd($event, '/weather')">
            <!-- Mobile Icon -->
            <div class="mobile-card-icon">
              <mat-icon>wb_sunny</mat-icon>
            </div>
            <div class="mobile-card-title">Weather Forecast</div>
            
            <!-- Desktop Content -->
            <mat-card-header>
              <mat-icon mat-card-avatar class="action-icon">wb_sunny</mat-icon>
              <mat-card-title>Weather Forecast</mat-card-title>
              <mat-card-subtitle>Plan your games accordingly</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Check weather conditions for your court time.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button class="warning-btn" (click)="navigateTo('/weather')">
                <mat-icon>wb_sunny</mat-icon>
                Check Weather
              </button>
            </mat-card-actions>
          </mat-card>

          <!-- Member Directory -->
          <mat-card class="action-card" data-icon="people" data-title="Member Directory" 
                   (click)="navigateTo('/members')" 
                   (touchstart)="handleTouchStart($event)"
                   (touchend)="handleTouchEnd($event, '/members')">
            <!-- Mobile Icon -->
            <div class="mobile-card-icon">
              <mat-icon>people</mat-icon>
            </div>
            <div class="mobile-card-title">Member Directory</div>
            
            <!-- Desktop Content -->
            <mat-card-header>
              <mat-icon mat-card-avatar class="action-icon">people</mat-icon>
              <mat-card-title>Member Directory</mat-card-title>
              <mat-card-subtitle>Connect with other players</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Find and connect with fellow tennis players.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button class="success-btn" (click)="navigateTo('/members')">
                <mat-icon>people</mat-icon>
                Browse Members
              </button>
            </mat-card-actions>
          </mat-card>

          <!-- Suggestions & Complaints -->
          <mat-card class="action-card" data-icon="feedback" data-title="Feedback" 
                   (click)="navigateTo('/suggestions')" 
                   (touchstart)="handleTouchStart($event)"
                   (touchend)="handleTouchEnd($event, '/suggestions')">
            <!-- Mobile Icon -->
            <div class="mobile-card-icon">
              <mat-icon>feedback</mat-icon>
            </div>
            <div class="mobile-card-title">Feedback</div>
            
            <!-- Desktop Content -->
            <mat-card-header>
              <mat-icon mat-card-avatar class="action-icon">feedback</mat-icon>
              <mat-card-title>Feedback</mat-card-title>
              <mat-card-subtitle>Share suggestions or report issues</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Help us improve by sharing your feedback with the management.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button class="accent-btn" (click)="navigateTo('/suggestions')">
                <mat-icon>comment</mat-icon>
                Submit Feedback
              </button>
            </mat-card-actions>
          </mat-card>

          <!-- Rules & Regulations -->
          <mat-card class="action-card" data-icon="gavel" data-title="Rules & Regulations" 
                   (click)="navigateTo('/rules')" 
                   (touchstart)="handleTouchStart($event)"
                   (touchend)="handleTouchEnd($event, '/rules')">
            <!-- Mobile Icon -->
            <div class="mobile-card-icon">
              <mat-icon>gavel</mat-icon>
            </div>
            <div class="mobile-card-title">Rules & Regulations</div>
            
            <!-- Desktop Content -->
            <mat-card-header>
              <mat-icon mat-card-avatar class="action-icon">gavel</mat-icon>
              <mat-card-title>Rules & Regulations</mat-card-title>
              <mat-card-subtitle>Club guidelines and policies</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Review club rules and court usage policies.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button class="info-btn" (click)="navigateTo('/rules')">
                <mat-icon>description</mat-icon>
                View Rules
              </button>
            </mat-card-actions>
          </mat-card>

          <!-- Court Usage Report -->
          <mat-card class="action-card" data-icon="analytics" data-title="Court Usage Report"
                   (click)="navigateTo('/court-usage-report')"
                   (touchstart)="handleTouchStart($event)"
                   (touchend)="handleTouchEnd($event, '/court-usage-report')">
            <!-- Mobile Icon -->
            <div class="mobile-card-icon">
              <mat-icon>analytics</mat-icon>
            </div>
            <div class="mobile-card-title">Court Usage Report</div>

            <!-- Desktop Content -->
            <mat-card-header>
              <mat-icon mat-card-avatar class="action-icon">analytics</mat-icon>
              <mat-card-title>Court Usage Report</mat-card-title>
              <mat-card-subtitle>View member court usage statistics</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Access detailed court usage statistics and member activity reports.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button class="info-btn" (click)="navigateTo('/court-usage-report')">
                <mat-icon>analytics</mat-icon>
                View Report
              </button>
            </mat-card-actions>
          </mat-card>

        </div>

        <!-- Financial Management Section -->
        <div class="financial-section" *ngIf="hasFinancialAccess">
          <h2 class="section-title financial-title">
            <mat-icon>account_balance</mat-icon>
            Financial Management
          </h2>

          <div class="financial-grid">
            <!-- Reports & Analytics -->
            <mat-card class="action-card financial-card" data-icon="analytics" data-title="Reports & Analytics" (click)="navigateTo('/admin/reports')">
              <!-- Mobile Icon -->
              <div class="mobile-card-icon">
                <mat-icon>analytics</mat-icon>
              </div>
              <div class="mobile-card-title">Reports & Analytics</div>

              <!-- Desktop Content -->
              <mat-card-header>
                <mat-icon mat-card-avatar class="action-icon financial-icon">analytics</mat-icon>
                <mat-card-title>Reports & Analytics</mat-card-title>
                <mat-card-subtitle>View system reports</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Generate reports and view system analytics.</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button class="financial-btn" (click)="navigateTo('/admin/reports')">
                  <mat-icon>analytics</mat-icon>
                  View Reports
                </button>
              </mat-card-actions>
            </mat-card>

            <!-- Membership Payments -->
            <mat-card class="action-card financial-card" data-icon="card_membership" data-title="Membership Payments" (click)="navigateTo('/admin/membership-payments')">
              <!-- Mobile Icon -->
              <div class="mobile-card-icon">
                <mat-icon>card_membership</mat-icon>
              </div>
              <div class="mobile-card-title">Membership Payments</div>

              <!-- Desktop Content -->
              <mat-card-header>
                <mat-icon mat-card-avatar class="action-icon financial-icon">card_membership</mat-icon>
                <mat-card-title>Membership Payments</mat-card-title>
                <mat-card-subtitle>Record annual membership fees</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Record and track annual membership fee payments for club members.</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button class="financial-btn" (click)="navigateTo('/admin/membership-payments')">
                  <mat-icon>card_membership</mat-icon>
                  Manage Fees
                </button>
              </mat-card-actions>
            </mat-card>

            <!-- Financial Report -->
            <mat-card class="action-card financial-card" data-icon="account_balance" data-title="Financial Report" (click)="navigateTo('/admin/financial-report')">
              <!-- Mobile Icon -->
              <div class="mobile-card-icon">
                <mat-icon>account_balance</mat-icon>
              </div>
              <div class="mobile-card-title">Financial Report</div>

              <!-- Desktop Content -->
              <mat-card-header>
                <mat-icon mat-card-avatar class="action-icon financial-icon">account_balance</mat-icon>
                <mat-card-title>Financial Report</mat-card-title>
                <mat-card-subtitle>View club financial statements</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Access detailed financial reports and revenue analysis.</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button class="financial-btn" (click)="navigateTo('/admin/financial-report')">
                  <mat-icon>account_balance</mat-icon>
                  View Report
                </button>
              </mat-card-actions>
            </mat-card>
          </div>
        </div>

        <!-- Admin Section -->
        <div class="admin-section" *ngIf="isAdmin">
          <h2 class="section-title admin-title">
            <mat-icon>admin_panel_settings</mat-icon>
            Administration
          </h2>

          <div class="admin-grid">
            <!-- Member Management -->
            <mat-card class="action-card admin-card" data-icon="people_alt" data-title="Member Management" (click)="navigateTo('/admin/members')">
              <!-- Mobile Icon -->
              <div class="mobile-card-icon">
                <mat-icon>people_alt</mat-icon>
              </div>
              <div class="mobile-card-title">Member Management</div>
              
              <!-- Desktop Content -->
              <mat-card-header>
                <mat-icon mat-card-avatar class="action-icon admin-icon">people_alt</mat-icon>
                <mat-card-title>Member Management</mat-card-title>
                <mat-card-subtitle>Manage club members</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Approve registrations and manage member accounts.</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button class="admin-btn" (click)="navigateTo('/admin/members')">
                  <mat-icon>people_alt</mat-icon>
                  Manage Members
                </button>
              </mat-card-actions>
            </mat-card>

            <!-- Payment Management -->
            <mat-card class="action-card admin-card" data-icon="payment" data-title="Payment Management" (click)="navigateTo('/admin/payments')">
              <!-- Mobile Icon -->
              <div class="mobile-card-icon">
                <mat-icon>payment</mat-icon>
              </div>
              <div class="mobile-card-title">Payment Management</div>

              <!-- Desktop Content -->
              <mat-card-header>
                <mat-icon mat-card-avatar class="action-icon admin-icon">payment</mat-icon>
                <mat-card-title>Payment Management</mat-card-title>
                <mat-card-subtitle>Manage all payment records</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Edit payment details, update status, and manage court usage and membership payments.</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button class="admin-btn" (click)="navigateTo('/admin/payments')">
                  <mat-icon>payment</mat-icon>
                  Manage Payments
                </button>
              </mat-card-actions>
            </mat-card>

            <!-- Block Court -->
            <mat-card class="action-card admin-card" data-icon="block" data-title="Block Court" (click)="navigateTo('/admin/block-court')">
              <!-- Mobile Icon -->
              <div class="mobile-card-icon">
                <mat-icon>block</mat-icon>
              </div>
              <div class="mobile-card-title">Block Court</div>

              <!-- Desktop Content -->
              <mat-card-header>
                <mat-icon mat-card-avatar class="action-icon admin-icon">block</mat-icon>
                <mat-card-title>Block Court</mat-card-title>
                <mat-card-subtitle>Block time slots for maintenance</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Mark court time slots as unavailable for maintenance, events, or weather.</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button class="admin-btn" (click)="navigateTo('/admin/block-court')">
                  <mat-icon>block</mat-icon>
                  Block Court
                </button>
              </mat-card-actions>
            </mat-card>

            <!-- Club Settings -->
            <mat-card class="action-card admin-card" data-icon="tune" data-title="Club Settings" (click)="navigateTo('/admin/club-settings')">
              <!-- Mobile Icon -->
              <div class="mobile-card-icon">
                <mat-icon>tune</mat-icon>
              </div>
              <div class="mobile-card-title">Club Settings</div>

              <!-- Desktop Content -->
              <mat-card-header>
                <mat-icon mat-card-avatar class="action-icon admin-icon">tune</mat-icon>
                <mat-card-title>Club Settings</mat-card-title>
                <mat-card-subtitle>Configure court and pricing</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Manage operating hours, court fees, and club configuration.</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button class="admin-btn" (click)="navigateTo('/admin/club-settings')">
                  <mat-icon>tune</mat-icon>
                  Configure Club
                </button>
              </mat-card-actions>
            </mat-card>

            <!-- Suggestions Management -->
            <mat-card class="action-card admin-card" data-icon="feedback" data-title="Feedback Management" (click)="navigateTo('/admin/suggestions')">
              <!-- Mobile Icon -->
              <div class="mobile-card-icon">
                <mat-icon [matBadge]="unreadFeedbackCount" [matBadgeHidden]="unreadFeedbackCount === 0" matBadgeColor="warn" matBadgeSize="small">feedback</mat-icon>
              </div>
              <div class="mobile-card-title">Feedback Management</div>

              <!-- Desktop Content -->
              <mat-card-header>
                <mat-icon mat-card-avatar class="action-icon admin-icon" [matBadge]="unreadFeedbackCount" [matBadgeHidden]="unreadFeedbackCount === 0" matBadgeColor="warn">feedback</mat-icon>
                <mat-card-title>Feedback Management</mat-card-title>
                <mat-card-subtitle>Manage member feedback</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Review and respond to member suggestions and complaints.</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button class="admin-btn" (click)="navigateTo('/admin/suggestions')">
                  <mat-icon>feedback</mat-icon>
                  Manage Feedback
                </button>
              </mat-card-actions>
            </mat-card>

            <!-- Announcements (Superadmin Only) -->
            <mat-card class="action-card admin-card superadmin-card" data-icon="campaign" data-title="Announcements" (click)="navigateTo('/admin/announcements')" *ngIf="isSuperAdmin">
              <!-- Mobile Icon -->
              <div class="mobile-card-icon">
                <mat-icon>campaign</mat-icon>
              </div>
              <div class="mobile-card-title">Announcements</div>

              <!-- Desktop Content -->
              <mat-card-header>
                <mat-icon mat-card-avatar class="action-icon admin-icon">campaign</mat-icon>
                <mat-card-title>Announcements</mat-card-title>
                <mat-card-subtitle>Create system-wide announcements</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Send real-time announcements that pop up on all users' screens.</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button class="admin-btn" (click)="navigateTo('/admin/announcements')">
                  <mat-icon>campaign</mat-icon>
                  Manage Announcements
                </button>
              </mat-card-actions>
            </mat-card>

            <!-- Manual Court Usage (Superadmin Only) -->
            <mat-card class="action-card admin-card superadmin-card" data-icon="edit_calendar" data-title="Manual Court Usage" (click)="navigateTo('/admin/manual-court-usage')" *ngIf="isAdmin">
              <!-- Mobile Icon -->
              <div class="mobile-card-icon">
                <mat-icon>edit_calendar</mat-icon>
              </div>
              <div class="mobile-card-title">Manual Court Usage</div>

              <!-- Desktop Content -->
              <mat-card-header>
                <mat-icon mat-card-avatar class="action-icon admin-icon">edit_calendar</mat-icon>
                <mat-card-title>Manual Court Usage</mat-card-title>
                <mat-card-subtitle>Record court usage manually</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Manually create court usage records and pending payments for players.</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button class="admin-btn" (click)="navigateTo('/admin/manual-court-usage')">
                  <mat-icon>edit_calendar</mat-icon>
                  Record Usage
                </button>
              </mat-card-actions>
            </mat-card>

          </div>
        </div>

        <!-- Platform Administration Section (Superadmin Only) -->
        <div class="platform-admin-section" *ngIf="isSuperAdmin">
          <h2 class="section-title platform-admin-title">
            <mat-icon>verified_user</mat-icon>
            Platform Administration
          </h2>

          <div class="platform-admin-grid">
            <!-- Club Management -->
            <mat-card class="action-card platform-admin-card" data-icon="business" data-title="Club Management" (click)="navigateTo('/admin/clubs')">
              <!-- Mobile Icon -->
              <div class="mobile-card-icon">
                <mat-icon>business</mat-icon>
              </div>
              <div class="mobile-card-title">Club Management</div>

              <!-- Desktop Content -->
              <mat-card-header>
                <mat-icon mat-card-avatar class="action-icon platform-admin-icon">business</mat-icon>
                <mat-card-title>Club Management</mat-card-title>
                <mat-card-subtitle>Manage all clubs and admins</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Create clubs, assign club admins, and manage multi-tenant platform.</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button class="platform-admin-btn" (click)="navigateTo('/admin/clubs')">
                  <mat-icon>business</mat-icon>
                  Manage Clubs
                </button>
              </mat-card-actions>
            </mat-card>

            <!-- Platform Overview -->
            <mat-card class="action-card platform-admin-card" data-icon="account_tree" data-title="Platform Overview" (click)="navigateTo('/admin/platform-overview')">
              <!-- Mobile Icon -->
              <div class="mobile-card-icon">
                <mat-icon>account_tree</mat-icon>
              </div>
              <div class="mobile-card-title">Platform Overview</div>

              <!-- Desktop Content -->
              <mat-card-header>
                <mat-icon mat-card-avatar class="action-icon platform-admin-icon">account_tree</mat-icon>
                <mat-card-title>Platform Overview</mat-card-title>
                <mat-card-subtitle>View all clubs, admins, and members</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Complete overview of all clubs with their administrators and member lists.</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button class="platform-admin-btn" (click)="navigateTo('/admin/platform-overview')">
                  <mat-icon>account_tree</mat-icon>
                  View Overview
                </button>
              </mat-card-actions>
            </mat-card>

            <!-- Site Analytics -->
            <mat-card class="action-card platform-admin-card" data-icon="analytics" data-title="Site Analytics" (click)="navigateTo('/admin/analytics')">
              <!-- Mobile Icon -->
              <div class="mobile-card-icon">
                <mat-icon>analytics</mat-icon>
              </div>
              <div class="mobile-card-title">Site Analytics</div>

              <!-- Desktop Content -->
              <mat-card-header>
                <mat-icon mat-card-avatar class="action-icon platform-admin-icon">analytics</mat-icon>
                <mat-card-title>Site Analytics</mat-card-title>
                <mat-card-subtitle>Platform-wide usage statistics by club</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>Monitor page views, user activity, and engagement metrics across all clubs.</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button class="platform-admin-btn" (click)="navigateTo('/admin/analytics')">
                  <mat-icon>analytics</mat-icon>
                  View Analytics
                </button>
              </mat-card-actions>
            </mat-card>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isAdmin = false;
  isSuperAdmin = false;
  isTreasurer = false;
  hasFinancialAccess = false;
  private apiUrl = environment.apiUrl;
  private subscriptions: Subscription[] = [];
  unreadFeedbackCount: number = 0;
  private feedbackCountInterval: any;

  constructor(
    public authService: AuthService,
    private analyticsService: AnalyticsService,
    private activityMonitorService: ActivityMonitorService,
    public router: Router,
    private dialog: MatDialog,
    private http: HttpClient,
    private webSocketService: WebSocketService,
    private notificationService: NotificationService,
    private pwaNotificationService: PWANotificationService,
    private modalManagerService: ModalManagerService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.isAdmin = this.authService.isAdmin();
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.isTreasurer = this.authService.isTreasurer();
    this.hasFinancialAccess = this.authService.hasFinancialAccess();

    // Subscribe to user changes
    const userSub = this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      this.isAdmin = this.authService.isAdmin();
      this.isSuperAdmin = this.authService.isSuperAdmin();
      this.isTreasurer = this.authService.isTreasurer();
      this.hasFinancialAccess = this.authService.hasFinancialAccess();
    });
    this.subscriptions.push(userSub);

    // Fetch unread feedback count for admins
    if (this.isAdmin) {
      this.fetchUnreadFeedbackCount();
      // Refresh count every 30 seconds
      this.feedbackCountInterval = setInterval(() => {
        this.fetchUnreadFeedbackCount();
      }, 30000);
    }

    // Set up WebSocket listeners for real-time open play notifications
    this.setupWebSocketListeners();

    // Check for any pending PWA notifications that were clicked while app was closed
    this.pwaNotificationService.checkAndShowPendingNotification();
  }

  private fetchUnreadFeedbackCount(): void {
    // Only fetch if a club is selected
    if (!this.authService.selectedClub) {
      this.unreadFeedbackCount = 0;
      return;
    }

    this.http.get<any>(`${this.apiUrl}/suggestions/unread-count`).subscribe({
      next: (response) => {
        if (response && response.success && response.data) {
          this.unreadFeedbackCount = response.data.count || 0;
        }
      },
      error: (error) => {
        console.error('Error fetching unread feedback count:', error);
        this.unreadFeedbackCount = 0;
      }
    });
  }

  testNavigation(): void {
    console.log('📱 Dashboard: Test navigation triggered');
    this.navigateTo('/reservations');
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  // Touch event handlers for mobile devices
  private touchStartTime = 0;
  
  handleTouchStart(event: TouchEvent): void {
    console.log('📱 Touch start detected');
    this.touchStartTime = Date.now();
    event.preventDefault();
  }
  
  handleTouchEnd(event: TouchEvent, action: string): void {
    console.log('📱 Touch end detected, action:', action);
    const touchDuration = Date.now() - this.touchStartTime;

    // Only trigger if it's a quick tap (less than 200ms for more responsive feel)
    if (touchDuration < 200) {
      event.preventDefault();
      event.stopPropagation();

      if (action === 'testNavigation') {
        this.testNavigation();
      } else if (action === 'ball-machine') {
        this.openTennisBallMachineDialog();
      } else {
        this.navigateTo(action);
      }
    }
  }


  /**
   * Opens the Tennis Ball Machine rental dialog
   */
  openTennisBallMachineDialog(): void {
    this.analyticsService.trackUserActivity('click_button', 'dashboard', {
      button: 'ball_machine_card',
      action: 'view_details'
    });

    // Emit real-time activity for admin monitoring
    this.activityMonitorService.emitUserActivity(
      'View Ball Machine Details',
      'Dashboard',
      { cardType: 'ball_machine_rental' }
    );

    this.dialog.open(TennisBallMachineDialogComponent, {
      width: '500px',
      maxWidth: '90vw',
      maxHeight: '85vh',
      panelClass: 'ball-machine-dialog-container',
      autoFocus: true
    });
  }

  /**
   * Set up WebSocket listeners for real-time notifications
   */
  private setupWebSocketListeners(): void {
    console.log('🎾 Dashboard: Setting up WebSocket listeners');

    // Listen for open play notifications
    const openPlaySub = this.webSocketService.openPlayNotifications$.subscribe(
      (notification: OpenPlayNotificationEvent) => {
        console.log('🎾 Dashboard: Received open play notification:', notification);
        this.handleOpenPlayNotification(notification);
      }
    );
    this.subscriptions.push(openPlaySub);

    // Listen for WebSocket connection status
    const connectionSub = this.webSocketService.isConnected$.subscribe(
      (connected: boolean) => {
        console.log('🔌 Dashboard: WebSocket connection status:', connected ? 'Connected' : 'Disconnected');
      }
    );
    this.subscriptions.push(connectionSub);
  }

  /**
   * Handle incoming open play notifications and show auto-modal
   */
  private handleOpenPlayNotification(notification: OpenPlayNotificationEvent): void {
    console.log('🎾 Dashboard: Handling open play notification');
    console.log('🎾 Dashboard: Notification data:', notification);
    console.log('🎾 Dashboard: startTime:', notification.data.startTime, 'endTime:', notification.data.endTime);
    
    // Only show modal for new open play events
    if (notification.type === 'open_play_created') {
      console.log('🎾 Dashboard: Showing auto-modal for new open play event');
      
      // Convert WebSocket notification to the format expected by the modal
      const modalNotification = {
        id: notification.data.pollId,
        type: 'open_play_new' as const,
        title: 'New Open Play Event!',
        message: `${notification.data.title} - Vote to join!`,
        eventDate: new Date(notification.data.eventDate),
        startTime: notification.data.startTime,
        endTime: notification.data.endTime,
        confirmedPlayers: notification.data.confirmedPlayers,
        maxPlayers: notification.data.maxPlayers,
        pollId: notification.data.pollId,
        hasVoted: false
      };

      // Show the modal automatically using the modal manager
      const dialogRef = this.modalManagerService.showOpenPlayModal(
        { notifications: [modalNotification] },
        { panelClass: ['open-play-modal', 'auto-triggered'] }
      );

      // Handle modal result if modal was actually opened
      if (dialogRef) {
        dialogRef.afterClosed().subscribe(result => {
          console.log('🎾 Dashboard: Auto-modal closed with result:', result);
          if (result === 'navigate-polls') {
            console.log('🎾 Dashboard: Navigating to polls page');
            this.navigateTo('/polls');
          }
        });
      }

      // Refresh notifications to keep them in sync
      this.notificationService.refreshNotifications();
    }
  }

  ngOnDestroy(): void {
    // Clean up all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    // Clear feedback count interval
    if (this.feedbackCountInterval) {
      clearInterval(this.feedbackCountInterval);
    }
  }
}