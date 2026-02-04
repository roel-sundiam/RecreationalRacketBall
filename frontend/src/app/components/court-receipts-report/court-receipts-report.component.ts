import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormControl, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { CreditService, CreditTransaction } from '../../services/credit.service';
import {
  PaymentConfirmationDialogComponent,
  PaymentConfirmationData,
} from '../payment-confirmation-dialog/payment-confirmation-dialog.component';
import {
  UnrecordConfirmationDialogComponent,
  UnrecordDialogData,
} from '../unrecord-confirmation-dialog/unrecord-confirmation-dialog.component';
import {
  EditPaymentAmountDialogComponent,
  EditPaymentAmountData,
} from '../edit-payment-amount-dialog/edit-payment-amount-dialog.component';
import { environment } from '../../../environments/environment';

interface PaymentRecord {
  _id: string;
  paymentDate?: string;
  referenceNumber: string;
  amount: number;
  serviceFee?: number;
  courtRevenue?: number;
  paymentMethod: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'record';
  memberName: string;
  memberUsername: string;
  reservationDate: string;
  timeSlot: number;
  timeSlotDisplay: string;
  players: string[];
  isPeakHour: boolean;
  approvedBy?: string;
  approvedAt?: string;
  recordedBy?: string;
  recordedAt?: string;
  userId: {
    _id: string;
    username: string;
    fullName: string;
  };
  // Open Play Event data
  pollId?: {
    _id: string;
    title: string;
    openPlayEvent?: {
      eventDate: Date;
      startTime: number;
      endTime: number;
      confirmedPlayers: Array<{
        _id: string;
        username: string;
        fullName: string;
      }>;
    };
  };
  isOpenPlayEvent: boolean;
  openPlayParticipants: string[];
}

interface PaymentsReportData {
  payments: PaymentRecord[];
  summary: {
    totalPayments: number;
    totalAmount: number;
    pendingPayments: number;
    completedPayments: number;
    recordedPayments: number;
    totalServiceFees: number;
    totalCourtRevenue: number;
  };
  paymentMethodBreakdown: Array<{
    paymentMethod: string;
    count: number;
    totalAmount: number;
  }>;
  period: {
    startDate: string;
    endDate: string;
  };
}

