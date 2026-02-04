import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {
  MatDialog,
  MatDialogModule,
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface User {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  membershipYearsPaid?: number[];
  lastMembershipPaymentDate?: Date;
}

interface MembershipPayment {
  _id: string;
  userId: {
    _id: string;
    fullName: string;
    username: string;
    email: string;
    membershipYearsPaid: number[];
  };
  membershipYear: number;
  amount: number;
  paymentMethod: string;
  paymentDate: Date;
  notes?: string;
  recordedBy?: {
    _id: string;
    fullName: string;
    username: string;
  };
  recordedAt: Date;
  createdAt: Date;
}

@Component({
  selector: 'app-admin-membership-payments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <!-- Modern Gradient Header -->
      <div class="modern-header">
        <div class="header-content">
          <div class="header-left">
            <div class="icon-wrapper">
              <mat-icon>card_membership</mat-icon>
            </div>
            <div class="title-group">
              <h1>Membership Payments</h1>
              <p class="subtitle">Record and manage annual membership fees</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="main-content">
        <!-- Two Column Layout -->
        <div class="content-grid">
          <!-- Form Card -->
          <div class="form-section">
            <div class="card">
              <div class="card-header">
                <div class="header-title">
                  <mat-icon>add_circle</mat-icon>
                  <h2>Record Payment</h2>
                </div>
              </div>

              <div class="card-content">
                <form [formGroup]="paymentForm" (ngSubmit)="recordPayment()" class="form">
                  <div class="form-group">
                    <label for="userId" class="form-label">Select Member</label>
                    <select
                      id="userId"
                      formControlName="userId"
                      (change)="onMemberSelected()"
                      class="form-input"
                    >
                      <option value="">Choose a member...</option>
                      <option *ngFor="let user of members" [value]="user._id">
                        {{ user.fullName }} ({{ user.username }})
                      </option>
                    </select>
                    <span
                      class="form-error"
                      *ngIf="
                        paymentForm.get('userId')?.hasError('required') &&
                        paymentForm.get('userId')?.touched
                      "
                    >
                      Please select a member
                    </span>
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label for="membershipYear" class="form-label">Membership Year</label>
                      <select
                        id="membershipYear"
                        formControlName="membershipYear"
                        class="form-input"
                      >
                        <option [value]="2024">2024</option>
                        <option [value]="2025">2025</option>
                        <option [value]="2026">2026</option>
                        <option [value]="2027">2027</option>
                        <option [value]="2028">2028</option>
                      </select>
                    </div>

                    <div class="form-group">
                      <label for="amount" class="form-label">Amount (₱)</label>
                      <input
                        id="amount"
                        type="number"
                        formControlName="amount"
                        min="0"
                        step="0.01"
                        class="form-input"
                        placeholder="0.00"
                      />
                      <span
                        class="form-error"
                        *ngIf="
                          paymentForm.get('amount')?.hasError('required') &&
                          paymentForm.get('amount')?.touched
                        "
                      >
                        Amount is required
                      </span>
                    </div>
                  </div>

                  <div class="form-row">
                    <div class="form-group">
                      <label for="paymentMethod" class="form-label">Payment Method</label>
                      <select id="paymentMethod" formControlName="paymentMethod" class="form-input">
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="gcash">GCash</option>
                      </select>
                    </div>

                    <div class="form-group">
                      <label for="paymentDate" class="form-label">Payment Date</label>
                      <input
                        id="paymentDate"
                        type="date"
                        formControlName="paymentDate"
                        class="form-input"
                      />
                    </div>
                  </div>

                  <div class="form-group">
                    <label for="notes" class="form-label">Notes (Optional)</label>
                    <textarea
                      id="notes"
                      formControlName="notes"
                      maxlength="500"
                      class="form-input textarea"
                      rows="2"
                      placeholder="Add any notes..."
                    ></textarea>
                    <span class="form-hint"
                      >{{ paymentForm.get('notes')?.value?.length || 0 }}/500</span
                    >
                  </div>

                  <div class="form-actions">
                    <button
                      type="submit"
                      [disabled]="!paymentForm.valid || isSubmitting"
                      class="submit-btn"
                    >
                      <mat-icon>{{ isSubmitting ? 'hourglass_empty' : 'save' }}</mat-icon>
                      {{ isSubmitting ? 'Recording...' : 'Record Payment' }}
                    </button>
                    <button type="button" (click)="resetForm()" class="reset-btn">
                      <mat-icon>refresh</mat-icon>
                      Reset
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <!-- Payment History Card -->
          <div class="history-section">
            <div class="card">
              <div class="card-header">
                <div class="header-title">
                  <mat-icon>history</mat-icon>
                  <h2>Payment History</h2>
                </div>
              </div>

              <div class="card-content">
                <!-- Filter -->
                <div class="filter-section">
                  <select
                    [(ngModel)]="filterYear"
                    (change)="loadPayments()"
                    class="form-input filter-input"
                  >
                    <option [value]="null">All Years</option>
                    <option [value]="2024">2024</option>
                    <option [value]="2025">2025</option>
                    <option [value]="2026">2026</option>
                    <option [value]="2027">2027</option>
                    <option [value]="2028">2028</option>
                  </select>
                </div>

                <!-- Loading State -->
                <div class="loading-state" *ngIf="isLoading">
                  <mat-spinner diameter="40"></mat-spinner>
                  <p>Loading payments...</p>
                </div>

                <!-- Table -->
                <div class="table-wrapper" *ngIf="!isLoading && payments.length > 0">
                  <table mat-table [dataSource]="payments" class="data-table">
                    <!-- Member Column -->
                    <ng-container matColumnDef="member">
                      <th mat-header-cell *matHeaderCellDef>Member</th>
                      <td mat-cell *matCellDef="let payment">
                        <div class="member-info">
                          <div class="member-name">{{ payment.userId.fullName }}</div>
                          <div class="member-username">@{{ payment.userId.username }}</div>
                        </div>
                      </td>
                    </ng-container>

                    <!-- Year Column -->
                    <ng-container matColumnDef="year">
                      <th mat-header-cell *matHeaderCellDef>Year</th>
                      <td mat-cell *matCellDef="let payment">
                        <span class="year-badge">{{ payment.membershipYear }}</span>
                      </td>
                    </ng-container>

                    <!-- Amount Column -->
                    <ng-container matColumnDef="amount">
                      <th mat-header-cell *matHeaderCellDef>Amount</th>
                      <td mat-cell *matCellDef="let payment">
                        <span *ngIf="payment.amount > 0" class="amount"
                          >₱{{ payment.amount.toFixed(2) }}</span
                        >
                        <span *ngIf="payment.amount === 0" class="waived-badge">WAIVED</span>
                      </td>
                    </ng-container>

                    <!-- Method Column -->
                    <ng-container matColumnDef="method">
                      <th mat-header-cell *matHeaderCellDef>Method</th>
                      <td mat-cell *matCellDef="let payment">
                        {{ formatPaymentMethod(payment.paymentMethod) }}
                      </td>
                    </ng-container>

                    <!-- Date Column -->
                    <ng-container matColumnDef="date">
                      <th mat-header-cell *matHeaderCellDef>Date</th>
                      <td mat-cell *matCellDef="let payment">
                        {{ payment.paymentDate | date: 'MMM d, yyyy' }}
                      </td>
                    </ng-container>

                    <!-- Actions Column -->
                    <ng-container matColumnDef="actions">
                      <th mat-header-cell *matHeaderCellDef>Actions</th>
                      <td mat-cell *matCellDef="let payment">
                        <div class="action-buttons">
                          <button
                            mat-icon-button
                            color="primary"
                            (click)="editPayment(payment)"
                            matTooltip="Edit"
                          >
                            <mat-icon>edit</mat-icon>
                          </button>
                          <button
                            mat-icon-button
                            color="warn"
                            (click)="deletePayment(payment)"
                            matTooltip="Delete"
                          >
                            <mat-icon>delete</mat-icon>
                          </button>
                        </div>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns; sticky: true"></tr>
                    <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
                  </table>
                </div>

                <!-- No Data -->
                <div class="no-data" *ngIf="!isLoading && payments.length === 0">
                  <mat-icon>receipt_long</mat-icon>
                  <h3>No Payments Found</h3>
                  <p>No membership payments recorded yet. Start by recording a new payment.</p>
                </div>

                <!-- Summary Cards -->
                <div class="summary-section" *ngIf="!isLoading && payments.length > 0">
                  <div class="summary-grid">
                    <div class="summary-card">
                      <div class="summary-icon">
                        <mat-icon>receipt</mat-icon>
                      </div>
                      <div class="summary-info">
                        <div class="summary-label">Total Payments</div>
                        <div class="summary-value">{{ summary.count }}</div>
                      </div>
                    </div>

                    <div class="summary-card" *ngIf="summary.waivedCount > 0">
                      <div class="summary-icon waived">
                        <mat-icon>card_giftcard</mat-icon>
                      </div>
                      <div class="summary-info">
                        <div class="summary-label">Waived</div>
                        <div class="summary-value">{{ summary.waivedCount }}</div>
                      </div>
                    </div>

                    <div class="summary-card highlight">
                      <div class="summary-icon">
                        <mat-icon>monetization_on</mat-icon>
                      </div>
                      <div class="summary-info">
                        <div class="summary-label">Total Collected</div>
                        <div class="summary-value amount">
                          ₱{{
                            summary.totalAmount.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          }}
                        </div>
                      </div>
                    </div>

                    <div class="summary-card" *ngIf="summary.years.length > 0">
                      <div class="summary-icon">
                        <mat-icon>calendar_today</mat-icon>
                      </div>
                      <div class="summary-info">
                        <div class="summary-label">Years</div>
                        <div class="summary-value years">{{ summary.years.join(', ') }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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

      /* ===== PAGE CONTAINER ===== */
      .page-container {
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
        font-size: 29px;
        width: 29px;
        height: 29px;
        color: white;
      }

      .title-group h1 {
        margin: 0;
        color: white;
        font-size: 2rem;
        font-weight: 700;
        letter-spacing: -0.025em;
      }

      .subtitle {
        margin: 0.5rem 0 0;
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.88rem;
        font-weight: 400;
      }

      /* ===== MAIN CONTENT ===== */
      .main-content {
        max-width: 1400px;
        margin: -2rem auto 0;
        padding: 0 2rem;
        position: relative;
        z-index: 2;
      }

      /* ===== CONTENT GRID ===== */
      .content-grid {
        display: grid;
        grid-template-columns: 1fr 1.5fr;
        gap: 2rem;
      }

      /* ===== CARD STYLES ===== */
      .card {
        background: var(--card-bg);
        border-radius: 16px;
        box-shadow: var(--shadow-lg);
        overflow: hidden;
        animation: slideUp 0.5s ease forwards;
        opacity: 0;
      }

      .form-section .card {
        animation-delay: 0.1s;
      }

      .history-section .card {
        animation-delay: 0.2s;
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

      .card-header {
        background: linear-gradient(
          135deg,
          var(--primary-gradient-start) 0%,
          var(--primary-gradient-mid) 100%
        );
        padding: 1.5rem 2rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .header-title {
        display: flex;
        align-items: center;
        gap: 1rem;
        color: white;
      }

      .header-title mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }

      .header-title h2 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 600;
      }

      .card-content {
        padding: 2rem;
      }

      /* ===== FORM STYLES ===== */
      .form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }

      .form-label {
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--text-primary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: block;
      }

      .form-input {
        padding: 0.75rem 1rem;
        border: 2px solid var(--border-color);
        border-radius: 8px;
        font-size: 0.72rem;
        font-family: inherit;
        background: white;
        color: var(--text-primary);
        transition: all 0.3s ease;
      }

      .form-input:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        background: white;
      }

      .form-input:hover:not(:disabled) {
        border-color: var(--primary-color);
      }

      .form-input:disabled {
        background: var(--neutral-bg);
        color: var(--text-secondary);
        cursor: not-allowed;
      }

      .form-input.textarea {
        resize: vertical;
        min-height: 80px;
        padding: 0.75rem 1rem;
        font-family: inherit;
      }

      .form-error {
        font-size: 0.64rem;
        color: var(--danger-color);
        font-weight: 500;
        display: block;
        margin-top: 0.25rem;
      }

      .form-hint {
        font-size: 0.64rem;
        color: var(--text-secondary);
        display: block;
        margin-top: 0.4rem;
        text-align: right;
      }

      .form-row {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }

      .full-width {
        grid-column: 1 / -1;
      }

      .half-width {
        width: 100%;
      }

      .form-actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 1.5rem;
      }

      .submit-btn {
        flex: 1;
        height: 44px;
        padding: 0 1.5rem;
        font-size: 0.8rem;
        font-weight: 600;
        border: none;
        border-radius: 8px;
        background: linear-gradient(
          135deg,
          var(--primary-gradient-start) 0%,
          var(--primary-gradient-mid) 100%
        );
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }

      .submit-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(79, 70, 229, 0.3);
      }

      .submit-btn:disabled {
        background: var(--border-color);
        color: var(--text-secondary);
        cursor: not-allowed;
        transform: none;
      }

      .submit-btn mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .reset-btn {
        height: 44px;
        padding: 0 1.5rem;
        border: 2px solid var(--border-color);
        border-radius: 8px;
        background: white;
        color: var(--text-primary);
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        font-size: 0.8rem;
      }

      .reset-btn:hover {
        border-color: var(--primary-color);
        background: rgba(79, 70, 229, 0.05);
        color: var(--primary-color);
      }

      .reset-btn mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      /* ===== FILTER SECTION ===== */
      .filter-section {
        margin-bottom: 1.5rem;
      }

      .filter-input {
        width: 100%;
        max-width: 250px;
        padding: 0.75rem 1rem;
        border: 2px solid var(--border-color);
        border-radius: 8px;
        font-size: 0.72rem;
        font-weight: 500;
        background: white;
        color: var(--text-primary);
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .filter-input:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
      }

      .filter-input:hover {
        border-color: var(--primary-color);
      }

      /* ===== TABLE STYLES ===== */
      .table-wrapper {
        overflow-x: auto;
        overflow-y: auto;
        max-height: 55vh;
        margin-bottom: 1.5rem;
      }

      .data-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
      }

      .data-table th {
        background: var(--neutral-bg);
        color: var(--text-primary);
        font-weight: 600;
        font-size: 0.56rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 0.75rem 0.5rem;
        border-bottom: 2px solid var(--border-color);
        white-space: nowrap;
        position: sticky;
        top: 0;
        z-index: 10;
      }

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

      .data-table td {
        padding: 0.75rem 0.5rem;
        border-bottom: 1px solid var(--border-color);
        font-size: 0.56rem;
        color: var(--text-primary);
      }

      .member-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .member-name {
        font-weight: 600;
        color: var(--primary-color);
      }

      .member-username {
        font-size: 0.5rem;
        color: var(--text-secondary);
      }

      .year-badge {
        background: rgba(99, 102, 241, 0.1);
        color: var(--primary-color);
        padding: 0.2rem 0.6rem;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.56rem;
        display: inline-block;
      }

      .amount {
        font-weight: 600;
        color: var(--success-color);
      }

      .waived-badge {
        background: #e0e7ff;
        color: var(--primary-color);
        padding: 0.2rem 0.6rem;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: inline-block;
      }

      .action-buttons {
        display: flex;
        gap: 0.5rem;
        align-items: center;
        justify-content: center;
      }

      .action-buttons button {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        transition: all 0.2s ease;
      }

      .action-buttons button:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .action-buttons mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      /* ===== LOADING STATE ===== */
      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 2rem;
        gap: 1rem;
      }

      .loading-state p {
        color: var(--text-secondary);
        margin: 0;
      }

      /* ===== NO DATA STATE ===== */
      .no-data {
        text-align: center;
        padding: 3rem 2rem;
        color: var(--text-secondary);
      }

      .no-data mat-icon {
        font-size: 51px;
        width: 51px;
        height: 51px;
        opacity: 0.5;
        margin-bottom: 1rem;
      }

      .no-data h3 {
        margin: 0 0 0.5rem;
        color: var(--text-primary);
        font-size: 1.2rem;
        font-weight: 600;
      }

      .no-data p {
        margin: 0;
        font-size: 1rem;
      }

      /* ===== SUMMARY SECTION ===== */
      .summary-section {
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 2px solid var(--border-color);
      }

      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1rem;
      }

      .summary-card {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 1rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        transition: all 0.3s ease;
      }

      .summary-card:hover {
        border-color: var(--primary-color);
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.1);
      }

      .summary-card.highlight {
        background: linear-gradient(
          135deg,
          var(--primary-gradient-start) 0%,
          var(--primary-gradient-mid) 100%
        );
        border: none;
        color: white;
      }

      .summary-card.highlight .summary-label,
      .summary-card.highlight .summary-value {
        color: white;
      }

      .summary-card.highlight .summary-icon {
        background: rgba(255, 255, 255, 0.2);
      }

      .summary-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: linear-gradient(
          135deg,
          rgba(99, 102, 241, 0.1) 0%,
          rgba(124, 58, 237, 0.1) 100%
        );
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .summary-icon mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: var(--primary-color);
      }

      .summary-card.highlight .summary-icon mat-icon {
        color: white;
      }

      .summary-card.waived .summary-icon {
        background: rgba(245, 158, 11, 0.1);
      }

      .summary-card.waived .summary-icon mat-icon {
        color: var(--warning-color);
      }

      .summary-info {
        flex: 1;
      }

      .summary-label {
        margin: 0;
        font-size: 0.6rem;
        color: var(--text-secondary);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .summary-value {
        margin: 0.35rem 0 0;
        font-size: 1.12rem;
        font-weight: 700;
        color: var(--text-primary);
        line-height: 1;
      }

      .summary-value.amount {
        font-size: 1.28rem;
        letter-spacing: -0.5px;
      }

      .summary-value.years {
        font-size: 1.25rem;
      }

      /* ===== RESPONSIVE DESIGN ===== */
      @media (max-width: 1200px) {
        .content-grid {
          grid-template-columns: 1fr;
        }

        .card-content {
          padding: 1.5rem;
        }
      }

      @media (max-width: 768px) {
        .modern-header {
          padding: 1.5rem 1rem 2rem;
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
        }

        .header-left {
          flex-direction: row;
          gap: 0.75rem;
        }

        .icon-wrapper {
          width: 48px;
          height: 48px;
        }

        .icon-wrapper mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
        }

        .title-group h1 {
          font-size: 1.5rem;
        }

        .subtitle {
          font-size: 0.9rem;
        }

        .main-content {
          margin-top: -1rem;
          padding: 0 1rem;
        }

        .form-row {
          grid-template-columns: 1fr;
        }

        .form-input {
          padding: 0.7rem 0.9rem;
          font-size: 0.9rem;
        }

        .form-label {
          font-size: 0.8rem;
        }

        .filter-input {
          max-width: 100%;
        }
      }

      @media (max-width: 480px) {
        .modern-header {
          padding: 1rem 0.75rem 1.5rem;
        }

        .header-left {
          gap: 0.5rem;
        }

        .icon-wrapper {
          width: 40px;
          height: 40px;
        }

        .icon-wrapper mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
        }

        .title-group h1 {
          font-size: 1.25rem;
        }

        .subtitle {
          font-size: 0.8rem;
        }

        .main-content {
          padding: 0 0.5rem;
        }

        .card-content {
          padding: 1rem;
        }

        .form {
          gap: 1rem;
        }
        .form-actions {
          gap: 0.75rem;
        }

        .submit-btn,
        .reset-btn {
          height: 44px;
          font-size: 0.9rem;
          padding: 0 1rem;
        }

        .form {
          gap: 0.85rem;
        }

        .form-group {
          gap: 0.3rem;
        }

        .form-row {
          gap: 0.75rem;
        }

        .form-input {
          padding: 0.65rem 0.85rem;
          font-size: 0.85rem;
        }

        .form-label {
          font-size: 0.75rem;
        }

        .form-hint {
          font-size: 0.75rem;
        }

        .form-error {
          font-size: 0.75rem;
        }

        .filter-input {
          max-width: 100%;
          padding: 0.65rem 0.85rem;
          font-size: 0.9rem;
        }

        .card-header {
          padding: 1rem;
        }

        .header-title h2 {
          font-size: 1.15rem;
        }

        .table-wrapper {
          max-height: 35vh;
        }

        .data-table th,
        .data-table td {
          padding: 0.65rem 0.4rem;
          font-size: 0.75rem;
        }

        .summary-grid {
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }

        .summary-card {
          padding: 0.85rem;
          gap: 0.75rem;
        }

        .summary-value {
          font-size: 1.15rem;
        }

        .summary-value.amount {
          font-size: 1.25rem;
        }
      }
    `,
  ],
})
export class AdminMembershipPaymentsComponent implements OnInit {
  paymentForm: FormGroup;
  members: User[] = [];
  payments: MembershipPayment[] = [];
  isLoading = false;
  isSubmitting = false;
  filterYear: number | null = null;
  currentYear = new Date().getFullYear();
  displayedColumns: string[] = ['member', 'year', 'amount', 'method', 'date', 'actions'];
  summary = {
    count: 0,
    totalAmount: 0,
    waivedCount: 0,
    years: [] as number[],
  };

  private apiUrl = environment.apiUrl;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {
    this.paymentForm = this.fb.group({
      userId: ['', Validators.required],
      membershipYear: [2026, Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      paymentMethod: ['cash', Validators.required],
      paymentDate: [new Date(), Validators.required],
      notes: ['', Validators.maxLength(500)],
    });
  }

  ngOnInit(): void {
    this.loadMembers();
    this.loadPayments();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  loadMembers(): void {
    // Request maximum allowed members (100 per page)
    // If you have more than 100 members, we'll need to implement pagination or increase backend limit
    this.http
      .get<any>(`${this.apiUrl}/members?limit=100`, { headers: this.getAuthHeaders() })
      .subscribe({
        next: (response) => {
          this.members = response.data || response;
          console.log('Loaded members:', this.members.length);

          // If we got 100 members, there might be more - load additional pages
          if (this.members.length === 100) {
            this.loadAdditionalMembers(2);
          }
        },
        error: (error) => {
          console.error('Error loading members:', error);
          this.snackBar.open('Failed to load members', 'Close', { duration: 3000 });
        },
      });
  }

  loadAdditionalMembers(page: number): void {
    this.http
      .get<any>(`${this.apiUrl}/members?limit=100&page=${page}`, { headers: this.getAuthHeaders() })
      .subscribe({
        next: (response) => {
          const additionalMembers = response.data || response;
          if (additionalMembers.length > 0) {
            this.members = [...this.members, ...additionalMembers];
            console.log('Total members loaded:', this.members.length);

            // If we got 100 more members, load next page
            if (additionalMembers.length === 100) {
              this.loadAdditionalMembers(page + 1);
            }
          }
        },
        error: (error) => {
          console.error('Error loading additional members:', error);
        },
      });
  }

  loadPayments(): void {
    this.isLoading = true;
    let url = `${this.apiUrl}/payments/membership-fees`;

    if (this.filterYear !== null) {
      url += `?year=${this.filterYear}`;
    }

    this.http.get<any>(url, { headers: this.getAuthHeaders() }).subscribe({
      next: (response) => {
        this.payments = response.data.payments || [];
        this.summary = response.data.summary || { count: 0, totalAmount: 0, years: [] };
        this.isLoading = false;
        console.log('Loaded payments:', this.payments.length);
      },
      error: (error) => {
        console.error('Error loading payments:', error);
        this.snackBar.open('Failed to load payments', 'Close', { duration: 3000 });
        this.isLoading = false;
      },
    });
  }

  onMemberSelected(): void {
    const userId = this.paymentForm.get('userId')?.value;
    const member = this.members.find((m) => m._id === userId);

    if (member && member.membershipYearsPaid && member.membershipYearsPaid.length > 0) {
      const paidYears = member.membershipYearsPaid;
      console.log(`Member has paid for years: ${paidYears.join(', ')}`);
    }
  }

  recordPayment(): void {
    if (this.paymentForm.invalid) {
      return;
    }

    this.isSubmitting = true;
    const formValue = this.paymentForm.value;
    const editingPaymentId = (this.paymentForm as any).editingPaymentId;

    // Format the payment date to ISO string
    const paymentData = {
      ...formValue,
      paymentDate:
        formValue.paymentDate instanceof Date
          ? formValue.paymentDate.toISOString()
          : formValue.paymentDate,
    };

    // Check if we're editing an existing payment
    const request = editingPaymentId
      ? this.http.patch<any>(
          `${this.apiUrl}/payments/membership-fees/${editingPaymentId}`,
          paymentData,
          { headers: this.getAuthHeaders() },
        )
      : this.http.post<any>(`${this.apiUrl}/payments/membership-fee`, paymentData, {
          headers: this.getAuthHeaders(),
        });

    request.subscribe({
      next: (response) => {
        const message = editingPaymentId
          ? 'Membership payment updated successfully'
          : 'Membership payment recorded successfully';
        this.snackBar.open(response.message || message, 'Close', { duration: 3000 });
        this.isSubmitting = false;
        this.resetForm();
        delete (this.paymentForm as any).editingPaymentId; // Clear editing state
        this.loadPayments();
        this.loadMembers(); // Reload to get updated membershipYearsPaid
      },
      error: (error) => {
        console.error('Error recording/updating payment:', error);
        const errorMessage =
          error.error?.message ||
          `Failed to ${editingPaymentId ? 'update' : 'record'} membership payment`;
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        this.isSubmitting = false;
      },
    });
  }

  resetForm(): void {
    this.paymentForm.reset({
      userId: '',
      membershipYear: 2026,
      amount: 0,
      paymentMethod: 'cash',
      paymentDate: new Date(),
      notes: '',
    });
  }

  formatPaymentMethod(method: string): string {
    const methodMap: { [key: string]: string } = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      gcash: 'GCash',
    };
    return methodMap[method] || method;
  }

  editPayment(payment: MembershipPayment): void {
    // Populate form with payment data for editing
    this.paymentForm.patchValue({
      userId: payment.userId._id,
      membershipYear: payment.membershipYear,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentDate: new Date(payment.paymentDate),
      notes: payment.notes || '',
    });

    // Store the payment ID for updating
    (this.paymentForm as any).editingPaymentId = payment._id;

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });

    this.snackBar.open(`Editing payment for ${payment.userId.fullName}`, 'Close', {
      duration: 3000,
    });
  }

  deletePayment(payment: MembershipPayment): void {
    const dialogRef = this.dialog.open(DeleteConfirmationDialog, {
      width: '500px',
      data: {
        memberName: payment.userId.fullName,
        year: payment.membershipYear,
        amount: payment.amount,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      const headers = new HttpHeaders({
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      });

      this.http
        .delete(`${this.apiUrl}/payments/membership-fees/${payment._id}`, { headers })
        .subscribe({
          next: (response: any) => {
            this.snackBar.open(response.message || 'Payment deleted successfully', 'Close', {
              duration: 3000,
            });
            this.loadPayments(); // Reload the list
          },
          error: (error) => {
            console.error('Error deleting payment:', error);
            this.snackBar.open(error.error?.message || 'Failed to delete payment', 'Close', {
              duration: 5000,
            });
          },
        });
    });
  }
}

// Delete Confirmation Dialog Component
@Component({
  selector: 'delete-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="delete-dialog">
      <div class="dialog-header">
        <mat-icon class="warning-icon">warning</mat-icon>
        <h2 mat-dialog-title>Delete Payment Confirmation</h2>
      </div>
      <mat-dialog-content>
        <p class="warning-text">Are you sure you want to delete this payment?</p>
        <div class="payment-details">
          <div class="detail-row">
            <span class="label">Member:</span>
            <span class="value">{{ data.memberName }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Year:</span>
            <span class="value">{{ data.year }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Amount:</span>
            <span class="value">₱{{ data.amount.toFixed(2) }}</span>
          </div>
        </div>
        <p class="danger-text">
          <mat-icon>error_outline</mat-icon>
          This action cannot be undone and will remove {{ data.year }} from the member's paid years.
        </p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()" class="cancel-btn">Cancel</button>
        <button mat-raised-button color="warn" (click)="onConfirm()" class="delete-btn">
          <mat-icon>delete</mat-icon>
          Delete Payment
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .delete-dialog {
        padding: 8px;
      }

      .dialog-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      }

      .warning-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #ff9800;
      }

      h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 500;
        color: #2c3e50;
      }

      mat-dialog-content {
        padding: 0 16px;
        min-height: 200px;
      }

      .warning-text {
        font-size: 16px;
        color: #555;
        margin-bottom: 20px;
      }

      .payment-details {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #e9ecef;
      }

      .detail-row:last-child {
        border-bottom: none;
      }

      .label {
        font-weight: 600;
        color: #6c757d;
      }

      .value {
        font-weight: 500;
        color: #2c3e50;
      }

      .danger-text {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #fff3cd;
        border-left: 4px solid #ff9800;
        padding: 12px;
        border-radius: 4px;
        color: #856404;
        font-size: 14px;
        margin: 0;
      }

      .danger-text mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #ff9800;
      }

      mat-dialog-actions {
        padding: 16px;
        gap: 12px;
      }

      .cancel-btn {
        min-width: 100px;
      }

      .delete-btn {
        min-width: 160px;
      }

      .delete-btn mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        margin-right: 8px;
      }
    `,
  ],
})
export class DeleteConfirmationDialog {
  constructor(
    public dialogRef: MatDialogRef<DeleteConfirmationDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { memberName: string; year: number; amount: number },
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