@Component({
  selector: 'app-court-receipts-report',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatDividerModule,
    MatDialogModule,
    MatTabsModule,
    MatTooltipModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  template: `
    <div class="report-container">
      <!-- Modern Header with Gradient -->
      <div class="modern-header">
        <div class="header-background"></div>
        <div class="header-content">
          <button
            mat-icon-button
            (click)="goBack()"
            class="back-btn"
            matTooltip="Back to Dashboard"
          >
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="header-text">
            <h1 class="page-title">
              <mat-icon class="title-icon">receipt_long</mat-icon>
              Payment Reports & Management
            </h1>
            <p class="page-subtitle">Track, approve, and record all payment transactions</p>
          </div>
          <div class="header-stats-badge">
            <span class="stat-badge total-stat" *ngIf="reportData">
              <mat-icon>payments</mat-icon>
              <span>₱{{ reportData.summary.totalAmount.toFixed(0) }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Filter Section with Modern Design -->
      <div class="filter-section">
        <mat-card class="filter-card modern-card">
          <mat-card-content>
            <form [formGroup]="dateRangeForm" class="filter-form">
              <div class="filter-header">
                <div class="filter-title">
                  <mat-icon>tune</mat-icon>
                  <span>Report Period</span>
                </div>
                <div class="quick-range-buttons">
                  <button
                    type="button"
                    mat-stroked-button
                    (click)="setQuickRange(7)"
                    class="quick-btn"
                  >
                    7 days
                  </button>
                  <button
                    type="button"
                    mat-stroked-button
                    (click)="setQuickRange(30)"
                    class="quick-btn"
                  >
                    30 days
                  </button>
                  <button
                    type="button"
                    mat-stroked-button
                    (click)="setQuickRange(90)"
                    class="quick-btn"
                  >
                    90 days
                  </button>
                </div>
              </div>

              <div class="date-inputs">
                <div class="date-input-group">
                  <label for="startDate" class="date-label">Start Date</label>
                  <input
                    type="date"
                    id="startDate"
                    formControlName="startDate"
                    class="date-input"
                  />
                </div>

                <div class="date-input-group">
                  <label for="endDate" class="date-label">End Date</label>
                  <input type="date" id="endDate" formControlName="endDate" class="date-input" />
                </div>
              </div>

              <div class="action-buttons-group">
                <div class="primary-actions">
                  <button
                    mat-raised-button
                    class="primary-action"
                    (click)="loadReport()"
                    [disabled]="loading"
                  >
                    <mat-icon *ngIf="!loading">refresh</mat-icon>
                    <mat-progress-spinner
                      *ngIf="loading"
                      diameter="20"
                      mode="indeterminate"
                    ></mat-progress-spinner>
                    <span>{{ loading ? 'Loading...' : 'Generate Report' }}</span>
                  </button>
                  <button mat-stroked-button class="secondary-action" (click)="resetDateRange()">
                    <mat-icon>restore</mat-icon>
                  </button>
                </div>
                <div class="secondary-actions">
                  <button
                    mat-stroked-button
                    class="secondary-action"
                    (click)="openRecordedPaymentsModal()"
                    [disabled]="!reportData"
                  >
                    <mat-icon>verified_user</mat-icon>
                    <span>View Recorded</span>
                  </button>
                  <button
                    mat-stroked-button
                    class="export-action"
                    (click)="exportToCSV()"
                    [disabled]="!reportData || reportData.payments.length === 0"
                  >
                    <mat-icon>download</mat-icon>
                    <span>Export</span>
                  </button>
                </div>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      </div>

      <div *ngIf="loading" class="loading-container">
        <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
        <p>Loading court receipts...</p>
      </div>

      <div *ngIf="!loading && reportData">
        <!-- Modern Summary Cards -->
        <div class="stats-section">
          <h2 class="section-title">
            <mat-icon>insights</mat-icon>
            Overview & Analytics
          </h2>

          <div class="stats-grid">
            <!-- Total Payments Card -->
            <div class="stat-card total-card">
              <div class="stat-icon-wrapper total-bg">
                <mat-icon class="stat-icon">payments</mat-icon>
              </div>
              <div class="stat-content">
                <div class="stat-label">Total Payments</div>
                <div class="stat-value">₱{{ reportData.summary.totalAmount.toFixed(2) }}</div>
                <div class="stat-meta">{{ reportData.summary.totalPayments }} transactions</div>
              </div>
              <div class="stat-trend">
                <mat-icon class="trend-icon">trending_up</mat-icon>
              </div>
            </div>

            <!-- Pending Card -->
            <div class="stat-card pending-card">
              <div class="stat-icon-wrapper pending-bg">
                <mat-icon class="stat-icon">pending_actions</mat-icon>
              </div>
              <div class="stat-content">
                <div class="stat-label">Pending Approval</div>
                <div class="stat-value">{{ reportData.summary.pendingPayments }}</div>
                <div class="stat-meta">Awaiting review</div>
              </div>
              <div class="stat-badge pending-badge">Action Required</div>
            </div>

            <!-- Approved Card -->
            <div class="stat-card approved-card">
              <div class="stat-icon-wrapper approved-bg">
                <mat-icon class="stat-icon">check_circle</mat-icon>
              </div>
              <div class="stat-content">
                <div class="stat-label">Approved</div>
                <div class="stat-value">{{ reportData.summary.completedPayments }}</div>
                <div class="stat-meta">Ready to record</div>
              </div>
              <div class="stat-badge approved-badge">Ready</div>
            </div>

            <!-- Recorded Card -->
            <div class="stat-card recorded-card">
              <div class="stat-icon-wrapper recorded-bg">
                <mat-icon class="stat-icon">verified</mat-icon>
              </div>
              <div class="stat-content">
                <div class="stat-label">Recorded</div>
                <div class="stat-value">{{ reportData.summary.recordedPayments }}</div>
                <div class="stat-meta">Fully processed</div>
              </div>
              <div class="stat-badge recorded-badge">Complete</div>
            </div>
          </div>
        </div>

        <!-- Revenue Breakdown Section -->
        <div class="revenue-section">
          <h2 class="section-title">
            <mat-icon>account_balance</mat-icon>
            Revenue Distribution
          </h2>

          <div class="revenue-grid">
            <mat-card class="revenue-card modern-card">
              <div class="revenue-header">
                <div class="revenue-icon service-fee-icon">
                  <mat-icon>monetization_on</mat-icon>
                </div>
                <div class="revenue-info">
                  <div class="revenue-title">App Service Fees</div>
                  <div class="revenue-subtitle">20% commission</div>
                </div>
              </div>
              <div class="revenue-amount service-fee-amount">
                ₱{{ reportData.summary.totalServiceFees?.toFixed(2) || '0.00' }}
              </div>
              <div class="revenue-footer">
                <mat-icon>info_outline</mat-icon>
                <span>Platform maintenance & development</span>
              </div>
            </mat-card>

            <mat-card class="revenue-card modern-card">
              <div class="revenue-header">
                <div class="revenue-icon court-revenue-icon">
                  <mat-icon>sports_tennis</mat-icon>
                </div>
                <div class="revenue-info">
                  <div class="revenue-title">Court Revenue</div>
                  <div class="revenue-subtitle">90% to club</div>
                </div>
              </div>
              <div class="revenue-amount court-revenue-amount">
                ₱{{ reportData.summary.totalCourtRevenue?.toFixed(2) || '0.00' }}
              </div>
              <div class="revenue-footer">
                <mat-icon>info_outline</mat-icon>
                <span>Direct earnings for tennis club</span>
              </div>
            </mat-card>
          </div>
        </div>

        <!-- Payment Methods Section -->
        <div class="payment-methods-section">
          <h2 class="section-title">
            <mat-icon>credit_card</mat-icon>
            Payment Methods Breakdown
          </h2>

          <mat-card class="modern-card">
            <mat-card-content>
              <div class="methods-grid">
                <div *ngFor="let method of reportData.paymentMethodBreakdown" class="method-card">
                  <div class="method-icon-wrapper">
                    <mat-icon class="method-icon">{{
                      getPaymentMethodIcon(method.paymentMethod)
                    }}</mat-icon>
                  </div>
                  <div class="method-details">
                    <div class="method-name">{{ formatPaymentMethod(method.paymentMethod) }}</div>
                    <div class="method-count">{{ method.count }} payments</div>
                  </div>
                  <div class="method-amount">₱{{ method.totalAmount.toFixed(2) }}</div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Payments Table -->
        <div class="table-section">
          <h2 class="section-title">
            <mat-icon>table_chart</mat-icon>
            Payment Records
          </h2>

          <mat-card class="modern-card table-card">
            <mat-card-content>
              <mat-tab-group>
                <!-- Active Payments Tab -->
                <mat-tab label="Active Payments">
                  <div class="tab-content">
                    <div class="table-container">
                      <table mat-table [dataSource]="getActivePayments()" class="receipts-table">
                        <!-- Payment Date Column -->
                        <ng-container matColumnDef="paymentDate">
                          <th mat-header-cell *matHeaderCellDef>Payment Date</th>
                          <td mat-cell *matCellDef="let payment">
                            <span *ngIf="payment.paymentDate">{{
                              formatDate(payment.paymentDate)
                            }}</span>
                            <span *ngIf="!payment.paymentDate" class="no-date">Not paid</span>
                          </td>
                        </ng-container>

                        <!-- Reference Number Column -->
                        <ng-container matColumnDef="referenceNumber">
                          <th mat-header-cell *matHeaderCellDef>Reference #</th>
                          <td mat-cell *matCellDef="let payment">
                            {{ payment.referenceNumber }}
                          </td>
                        </ng-container>

                        <!-- Member Column -->
                        <ng-container matColumnDef="member">
                          <th mat-header-cell *matHeaderCellDef>Member</th>
                          <td mat-cell *matCellDef="let payment">
                            <div class="member-info">
                              <strong>{{ payment.memberName }}</strong>
                              <small>@{{ payment.memberUsername }}</small>
                            </div>
                          </td>
                        </ng-container>

                        <!-- Reservation Details Column -->
                        <ng-container matColumnDef="reservation">
                          <th mat-header-cell *matHeaderCellDef>Reservation</th>
                          <td mat-cell *matCellDef="let payment">
                            <div class="reservation-info">
                              <div class="reservation-date">
                                {{ formatDate(payment.reservationDate) }}
                              </div>
                              <div class="time-slot">
                                {{ payment.timeSlotDisplay }}
                                <mat-chip *ngIf="payment.isPeakHour" class="peak-chip"
                                  >Peak</mat-chip
                                >
                                <mat-chip *ngIf="payment.isOpenPlayEvent" class="open-play-chip"
                                  >Open Play</mat-chip
                                >
                              </div>
                              <div
                                class="participants-info"
                                *ngIf="
                                  !payment.isOpenPlayEvent &&
                                  payment.players &&
                                  payment.players.length > 0
                                "
                              >
                                <div class="participants-count">
                                  {{ payment.players.length }} players
                                </div>
                                <div class="participants-list">{{ getPlayersList(payment) }}</div>
                              </div>
                              <div class="participants-info" *ngIf="payment.isOpenPlayEvent">
                                <div class="participants-count">
                                  {{ payment.openPlayParticipants.length }} participants
                                </div>
                                <div class="participants-list">
                                  {{ getParticipantsList(payment) }}
                                </div>
                              </div>
                            </div>
                          </td>
                        </ng-container>

                        <!-- Payment Method Column -->
                        <ng-container matColumnDef="paymentMethod">
                          <th mat-header-cell *matHeaderCellDef>Payment Method</th>
                          <td mat-cell *matCellDef="let payment">
                            <div class="payment-method">
                              <mat-icon>{{ getPaymentMethodIcon(payment.paymentMethod) }}</mat-icon>
                              {{ formatPaymentMethod(payment.paymentMethod) }}
                            </div>
                          </td>
                        </ng-container>

                        <!-- Total Amount Column -->
                        <ng-container matColumnDef="totalAmount">
                          <th mat-header-cell *matHeaderCellDef>Total Amount</th>
                          <td mat-cell *matCellDef="let payment">
                            <div class="amount-container">
                              <!-- Show all amounts with click handler that provides appropriate feedback -->
                              <div
                                class="amount-display"
                                [class.editable]="canEditPayment(payment)"
                                [class.readonly]="!canEditPayment(payment)"
                                (click)="handleAmountClick(payment)"
                                [title]="getAmountTitle(payment)"
                              >
                                <strong class="total-amount"
                                  >₱{{ payment.amount.toFixed(2) }}</strong
                                >
                                <mat-icon class="action-icon">{{
                                  getAmountIcon(payment.status)
                                }}</mat-icon>
                              </div>
                            </div>
                          </td>
                        </ng-container>

                        <!-- Status Column -->
                        <ng-container matColumnDef="status">
                          <th mat-header-cell *matHeaderCellDef>Status</th>
                          <td mat-cell *matCellDef="let payment">
                            <mat-chip [color]="getStatusColor(payment.status)" selected>
                              {{ payment.status | titlecase }}
                            </mat-chip>
                          </td>
                        </ng-container>

                        <!-- Actions Column -->
                        <ng-container matColumnDef="actions">
                          <th mat-header-cell *matHeaderCellDef>Actions</th>
                          <td mat-cell *matCellDef="let payment">
                            <div class="action-buttons">
                              <!-- Approve button for pending payments -->
                              <button
                                *ngIf="payment.status === 'pending'"
                                mat-icon-button
                                color="primary"
                                [disabled]="
                                  processingPaymentId === payment._id ||
                                  processing.includes(payment._id)
                                "
                                (click)="approvePayment(payment)"
                                [matTooltip]="
                                  processing.includes(payment._id)
                                    ? 'Processing...'
                                    : 'Approve Payment'
                                "
                                class="icon-action-button"
                              >
                                <mat-icon *ngIf="!processing.includes(payment._id)"
                                  >check_circle</mat-icon
                                >
                                <mat-icon *ngIf="processing.includes(payment._id)" class="spinner"
                                  >hourglass_empty</mat-icon
                                >
                              </button>

                              <!-- Record and Cancel buttons for completed payments -->
                              <button
                                *ngIf="payment.status === 'completed'"
                                mat-icon-button
                                color="accent"
                                [disabled]="
                                  processingPaymentId === payment._id ||
                                  processing.includes(payment._id)
                                "
                                (click)="recordPayment(payment)"
                                [matTooltip]="
                                  processing.includes(payment._id)
                                    ? 'Processing...'
                                    : 'Record Payment'
                                "
                                class="icon-action-button"
                              >
                                <mat-icon *ngIf="!processing.includes(payment._id)"
                                  >done_all</mat-icon
                                >
                                <mat-icon *ngIf="processing.includes(payment._id)" class="spinner"
                                  >hourglass_empty</mat-icon
                                >
                              </button>

                              <button
                                *ngIf="payment.status === 'completed'"
                                mat-icon-button
                                color="warn"
                                [disabled]="processing.includes(payment._id)"
                                (click)="cancelPayment(payment)"
                                matTooltip="Cancel Payment"
                                class="icon-action-button"
                              >
                                <mat-icon>cancel</mat-icon>
                              </button>
                            </div>
                          </td>
                        </ng-container>

                        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
                      </table>
                    </div>

                    <div *ngIf="getActivePayments().length === 0" class="no-data">
                      <mat-icon>receipt_long</mat-icon>
                      <h3>No active payments found</h3>
                      <p>
                        No approved court payments ready to be recorded for the selected date range.
                      </p>
                    </div>
                  </div>
                </mat-tab>

                <!-- Archived Payments Tab -->
                <mat-tab label="Archived Payments">
                  <div class="tab-content">
                    <div class="table-container">
                      <table mat-table [dataSource]="getArchivedPayments()" class="receipts-table">
                        <!-- Payment Date Column -->
                        <ng-container matColumnDef="paymentDate">
                          <th mat-header-cell *matHeaderCellDef>Payment Date</th>
                          <td mat-cell *matCellDef="let payment">
                            <span *ngIf="payment.paymentDate">{{
                              formatDate(payment.paymentDate)
                            }}</span>
                            <span *ngIf="!payment.paymentDate" class="no-date">Not paid</span>
                          </td>
                        </ng-container>

                        <!-- Reference Number Column -->
                        <ng-container matColumnDef="referenceNumber">
                          <th mat-header-cell *matHeaderCellDef>Reference #</th>
                          <td mat-cell *matCellDef="let payment">
                            {{ payment.referenceNumber }}
                          </td>
                        </ng-container>

                        <!-- Member Column -->
                        <ng-container matColumnDef="member">
                          <th mat-header-cell *matHeaderCellDef>Member</th>
                          <td mat-cell *matCellDef="let payment">
                            <div class="member-info">
                              <div class="member-name">{{ payment.memberName }}</div>
                              <div class="member-username">@{{ payment.memberUsername }}</div>
                            </div>
                          </td>
                        </ng-container>

                        <!-- Reservation Details Column -->
                        <ng-container matColumnDef="reservation">
                          <th mat-header-cell *matHeaderCellDef>Reservation</th>
                          <td mat-cell *matCellDef="let payment">
                            <div class="reservation-info">
                              <div class="date">{{ formatDate(payment.reservationDate) }}</div>
                              <div class="time">
                                {{ payment.timeSlotDisplay }}
                                <mat-chip *ngIf="payment.isOpenPlayEvent" class="open-play-chip"
                                  >Open Play</mat-chip
                                >
                              </div>
                              <div
                                class="participants-info"
                                *ngIf="!payment.isOpenPlayEvent && payment.players.length > 0"
                              >
                                <div class="participants-count">
                                  {{ payment.players.length }} players
                                </div>
                                <div class="participants-list">{{ getPlayersList(payment) }}</div>
                              </div>
                              <div class="participants-info" *ngIf="payment.isOpenPlayEvent">
                                <div class="participants-count">
                                  {{ payment.openPlayParticipants.length }} participants
                                </div>
                                <div class="participants-list">
                                  {{ getParticipantsList(payment) }}
                                </div>
                              </div>
                            </div>
                          </td>
                        </ng-container>

                        <!-- Amount Column -->
                        <ng-container matColumnDef="totalAmount">
                          <th mat-header-cell *matHeaderCellDef>Amount</th>
                          <td mat-cell *matCellDef="let payment">
                            <div class="amount-display">
                              <span class="amount">₱{{ payment.amount.toFixed(2) }}</span>
                            </div>
                          </td>
                        </ng-container>

                        <!-- Payment Method Column -->
                        <ng-container matColumnDef="paymentMethod">
                          <th mat-header-cell *matHeaderCellDef>Payment Method</th>
                          <td mat-cell *matCellDef="let payment">
                            <mat-chip-set>
                              <mat-chip>{{ formatPaymentMethod(payment.paymentMethod) }}</mat-chip>
                            </mat-chip-set>
                          </td>
                        </ng-container>

                        <!-- Status Column -->
                        <ng-container matColumnDef="status">
                          <th mat-header-cell *matHeaderCellDef>Status</th>
                          <td mat-cell *matCellDef="let payment">
                            <mat-chip-set>
                              <mat-chip [color]="getStatusColor(payment.status)" selected>
                                {{ getStatusLabel(payment.status) }}
                              </mat-chip>
                            </mat-chip-set>
                          </td>
                        </ng-container>

                        <!-- Recorded Date Column -->
                        <ng-container matColumnDef="recordedDate">
                          <th mat-header-cell *matHeaderCellDef>Recorded Date</th>
                          <td mat-cell *matCellDef="let payment">
                            <span *ngIf="payment.recordedAt">{{
                              formatDate(payment.recordedAt)
                            }}</span>
                            <span *ngIf="!payment.recordedAt" class="no-date">-</span>
                          </td>
                        </ng-container>

                        <!-- Actions Column -->
                        <ng-container matColumnDef="actions">
                          <th mat-header-cell *matHeaderCellDef>Actions</th>
                          <td mat-cell *matCellDef="let payment">
                            <div class="action-buttons">
                              <button
                                *ngIf="payment.status === 'record'"
                                mat-icon-button
                                color="warn"
                                class="icon-action-button"
                                (click)="unrecordPayment(payment._id)"
                                [disabled]="processing.includes(payment._id)"
                                [matTooltip]="
                                  processing.includes(payment._id)
                                    ? 'Unrecording...'
                                    : 'Unrecord payment and remove from Court Usage Report'
                                "
                              >
                                <mat-icon>undo</mat-icon>
                              </button>
                            </div>
                          </td>
                        </ng-container>

                        <tr mat-header-row *matHeaderRowDef="archivedDisplayedColumns"></tr>
                        <tr mat-row *matRowDef="let row; columns: archivedDisplayedColumns"></tr>
                      </table>
                    </div>

                    <div *ngIf="getArchivedPayments().length === 0" class="no-data">
                      <mat-icon>archive</mat-icon>
                      <h3>No archived payments found</h3>
                      <p>No archived court payments found for the selected date range.</p>
                    </div>
                  </div>
                </mat-tab>
              </mat-tab-group>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>

    <!-- Record Payments Modal -->
    <div *ngIf="showRecordedModal" class="modal-overlay" (click)="closeRecordedModal()">
      <div class="recorded-modal" (click)="$event.stopPropagation()">
        <mat-card class="modal-card">
          <mat-card-header>
            <div class="modal-header">
              <mat-card-title>
                <mat-icon>verified</mat-icon>
                Record Payments
              </mat-card-title>
              <button mat-icon-button (click)="closeRecordedModal()" class="close-button">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="loadingRecordedPayments" class="loading-recorded">
              <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
              <p>Loading recorded payments...</p>
            </div>

            <div
              *ngIf="!loadingRecordedPayments && recordedPayments.length === 0"
              class="no-recorded-data"
            >
              <mat-icon>verified</mat-icon>
              <h3>No Record Payments</h3>
              <p>No payments have been recorded yet.</p>
            </div>

            <div
              *ngIf="!loadingRecordedPayments && recordedPayments.length > 0"
              class="recorded-table-container"
            >
              <table mat-table [dataSource]="recordedPayments" class="recorded-table">
                <!-- Timestamp Column -->
                <ng-container matColumnDef="timestamp">
                  <th mat-header-cell *matHeaderCellDef>Timestamp</th>
                  <td mat-cell *matCellDef="let payment">
                    {{ formatDateTime(payment.recordedAt || payment.paymentDate) }}
                  </td>
                </ng-container>

                <!-- Member Column -->
                <ng-container matColumnDef="member">
                  <th mat-header-cell *matHeaderCellDef>Member</th>
                  <td mat-cell *matCellDef="let payment">
                    {{ payment.memberName }}
                  </td>
                </ng-container>

                <!-- Date Column -->
                <ng-container matColumnDef="date">
                  <th mat-header-cell *matHeaderCellDef>Date</th>
                  <td mat-cell *matCellDef="let payment">
                    {{ formatDate(payment.reservationDate) }}
                  </td>
                </ng-container>

                <!-- Start Time Column -->
                <ng-container matColumnDef="startTime">
                  <th mat-header-cell *matHeaderCellDef>Start Time</th>
                  <td mat-cell *matCellDef="let payment">
                    {{ formatTime(payment.timeSlot) }}
                  </td>
                </ng-container>

                <!-- End Time Column -->
                <ng-container matColumnDef="endTime">
                  <th mat-header-cell *matHeaderCellDef>End Time</th>
                  <td mat-cell *matCellDef="let payment">
                    {{ formatTime(payment.timeSlot + 1) }}
                  </td>
                </ng-container>

                <!-- Paid To Column -->
                <ng-container matColumnDef="paidTo">
                  <th mat-header-cell *matHeaderCellDef>Paid to Cash/GCash</th>
                  <td mat-cell *matCellDef="let payment">
                    <div class="payment-method-badge">
                      <mat-icon>{{ getPaymentMethodIcon(payment.paymentMethod) }}</mat-icon>
                      {{ formatPaymentMethod(payment.paymentMethod) }}
                    </div>
                  </td>
                </ng-container>

                <!-- Amount Column -->
                <ng-container matColumnDef="amount">
                  <th mat-header-cell *matHeaderCellDef>Amount</th>
                  <td mat-cell *matCellDef="let payment">
                    <strong class="amount-value">₱{{ payment.amount.toFixed(2) }}</strong>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="recordedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: recordedColumns"></tr>
              </table>
            </div>

            <div class="modal-actions">
              <button
                mat-button
                (click)="exportRecordedToCSV()"
                [disabled]="recordedPayments.length === 0"
              >
                <mat-icon>download</mat-icon>
                Export Record Payments
              </button>
              <button mat-raised-button color="primary" (click)="closeRecordedModal()">
                Close
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      /* ===== GLOBAL STYLES ===== */
      :host {
        --primary-color: #6366f1;
        --primary-dark: #4f46e5;
        --primary-light: #e0e7ff;
        --success-color: #10b981;
        --warning-color: #f59e0b;
        --danger-color: #ef4444;
        --neutral-bg: #f8fafc;
        --neutral-border: #e2e8f0;
        --text-primary: #1e293b;
        --text-secondary: #64748b;
        --card-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        --card-shadow-hover: 0 12px 24px rgba(0, 0, 0, 0.12);
      }

      /* ===== CONTAINER & LAYOUT ===== */
      .report-container {
        min-height: 100vh;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        padding-bottom: 40px;
      }

      /* ===== MODERN HEADER ===== */
      .modern-header {
        position: relative;
        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #7c3aed 100%);
        color: white;
        padding: 32px 24px;
        margin-bottom: 40px;
        box-shadow: 0 12px 40px rgba(99, 102, 241, 0.2);
        overflow: hidden;
      }

      .header-background {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-image:
          radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
        pointer-events: none;
      }

      .header-content {
        position: relative;
        max-width: 1600px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 20px;
        z-index: 1;
      }

      .back-btn {
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        color: white;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 12px;
        flex-shrink: 0;
      }

      .back-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateX(-4px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
      }

      .header-text {
        flex: 1;
      }

      .page-title {
        margin: 0;
        font-size: 32px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 14px;
        letter-spacing: -0.5px;
        line-height: 1.2;
      }

      .title-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
      }

      .page-subtitle {
        margin: 10px 0 0 50px;
        font-size: 15px;
        opacity: 0.95;
        font-weight: 400;
        letter-spacing: 0.3px;
      }

      .header-stats-badge {
        display: flex;
        gap: 12px;
      }

      .stat-badge {
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        padding: 12px 20px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 16px;
        transition: all 0.3s ease;
      }

      .stat-badge:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
      }

      .stat-badge mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      /* ===== FILTER SECTION ===== */
      .filter-section {
        max-width: 1600px;
        margin: 0 auto 32px;
        padding: 0 24px;
      }

      .filter-card {
        border-radius: 16px;
        box-shadow: var(--card-shadow);
        border: 1px solid var(--neutral-border);
        background: white;
        transition: all 0.3s ease;
      }

      .filter-card:hover {
        box-shadow: var(--card-shadow-hover);
        border-color: var(--primary-light);
      }

      .filter-form {
        display: flex;
        flex-direction: column;
        gap: 24px;
        padding: 24px;
      }

      .filter-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
      }

      .filter-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 18px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .filter-title mat-icon {
        color: var(--primary-color);
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      .quick-range-buttons {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .quick-btn {
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        padding: 8px 16px;
        transition: all 0.2s ease;
        border-color: var(--neutral-border);
        color: var(--text-secondary);
      }

      .quick-btn:hover {
        border-color: var(--primary-color);
        color: var(--primary-color);
        background: var(--primary-light);
      }

      .date-inputs {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }

      .date-input-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .date-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .date-input {
        padding: 10px 14px;
        border: 1.5px solid var(--neutral-border);
        border-radius: 8px;
        font-size: 14px;
        color: var(--text-primary);
        background: white;
        transition: all 0.2s ease;
        font-family:
          -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
        outline: none;
      }

      .date-input:hover {
        border-color: var(--primary-color);
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
      }

      .date-input:focus {
        border-color: var(--primary-color);
        box-shadow:
          0 0 0 3px rgba(99, 102, 241, 0.1),
          0 2px 8px rgba(99, 102, 241, 0.15);
        background:
          linear-gradient(white, white) padding-box,
          linear-gradient(135deg, var(--primary-color), var(--primary-dark)) border-box;
      }

      /* Date picker calendar styling */
      .date-input::-webkit-calendar-picker-indicator {
        cursor: pointer;
        border-radius: 4px;
        margin-right: 4px;
        opacity: 0.6;
        filter: invert(0.7);
        transition: all 0.2s ease;
      }

      .date-input:hover::-webkit-calendar-picker-indicator {
        opacity: 1;
        filter: invert(0.3);
      }

      .date-input:focus::-webkit-calendar-picker-indicator {
        opacity: 1;
        filter: invert(0);
      }

      .action-buttons-group {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-top: 8px;
        border-top: 1px solid var(--neutral-border);
      }

      .primary-actions,
      .secondary-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      .primary-action,
      .secondary-action,
      .export-action {
        border-radius: 10px;
        font-weight: 500;
        text-transform: none;
        letter-spacing: 0.3px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
        padding: 10px 20px;
      }

      .primary-action {
        background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
        color: white;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        border: none;
      }

      .primary-action:hover:not(:disabled) {
        box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
        transform: translateY(-2px);
      }

      .secondary-action {
        border: 1.5px solid var(--neutral-border);
        color: var(--text-secondary);
        background: white;
      }

      .secondary-action:hover:not(:disabled) {
        border-color: var(--primary-color);
        color: var(--primary-color);
        background: var(--primary-light);
      }

      .export-action {
        border: 1.5px solid var(--success-color);
        color: var(--success-color);
        background: white;
      }

      .export-action:hover:not(:disabled) {
        background: #ecfdf5;
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        padding: 60px 40px;
        text-align: center;
        background: white;
        border-radius: 16px;
        margin: 24px;
        box-shadow: var(--card-shadow);
        max-width: 1600px;
        margin-left: auto;
        margin-right: auto;
      }

      .loading-container p {
        color: var(--text-secondary);
        font-size: 15px;
      }

      /* ===== SECTION TITLES ===== */
      .section-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 20px;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 24px;
      }

      .section-title mat-icon {
        color: var(--primary-color);
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      /* ===== STATS SECTION ===== */
      .stats-section {
        max-width: 1600px;
        margin: 0 auto 40px;
        padding: 0 24px;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 20px;
      }

      .stat-card {
        background: white;
        border-radius: 16px;
        padding: 24px;
        box-shadow: var(--card-shadow);
        position: relative;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid transparent;
        display: flex;
        flex-direction: column;
      }

      .stat-card:hover {
        transform: translateY(-6px);
        box-shadow: var(--card-shadow-hover);
        border-color: var(--primary-light);
      }

      .stat-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 5px;
      }

      .total-card::before {
        background: linear-gradient(90deg, #6366f1, #7c3aed);
      }
      .pending-card::before {
        background: linear-gradient(90deg, #f59e0b, #ef4444);
      }
      .approved-card::before {
        background: linear-gradient(90deg, #3b82f6, #1d4ed8);
      }
      .recorded-card::before {
        background: linear-gradient(90deg, #10b981, #059669);
      }

      .stat-icon-wrapper {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
      }

      .total-bg {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(124, 58, 237, 0.1));
      }
      .pending-bg {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.1));
      }
      .approved-bg {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(29, 78, 216, 0.1));
      }
      .recorded-bg {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));
      }

      .stat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .total-bg .stat-icon {
        color: #6366f1;
      }
      .pending-bg .stat-icon {
        color: #f59e0b;
      }
      .approved-bg .stat-icon {
        color: #3b82f6;
      }
      .recorded-bg .stat-icon {
        color: #10b981;
      }

      .stat-content {
        flex: 1;
      }

      .stat-label {
        font-size: 13px;
        color: var(--text-secondary);
        font-weight: 600;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.7px;
      }

      .stat-value {
        font-size: 32px;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 4px;
        letter-spacing: -0.8px;
      }

      .stat-meta {
        font-size: 13px;
        color: var(--text-secondary);
      }

      .stat-badge {
        position: absolute;
        top: 16px;
        right: 16px;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .pending-badge {
        background: #fef3c7;
        color: #92400e;
      }
      .approved-badge {
        background: #dbeafe;
        color: #1e40af;
      }
      .recorded-badge {
        background: #d1fae5;
        color: #065f46;
      }

      /* ===== REVENUE SECTION ===== */
      .revenue-section {
        max-width: 1600px;
        margin: 0 auto 40px;
        padding: 0 24px;
      }

      .revenue-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 20px;
      }

      .revenue-card {
        padding: 28px;
        border-radius: 16px;
        background: white;
        box-shadow: var(--card-shadow);
        border: 1px solid var(--neutral-border);
        transition: all 0.3s ease;
      }

      .revenue-card:hover {
        box-shadow: var(--card-shadow-hover);
        transform: translateY(-4px);
      }

      .revenue-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
      }

      .revenue-icon {
        width: 56px;
        height: 56px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .service-fee-icon {
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.1));
      }

      .service-fee-icon mat-icon {
        color: #f59e0b;
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      .court-revenue-icon {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));
      }

      .court-revenue-icon mat-icon {
        color: #10b981;
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      .revenue-info {
        flex: 1;
      }

      .revenue-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 4px;
      }

      .revenue-subtitle {
        font-size: 13px;
        color: var(--text-secondary);
      }

      .revenue-amount {
        font-size: 40px;
        font-weight: 800;
        margin-bottom: 20px;
        letter-spacing: -1px;
      }

      .service-fee-amount {
        color: #f59e0b;
      }
      .court-revenue-amount {
        color: #10b981;
      }

      .revenue-footer {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-top: 20px;
        border-top: 1px solid var(--neutral-border);
        color: var(--text-secondary);
        font-size: 13px;
      }

      .revenue-footer mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      /* ===== PAYMENT METHODS SECTION ===== */
      .payment-methods-section {
        max-width: 1600px;
        margin: 0 auto 40px;
        padding: 0 24px;
      }

      .methods-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
      }

      .method-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        background: linear-gradient(135deg, #f8fafc, #f1f5f9);
        border-radius: 12px;
        border: 1px solid var(--neutral-border);
        transition: all 0.3s ease;
      }

      .method-card:hover {
        border-color: var(--primary-color);
        transform: translateX(6px);
        background: white;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
      }

      .method-icon-wrapper {
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(124, 58, 237, 0.1));
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .method-icon {
        color: var(--primary-color);
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      .method-details {
        flex: 1;
      }

      .method-name {
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 4px;
      }

      .method-count {
        font-size: 13px;
        color: var(--text-secondary);
      }

      .method-amount {
        font-size: 18px;
        font-weight: 700;
        color: var(--primary-color);
      }

      /* ===== TABLE SECTION ===== */
      .table-section {
        max-width: 1600px;
        margin: 0 auto 32px;
        padding: 0 24px;
      }

      .table-card {
        overflow: hidden;
        border-radius: 16px;
      }

      .table-container {
        overflow-x: auto;
        max-width: 100%;
        -webkit-overflow-scrolling: touch;
      }

      .tab-content {
        padding: 20px 0;
      }

      .receipts-table {
        width: 100%;
        min-width: 1000px;
      }

      ::ng-deep .mat-mdc-tab-group {
        --mdc-tab-indicator-active-indicator-color: var(--primary-color);
      }

      ::ng-deep .mat-mdc-tab:not(.mat-mdc-tab-disabled).mdc-tab--active .mdc-tab__text-label {
        color: var(--primary-color);
        font-weight: 700;
      }

      ::ng-deep .mat-mdc-tab {
        color: var(--text-secondary);
      }

      ::ng-deep .mat-mdc-header-row {
        background: #f8fafc;
      }

      ::ng-deep .mat-mdc-header-cell {
        color: var(--text-secondary);
        font-weight: 700;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        padding: 16px 12px;
      }

      ::ng-deep .mat-mdc-cell {
        padding: 12px;
        font-size: 14px;
      }

      ::ng-deep .mat-mdc-row:hover {
        background: #f1f5f9;
      }

      .member-info strong {
        display: block;
        font-size: 14px;
        color: var(--text-primary);
      }

      .member-info small {
        color: var(--text-secondary);
        font-size: 12px;
      }

      .reservation-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .reservation-date {
        font-weight: 600;
        font-size: 13px;
        color: var(--text-primary);
      }

      .time-slot {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: var(--text-secondary);
      }

      .peak-chip,
      .open-play-chip {
        font-size: 10px;
        height: 22px;
        border-radius: 6px;
        padding: 0 8px;
        display: inline-flex;
        align-items: center;
        font-weight: 600;
      }

      .peak-chip {
        background-color: #fed7aa;
        color: #92400e;
      }

      .open-play-chip {
        background-color: #bbf7d0;
        color: #065f46;
      }

      .participants-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .participants-count {
        font-size: 12px;
        color: var(--text-secondary);
        font-weight: 600;
      }

      .participants-list {
        font-size: 11px;
        color: #94a3b8;
        line-height: 1.3;
      }

      .payment-method {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 500;
      }

      .payment-method mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      .amount-container {
        width: 100%;
      }

      .amount-display {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 8px;
        transition: all 0.2s ease;
        border: 1px solid transparent;
        min-width: 120px;
        background: #f8fafc;
      }

      .amount-display.editable {
        cursor: pointer;
        background: rgba(99, 102, 241, 0.05);
      }

      .amount-display.editable:hover {
        background: rgba(99, 102, 241, 0.1);
        border-color: rgba(99, 102, 241, 0.2);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
      }

      .amount-display.editable:hover .total-amount {
        color: #4f46e5;
      }

      .amount-display.readonly {
        background: rgba(100, 116, 139, 0.05);
      }

      .total-amount {
        font-weight: 700;
        font-size: 14px;
        color: var(--text-primary);
        transition: color 0.2s ease;
      }

      .action-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
        opacity: 0;
        transition: all 0.2s ease;
      }

      .amount-display.editable:hover .action-icon {
        opacity: 1;
        color: var(--primary-color);
      }

      .amount-display.readonly .action-icon {
        opacity: 0.5;
        color: var(--text-secondary);
      }

      .no-date {
        color: #999;
        font-style: italic;
        font-size: 12px;
      }

      .icon-action-button {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        transition: all 0.2s ease;
        margin: 0 4px;
      }

      .icon-action-button:hover:not(:disabled) {
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .icon-action-button mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .action-buttons {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }

      mat-chip {
        font-size: 11px;
        min-height: 24px;
        border-radius: 6px;
      }

      /* ===== MODAL STYLES ===== */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(4px);
        animation: fadeIn 0.3s ease;
      }

      .recorded-modal {
        width: 90%;
        max-width: 1200px;
        max-height: 90vh;
        overflow: hidden;
        animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .modal-card {
        margin: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }

      .modal-header mat-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        color: var(--text-primary);
      }

      .close-button {
        color: var(--text-secondary);
        transition: all 0.2s ease;
      }

      .close-button:hover {
        color: var(--text-primary);
        background: var(--neutral-bg);
      }

      .no-data {
        text-align: center;
        padding: 60px 40px;
        color: var(--text-secondary);
      }

      .no-data mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
        opacity: 0.5;
      }

      .no-data h3 {
        margin: 0 0 8px 0;
        color: var(--text-primary);
        font-size: 18px;
      }

      .no-data p {
        margin: 0;
        font-size: 14px;
      }

      /* ===== ANIMATIONS ===== */
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .stat-card,
      .revenue-card,
      .method-card {
        animation: slideUp 0.5s ease-out;
      }

      .stat-card:nth-child(1) {
        animation-delay: 0.1s;
      }
      .stat-card:nth-child(2) {
        animation-delay: 0.15s;
      }
      .stat-card:nth-child(3) {
        animation-delay: 0.2s;
      }
      .stat-card:nth-child(4) {
        animation-delay: 0.25s;
      }

      /* ===== RESPONSIVE DESIGN ===== */
      @media (max-width: 1024px) {
        .header-stats-badge {
          display: none;
        }
      }

      @media (max-width: 768px) {
        .modern-header {
          padding: 24px 16px;
          margin-bottom: 32px;
        }

        .page-title {
          font-size: 24px;
          gap: 10px;
        }

        .title-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
        }

        .page-subtitle {
          font-size: 13px;
          margin-left: 38px;
        }

        .filter-section,
        .stats-section,
        .revenue-section,
        .payment-methods-section,
        .table-section {
          padding: 0 16px;
        }

        .filter-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .quick-range-buttons {
          width: 100%;
        }

        .quick-btn {
          flex: 1;
          min-width: 60px;
        }

        .stats-grid,
        .revenue-grid,
        .methods-grid {
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .action-buttons-group {
          flex-direction: column;
        }

        .primary-actions,
        .secondary-actions {
          width: 100%;
          flex-direction: column;
        }

        .primary-action,
        .secondary-action,
        .export-action {
          width: 100%;
          justify-content: center;
        }

        .date-inputs {
          grid-template-columns: 1fr;
        }

        .stat-value {
          font-size: 28px;
        }

        .revenue-amount {
          font-size: 32px;
        }

        .page-title {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }

        .header-content {
          flex-direction: column;
          align-items: flex-start;
        }

        .recorded-modal {
          width: 95%;
          max-height: 95vh;
        }

        .receipts-table {
          min-width: 100%;
          font-size: 12px;
        }

        ::ng-deep .mat-mdc-cell {
          padding: 8px 6px;
          font-size: 12px;
        }

        ::ng-deep .mat-mdc-header-cell {
          padding: 12px 6px;
          font-size: 11px;
        }
      }

      @media (max-width: 480px) {
        .modern-header {
          padding: 20px 12px;
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 20px;
        }

        .title-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
        }

        .page-subtitle {
          font-size: 12px;
          margin-left: 36px;
        }

        .filter-section,
        .stats-section,
        .revenue-section,
        .payment-methods-section,
        .table-section {
          padding: 0 12px;
          margin-bottom: 24px;
        }

        .stat-value {
          font-size: 24px;
        }

        .revenue-amount {
          font-size: 28px;
        }

        .method-card {
          padding: 16px;
          flex-direction: column;
          text-align: center;
        }

        .method-icon-wrapper {
          width: 40px;
          height: 40px;
        }

        .method-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }

        .receipts-table {
          font-size: 11px;
        }

        ::ng-deep .mat-mdc-cell,
        ::ng-deep .mat-mdc-header-cell {
          padding: 6px 4px;
        }
      }
    `,
  ],
})
export class CourtReceiptsReportComponent implements OnInit {
  reportData: PaymentsReportData | null = null;
  loading = false;
  processingPaymentId: string | null = null;
  processing: string[] = [];

  // Recorded payments modal
  showRecordedModal = false;
  loadingRecordedPayments = false;
  recordedPayments: PaymentRecord[] = [];
  recordedColumns = ['timestamp', 'member', 'date', 'startTime', 'endTime', 'paidTo', 'amount'];

  // Credit deposits data
  creditDeposits: CreditTransaction[] = [];
  creditDepositsColumns = ['requestDate', 'member', 'amount', 'paymentMethod', 'status', 'actions'];
  loadingCreditDeposits = false;

  // Amount editing
  updatingPayment = false;

  private apiUrl = environment.apiUrl;

  dateRangeForm = new FormGroup({
    startDate: new FormControl<Date | null>(null),
    endDate: new FormControl<Date | null>(null),
  });

  displayedColumns: string[] = [
    'paymentDate',
    'referenceNumber',
    'member',
    'reservation',
    'paymentMethod',
    'totalAmount',
    'status',
    'actions',
  ];

  archivedDisplayedColumns: string[] = [
    'paymentDate',
    'referenceNumber',
    'member',
    'reservation',
    'paymentMethod',
    'totalAmount',
    'status',
    'recordedDate',
    'actions',
  ];

  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private creditService: CreditService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {
    // Set default date range to last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    this.dateRangeForm.patchValue({
      startDate: startDate,
      endDate: endDate,
    });
  }

  ngOnInit(): void {
    // Check if user has financial access (treasurer, admin, or superadmin)
    if (!this.authService.hasFinancialAccess()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadReport();
    this.loadCreditDeposits();
  }

  loadReport(): void {
    this.loading = true;
    this.loadCreditDeposits();

    const params: any = {};
    if (this.dateRangeForm.value.startDate) {
      params.startDate = this.dateRangeForm.value.startDate.toISOString();
    }
    if (this.dateRangeForm.value.endDate) {
      params.endDate = this.dateRangeForm.value.endDate.toISOString();
    }
    // Fetch all payments without limit
    params.limit = 999999;

    this.http
      .get<{ success: boolean; data: PaymentRecord[] }>(`${this.baseUrl}/payments`, { params })
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Transform the payments data to match our interface
            this.reportData = {
              payments: response.data.map((payment: any) => {
                const reservation = payment.reservationId || {};
                const poll = payment.pollId || {};
                const openPlayEvent = poll.openPlayEvent || {};

                // Determine payment type
                const isOpenPlayEvent = !!payment.pollId;
                const isManualPayment = payment.metadata?.isManualPayment;

                let players: string[] = [];
                let reservationDate: string;
                let timeSlot: number;
                let timeSlotDisplay: string;
                let openPlayParticipants: string[] = [];

                if (isManualPayment) {
                  // Manual payment
                  players = payment.metadata.playerNames || [];
                  reservationDate = payment.metadata.courtUsageDate || new Date().toISOString();
                  timeSlot = payment.metadata.startTime || 0;
                  const endTime = payment.metadata.endTime || timeSlot + 1;
                  timeSlotDisplay = `${timeSlot}:00-${endTime}:00`;
                } else if (isOpenPlayEvent) {
                  // Open Play event
                  reservationDate = openPlayEvent.eventDate || new Date().toISOString();
                  timeSlot = openPlayEvent.startTime || 18;
                  timeSlotDisplay = `${openPlayEvent.startTime || 18}:00-${openPlayEvent.endTime || 20}:00`;
                  openPlayParticipants = (openPlayEvent.confirmedPlayers || []).map(
                    (p: any) => p.fullName,
                  );
                  players = openPlayParticipants; // For backward compatibility
                } else {
                  // Court reservation
                  // Map player objects to their names
                  const playersArray = reservation.players || [];
                  players = playersArray.map((p: any) => {
                    if (typeof p === 'string') return p;
                    // New format: objects with 'name' property
                    if (p.name) return p.name;
                    // Fallback to user object properties
                    return p.fullName || p.username || 'Unknown Player';
                  });
                  reservationDate = reservation.date || new Date().toISOString();
                  timeSlot = reservation.timeSlot || 0;
                  const endTimeSlot = reservation.endTimeSlot || timeSlot + 1;
                  timeSlotDisplay = `${timeSlot}:00-${endTimeSlot}:00`;
                }

                return {
                  ...payment,
                  memberName: payment.userId?.fullName || 'Unknown',
                  memberUsername: payment.userId?.username || 'unknown',
                  reservationDate,
                  timeSlot,
                  timeSlotDisplay,
                  players,
                  openPlayParticipants,
                  isOpenPlayEvent,
                  isPeakHour: payment.metadata?.isPeakHour || false,
                };
              }),
              summary: {
                totalPayments: response.data.filter(
                  (p: any) => p.status === 'completed' || p.status === 'record',
                ).length,
                totalAmount: response.data
                  .filter((p: any) => p.status === 'completed' || p.status === 'record')
                  .reduce((sum: number, p: any) => sum + p.amount, 0),
                pendingPayments: response.data.filter((p: any) => p.status === 'pending').length,
                completedPayments: response.data.filter((p: any) => p.status === 'completed')
                  .length,
                recordedPayments: response.data.filter((p: any) => p.status === 'record').length,
                totalServiceFees: response.data
                  .filter((p: any) => p.status === 'completed' || p.status === 'record')
                  .reduce((sum: number, p: any) => sum + p.amount * 0.2, 0),
                totalCourtRevenue: response.data
                  .filter((p: any) => p.status === 'completed' || p.status === 'record')
                  .reduce((sum: number, p: any) => sum + p.amount * 0.8, 0),
              },
              paymentMethodBreakdown: this.calculatePaymentMethodBreakdown(response.data),
              period: {
                startDate: params.startDate || '',
                endDate: params.endDate || '',
              },
            };
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading payments report:', error);
          this.showMessage('Failed to load payments data', 'error');
          this.loading = false;
        },
      });
  }

  resetDateRange(): void {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    this.dateRangeForm.patchValue({
      startDate: startDate,
      endDate: endDate,
    });

    this.loadReport();
  }

  setQuickRange(days: number): void {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    this.dateRangeForm.patchValue({
      startDate: startDate,
      endDate: endDate,
    });

    this.loadReport();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatPaymentMethod(method: string): string {
    const methodMap: { [key: string]: string } = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      gcash: 'GCash',
      coins: 'Coins',
    };
    return methodMap[method] || method;
  }

  getPaymentMethodIcon(method: string): string {
    const iconMap: { [key: string]: string } = {
      cash: 'payments',
      bank_transfer: 'account_balance',
      gcash: 'phone_android',
      coins: 'monetization_on',
    };
    return iconMap[method] || 'payment';
  }

  exportToCSV(): void {
    if (!this.reportData || !this.reportData.payments.length) {
      return;
    }

    const headers = [
      'Payment Date',
      'Reference Number',
      'Member Name',
      'Username',
      'Reservation Date',
      'Time Slot',
      'Players Count',
      'Event Type',
      'Participants',
      'Peak Hour',
      'Payment Method',
      'Total Amount',
      'Status',
      'Approved By',
      'Recorded By',
    ];

    const csvContent = [
      headers.join(','),
      ...this.reportData.payments.map((payment) =>
        [
          `"${payment.paymentDate ? this.formatDate(payment.paymentDate) : 'Not paid'}"`,
          `"${payment.referenceNumber}"`,
          `"${payment.memberName}"`,
          `"${payment.memberUsername}"`,
          `"${this.formatDate(payment.reservationDate)}"`,
          `"${payment.timeSlotDisplay}"`,
          payment.players.length,
          payment.isOpenPlayEvent ? 'Open Play Event' : 'Court Reservation',
          payment.isOpenPlayEvent
            ? `"${payment.openPlayParticipants.join(', ')}"`
            : `"${payment.players.join(', ')}"`,
          payment.isPeakHour ? 'Yes' : 'No',
          `"${this.formatPaymentMethod(payment.paymentMethod)}"`,
          payment.amount.toFixed(2),
          `"${payment.status}"`,
          `"${payment.approvedBy || ''}"`,
          `"${payment.recordedBy || ''}"`,
        ].join(','),
      ),
    ].join('\n');

    // Add summary at the end
    const summaryRows = [
      '',
      'SUMMARY',
      `Total Payments,${this.reportData.summary.totalPayments}`,
      `Total Amount,₱${this.reportData.summary.totalAmount.toFixed(2)}`,
      `Pending Payments,${this.reportData.summary.pendingPayments}`,
      `Approved Payments,${this.reportData.summary.completedPayments}`,
      `Record Payments,${this.reportData.summary.recordedPayments}`,
    ];

    const finalContent = csvContent + '\n' + summaryRows.join('\n');

    // Create and download file
    const blob = new Blob([finalContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);

      const startDate = this.dateRangeForm.value.startDate;
      const endDate = this.dateRangeForm.value.endDate;
      const dateRange =
        startDate && endDate
          ? `${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}`
          : 'last_30_days';

      link.setAttribute('download', `payment_management_${dateRange}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  calculatePaymentMethodBreakdown(
    payments: any[],
  ): Array<{ paymentMethod: string; count: number; totalAmount: number }> {
    const methodMap = new Map<string, { count: number; totalAmount: number }>();

    payments.forEach((payment) => {
      const method = payment.paymentMethod;
      if (methodMap.has(method)) {
        const current = methodMap.get(method)!;
        methodMap.set(method, {
          count: current.count + 1,
          totalAmount: current.totalAmount + payment.amount,
        });
      } else {
        methodMap.set(method, {
          count: 1,
          totalAmount: payment.amount,
        });
      }
    });

    return Array.from(methodMap.entries()).map(([paymentMethod, data]) => ({
      paymentMethod,
      ...data,
    }));
  }

  getButtonTextForStatus(status: string): string {
    switch (status) {
      case 'pending':
        return 'Approve';
      case 'completed':
        return 'Record';
      case 'record':
        return '✓ Record';
      default:
        return '-';
    }
  }

  getButtonColorForStatus(status: string): string {
    switch (status) {
      case 'pending':
        return 'primary';
      case 'completed':
        return 'accent';
      default:
        return '';
    }
  }

  isButtonDisabled(status: string): boolean {
    return status === 'record' || status === 'failed' || status === 'refunded';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'warn';
      case 'completed':
        return 'primary';
      case 'record':
        return 'accent';
      case 'failed':
        return 'warn';
      case 'refunded':
        return '';
      default:
        return '';
    }
  }

  onPaymentAction(payment: PaymentRecord): void {
    if (payment.status === 'pending') {
      this.approvePayment(payment);
    } else if (payment.status === 'completed') {
      this.recordPayment(payment);
    }
  }

  approvePayment(payment: PaymentRecord): void {
    const dialogData: PaymentConfirmationData = {
      action: 'approve',
      paymentId: payment._id,
      referenceNumber: payment.referenceNumber,
      memberName: payment.memberName,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      reservationDate: this.formatDate(payment.reservationDate),
      timeSlot: payment.timeSlotDisplay,
    };

    const dialogRef = this.dialog.open(PaymentConfirmationDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      disableClose: true,
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.confirmed) {
        this.processingPaymentId = payment._id;

        this.http.put(`${this.baseUrl}/payments/${payment._id}/approve`, {}).subscribe({
          next: (response: any) => {
            if (response.success) {
              this.showMessage('Payment approved successfully', 'success');
              this.loadReport(); // Refresh the data
            }
            this.processingPaymentId = null;
          },
          error: (error) => {
            console.error('Error approving payment:', error);
            this.showMessage('Failed to approve payment', 'error');
            this.processingPaymentId = null;
          },
        });
      }
    });
  }

  recordPayment(payment: PaymentRecord): void {
    const dialogData: PaymentConfirmationData = {
      action: 'record',
      paymentId: payment._id,
      referenceNumber: payment.referenceNumber,
      memberName: payment.memberName,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      reservationDate: this.formatDate(payment.reservationDate),
      timeSlot: payment.timeSlotDisplay,
      existingPaymentDate: payment.paymentDate, // Pass existing date to remember it
    };

    const dialogRef = this.dialog.open(PaymentConfirmationDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      disableClose: true,
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.confirmed) {
        this.processingPaymentId = payment._id;

        // Include paymentDate if provided
        const requestBody = result.paymentDate ? { paymentDate: result.paymentDate } : {};

        this.http.put(`${this.baseUrl}/payments/${payment._id}/record`, requestBody).subscribe({
          next: (response: any) => {
            if (response.success) {
              this.showMessage('Payment recorded successfully', 'success');
              this.loadReport(); // Refresh the data
            }
            this.processingPaymentId = null;
          },
          error: (error) => {
            this.showMessage('Failed to record payment', 'error');
            this.processingPaymentId = null;
          },
        });
      }
    });
  }

  openRecordedPaymentsModal(): void {
    this.showRecordedModal = true;
    this.loadRecordedPayments();
  }

  closeRecordedModal(): void {
    this.showRecordedModal = false;
    this.recordedPayments = [];
  }

  loadRecordedPayments(): void {
    this.loadingRecordedPayments = true;

    // Fetch only completed payments (approved payments ready to be recorded)
    const params = {
      status: 'completed',
      limit: '1000', // Get all completed payments ready for recording
    };

    this.http
      .get<{ success: boolean; data: PaymentRecord[] }>(`${this.baseUrl}/payments`, { params })
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            // Transform the payments data
            this.recordedPayments = response.data.map((payment: any) => {
              const reservation = payment.reservationId || {};
              const poll = payment.pollId || {};
              const openPlayEvent = poll.openPlayEvent || {};

              // Determine payment type
              const isOpenPlayEvent = !!payment.pollId;
              const isManualPayment = payment.metadata?.isManualPayment;

              let players: string[] = [];
              let reservationDate: string;
              let timeSlot: number;
              let timeSlotDisplay: string;
              let openPlayParticipants: string[] = [];

              if (isManualPayment) {
                // Manual payment
                players = payment.metadata.playerNames || [];
                reservationDate = payment.metadata.courtUsageDate || new Date().toISOString();
                timeSlot = payment.metadata.startTime || 0;
                const endTime = payment.metadata.endTime || timeSlot + 1;
                timeSlotDisplay = `${timeSlot}:00-${endTime}:00`;
              } else if (isOpenPlayEvent) {
                // Open Play event
                reservationDate = openPlayEvent.eventDate || new Date().toISOString();
                timeSlot = openPlayEvent.startTime || 18;
                timeSlotDisplay = `${openPlayEvent.startTime || 18}:00-${openPlayEvent.endTime || 20}:00`;
                openPlayParticipants = (openPlayEvent.confirmedPlayers || []).map(
                  (p: any) => p.fullName,
                );
                players = openPlayParticipants; // For backward compatibility
              } else {
                // Court reservation
                // Map player objects to their names
                const playersArray = reservation.players || [];
                players = playersArray.map((p: any) => {
                  if (typeof p === 'string') return p;
                  // New format: objects with 'name' property
                  if (p.name) return p.name;
                  // Fallback to user object properties
                  return p.fullName || p.username || 'Unknown Player';
                });
                reservationDate = reservation.date || new Date().toISOString();
                timeSlot = reservation.timeSlot || 0;
                const endTimeSlot = reservation.endTimeSlot || timeSlot + 1;
                timeSlotDisplay = `${timeSlot}:00-${endTimeSlot}:00`;
              }

              return {
                ...payment,
                memberName: payment.userId?.fullName || 'Unknown',
                memberUsername: payment.userId?.username || 'unknown',
                reservationDate,
                timeSlot,
                timeSlotDisplay,
                players,
                openPlayParticipants,
                isOpenPlayEvent,
                isPeakHour: payment.metadata?.isPeakHour || false,
              };
            });
          }
          this.loadingRecordedPayments = false;
        },
        error: (error) => {
          console.error('Error loading recorded payments:', error);
          this.showMessage('Failed to load recorded payments', 'error');
          this.loadingRecordedPayments = false;
        },
      });
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatTime(hour: number): string {
    // Convert 24-hour format to 12-hour format with AM/PM
    const date = new Date();
    date.setHours(hour, 0, 0, 0); // Set hours, minutes, seconds, milliseconds

    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  exportRecordedToCSV(): void {
    if (!this.recordedPayments.length) {
      return;
    }

    const headers = [
      'Timestamp',
      'Member Name',
      'Date',
      'Start Time',
      'End Time',
      'Event Type',
      'Participants',
      'Paid to Cash/GCash',
      'Amount',
      'Recorded By',
      'Reference Number',
    ];

    const csvContent = [
      headers.join(','),
      ...this.recordedPayments.map((payment) =>
        [
          `"${this.formatDateTime(payment.recordedAt || payment.paymentDate || '')}"`,
          `"${payment.memberName}"`,
          `"${this.formatDate(payment.reservationDate)}"`,
          `"${this.formatTime(payment.timeSlot)}"`,
          `"${this.formatTime(payment.timeSlot + 1)}"`,
          payment.isOpenPlayEvent ? 'Open Play Event' : 'Court Reservation',
          payment.isOpenPlayEvent
            ? `"${payment.openPlayParticipants.join(', ')}"`
            : `"${payment.players.join(', ')}"`,
          `"${this.formatPaymentMethod(payment.paymentMethod)}"`,
          payment.amount.toFixed(2),
          `"${payment.recordedBy || ''}"`,
          `"${payment.referenceNumber}"`,
        ].join(','),
      ),
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);

      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `recorded_payments_${today}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  showMessage(message: string, type: 'success' | 'error' | 'warning'): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      panelClass: [`snackbar-${type}`],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  // Tab filtering methods
  getActivePayments(): PaymentRecord[] {
    if (!this.reportData || !this.reportData.payments) {
      return [];
    }
    return this.reportData.payments.filter((payment) => payment.status === 'completed');
  }

  getArchivedPayments(): PaymentRecord[] {
    if (!this.reportData || !this.reportData.payments) {
      return [];
    }
    return this.reportData.payments.filter(
      (payment) =>
        payment.status === 'record' || payment.status === 'refunded' || payment.status === 'failed',
    );
  }

  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      pending: 'Pending',
      completed: 'Approved',
      record: 'Recorded',
      failed: 'Cancelled',
      refunded: 'Cancelled',
    };
    return statusLabels[status] || status;
  }

  getParticipantsList(payment: PaymentRecord): string {
    if (!payment.isOpenPlayEvent || !payment.openPlayParticipants.length) {
      return '';
    }

    // Show first few names, then "and X others" if too many
    if (payment.openPlayParticipants.length <= 3) {
      return payment.openPlayParticipants.join(', ');
    } else {
      const firstThree = payment.openPlayParticipants.slice(0, 3).join(', ');
      const remaining = payment.openPlayParticipants.length - 3;
      return `${firstThree} and ${remaining} other${remaining !== 1 ? 's' : ''}`;
    }
  }

  getPlayersList(payment: PaymentRecord): string {
    if (payment.isOpenPlayEvent || !payment.players || !payment.players.length) {
      return '';
    }

    // Show first few names, then "and X others" if too many
    if (payment.players.length <= 3) {
      return payment.players.join(', ');
    } else {
      const firstThree = payment.players.slice(0, 3).join(', ');
      const remaining = payment.players.length - 3;
      return `${firstThree} and ${remaining} other${remaining !== 1 ? 's' : ''}`;
    }
  }

  unrecordPayment(paymentId: string): void {
    // Find payment details for confirmation
    const payment = this.getArchivedPayments().find((p) => p._id === paymentId);
    if (!payment) {
      this.snackBar.open('❌ Payment not found', 'Close', { duration: 3000 });
      return;
    }

    // Open modern confirmation dialog
    const dialogRef = this.dialog.open(UnrecordConfirmationDialogComponent, {
      width: '600px',
      data: {
        paymentId: payment._id,
        memberName: payment.memberName,
        amount: payment.amount,
        referenceNumber: payment.referenceNumber,
        description: payment.reservationDate
          ? `${new Date(payment.reservationDate).toLocaleDateString()} - ${payment.timeSlotDisplay}`
          : undefined,
      } as UnrecordDialogData,
      disableClose: true,
      panelClass: ['modern-dialog'],
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.processing.push(paymentId);

        this.http
          .put(`${this.baseUrl}/payments/${paymentId}/unrecord`, {
            notes: 'Unrecorded via Admin Court Receipts Report',
          })
          .subscribe({
            next: (response: any) => {
              this.processing = this.processing.filter((id) => id !== paymentId);
              this.snackBar.open('✅ Payment unrecorded successfully', 'Close', {
                duration: 4000,
                panelClass: ['success-snack'],
              });

              // Refresh the report data to show the changes
              this.loadReport();
            },
            error: (error) => {
              this.processing = this.processing.filter((id) => id !== paymentId);
              const message = error.error?.error || 'Failed to unrecord payment';
              this.snackBar.open(`❌ ${message}`, 'Close', {
                duration: 5000,
                panelClass: ['error-snack'],
              });
            },
          });
      }
    });
  }

  cancelPayment(payment: PaymentRecord): void {
    // Open confirmation dialog
    const dialogData: PaymentConfirmationData = {
      action: 'cancel',
      paymentId: payment._id,
      referenceNumber: payment.referenceNumber,
      memberName: payment.memberName,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      reservationDate: this.formatDate(payment.reservationDate),
      timeSlot: payment.timeSlotDisplay,
    };

    const dialogRef = this.dialog.open(PaymentConfirmationDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      disableClose: true,
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.confirmed) {
        this.processing.push(payment._id);

        this.http
          .put(`${this.baseUrl}/payments/${payment._id}/cancel`, {
            reason: result.reason || 'Cancelled by admin',
          })
          .subscribe({
            next: (response: any) => {
              this.processing = this.processing.filter((id) => id !== payment._id);
              this.snackBar.open('✅ Payment cancelled successfully', 'Close', {
                duration: 4000,
                panelClass: ['success-snack'],
              });

              // Refresh the report data to show the changes
              this.loadReport();
            },
            error: (error) => {
              this.processing = this.processing.filter((id) => id !== payment._id);
              const message = error.error?.error || 'Failed to cancel payment';
              this.snackBar.open(`❌ ${message}`, 'Close', {
                duration: 5000,
                panelClass: ['error-snack'],
              });
            },
          });
      }
    });
  }

  // Credit Deposits methods
  getCreditDeposits(): CreditTransaction[] {
    return this.creditDeposits;
  }

  loadCreditDeposits(): void {
    this.loadingCreditDeposits = true;
    const startDate = this.dateRangeForm.get('startDate')?.value;
    const endDate = this.dateRangeForm.get('endDate')?.value;

    const startDateStr = startDate ? startDate.toISOString().split('T')[0] : undefined;
    const endDateStr = endDate ? endDate.toISOString().split('T')[0] : undefined;

    this.creditService.getAllCreditDeposits(1, 100, undefined, startDateStr, endDateStr).subscribe({
      next: (response) => {
        if (response.success) {
          this.creditDeposits = response.data.transactions;
        }
        this.loadingCreditDeposits = false;
      },
      error: (error) => {
        console.error('Error loading credit deposits:', error);
        this.showMessage('Failed to load credit deposits', 'error');
        this.loadingCreditDeposits = false;
      },
    });
  }

  recordCreditDeposit(deposit: CreditTransaction): void {
    if (this.processing.includes(deposit._id)) {
      return; // Already processing
    }

    this.processing.push(deposit._id);
    this.creditService.recordCreditDeposit(deposit._id).subscribe({
      next: (response) => {
        if (response.success) {
          // Update the deposit status in the local array
          const index = this.creditDeposits.findIndex((d) => d._id === deposit._id);
          if (index !== -1) {
            this.creditDeposits[index] = { ...this.creditDeposits[index], status: 'recorded' };
          }
          this.showMessage('Credit deposit recorded successfully', 'success');
        }
        this.processing = this.processing.filter((id) => id !== deposit._id);
      },
      error: (error) => {
        console.error('Error recording credit deposit:', error);
        this.showMessage('Failed to record credit deposit', 'error');
        this.processing = this.processing.filter((id) => id !== deposit._id);
      },
    });
  }

  getUserFullName(userId: string | { fullName: string }): string {
    if (typeof userId === 'string') {
      return 'Unknown User';
    }
    return userId.fullName;
  }

  getUserUsername(userId: string | { username: string }): string {
    if (typeof userId === 'string') {
      return 'unknown';
    }
    return userId.username;
  }

  getPaymentMethodLabel(method: string): string {
    const methodMap: { [key: string]: string } = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      gcash: 'GCash',
    };
    return methodMap[method] || method || 'N/A';
  }

  formatTimeFromDate(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // Amount editing methods
  handleAmountClick(payment: PaymentRecord): void {
    // Only allow admins to edit amounts
    if (!this.authService.isAdmin()) {
      this.snackBar.open('Only admins can edit payment amounts', 'Close', {
        duration: 3000,
      });
      return;
    }

    // Check payment status restrictions
    if (payment.status === 'record') {
      this.snackBar.open(
        'Recorded payments cannot be edited. Use unrecord feature first.',
        'Close',
        {
          duration: 4000,
        },
      );
      return;
    }

    if (payment.status === 'refunded') {
      this.snackBar.open('Refunded payments cannot be edited.', 'Close', {
        duration: 4000,
      });
      return;
    }

    // Allow editing pending, completed, and failed payments
    if (!['pending', 'completed', 'failed'].includes(payment.status)) {
      this.snackBar.open(`Cannot edit ${payment.status} payments.`, 'Close', {
        duration: 4000,
      });
      return;
    }

    // If we get here, the payment can be edited
    this.openEditAmountModal(payment);
  }

  openEditAmountModal(payment: PaymentRecord): void {
    const dialogData: EditPaymentAmountData = {
      paymentId: payment._id,
      memberName: payment.memberName,
      currentAmount: payment.amount,
      reservationDate: payment.reservationDate,
      timeSlot: payment.timeSlotDisplay,
    };

    const dialogRef = this.dialog.open(EditPaymentAmountDialogComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: dialogData,
      disableClose: false,
      panelClass: 'edit-amount-dialog',
    });

    dialogRef.afterClosed().subscribe((newAmount) => {
      if (newAmount && newAmount !== payment.amount) {
        this.updatePaymentAmount(payment, newAmount);
      }
    });
  }

  canEditPayment(payment: PaymentRecord): boolean {
    if (!this.authService.isAdmin()) {
      return false;
    }

    // Admins can edit pending, completed, and failed payments
    return ['pending', 'completed', 'failed'].includes(payment.status);
  }

  getAmountTitle(payment: PaymentRecord): string {
    if (!this.authService.isAdmin()) {
      return 'Only admins can edit payment amounts';
    }

    if (this.canEditPayment(payment)) {
      return 'Click to edit amount';
    }

    const titles: { [key: string]: string } = {
      record: 'Payment recorded in financial reports - use unrecord feature first',
      refunded: 'Refunded payments cannot be edited',
    };
    return titles[payment.status] || 'Amount cannot be edited';
  }

  getAmountIcon(status: string): string {
    // Show edit icon for editable payments
    if (['pending', 'completed', 'failed'].includes(status)) {
      return 'edit';
    }

    const icons: { [key: string]: string } = {
      record: 'assignment',
      refunded: 'money_off',
    };
    return icons[status] || 'lock';
  }

  private updatePaymentAmount(payment: PaymentRecord, newAmount: number): void {
    this.updatingPayment = true;

    const updateData = {
      customAmount: newAmount,
    };

    this.http.put<any>(`${this.apiUrl}/payments/${payment._id}`, updateData).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Payment amount updated successfully', 'Close', {
            duration: 3000,
          });

          // Update the payment in the local data
          if (this.reportData && this.reportData.payments) {
            const paymentIndex = this.reportData.payments.findIndex((p) => p._id === payment._id);
            if (paymentIndex !== -1) {
              this.reportData.payments[paymentIndex].amount = newAmount;
            }
          }
        } else {
          this.snackBar.open(response.message || 'Failed to update payment amount', 'Close', {
            duration: 3000,
          });
        }
      },
      error: (error) => {
        console.error('Error updating payment amount:', error);
        this.snackBar.open('Error updating payment amount', 'Close', {
          duration: 3000,
        });
      },
      complete: () => {
        this.updatingPayment = false;
      },
    });
  }
}
