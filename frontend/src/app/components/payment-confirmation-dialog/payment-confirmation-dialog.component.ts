import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';

export interface PaymentConfirmationData {
  action: 'approve' | 'record' | 'cancel';
  paymentId: string;
  referenceNumber: string;
  memberName: string;
  amount: number;
  paymentMethod: string;
  reservationDate: string;
  timeSlot: string;
  existingPaymentDate?: string; // Remember previous payment date when re-recording
}

export interface PaymentConfirmationResult {
  confirmed: boolean;
  paymentDate?: Date;
}

@Component({
  selector: 'app-payment-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatInputModule,
    MatFormFieldModule,
    MatNativeDateModule,
    FormsModule
  ],
  template: `
    <div class="confirmation-dialog">
      <div class="dialog-header">
        <mat-icon class="action-icon"
                  [class.approve-icon]="data.action === 'approve'"
                  [class.record-icon]="data.action === 'record'"
                  [class.cancel-icon]="data.action === 'cancel'">
          {{data.action === 'approve' ? 'check_circle' : (data.action === 'cancel' ? 'cancel' : 'verified')}}
        </mat-icon>
        <h2 mat-dialog-title>{{getActionTitle()}}</h2>
      </div>

      <div mat-dialog-content class="dialog-content">
        <p class="confirmation-message">{{getConfirmationMessage()}}</p>
        
        <div class="payment-details">
          <div class="detail-row">
            <span class="detail-label">Payment Reference:</span>
            <span class="detail-value">{{data.referenceNumber}}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Member:</span>
            <span class="detail-value">{{data.memberName}}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span class="detail-value amount">₱{{data.amount.toFixed(2)}}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Payment Method:</span>
            <span class="detail-value">{{formatPaymentMethod(data.paymentMethod)}}</span>
          </div>
          
          <div class="detail-row">
            <span class="detail-label">Reservation:</span>
            <span class="detail-value">{{data.reservationDate}} at {{data.timeSlot}}</span>
          </div>
        </div>

        <!-- Payment Date Selector (only for record action) -->
        <div class="payment-date-section" *ngIf="data.action === 'record'">
          <mat-form-field appearance="fill" class="payment-date-field">
            <mat-label>Payment Date</mat-label>
            <input matInput [matDatepicker]="picker" [(ngModel)]="selectedPaymentDate" required>
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
            <mat-hint>Choose which year this payment should appear in</mat-hint>
          </mat-form-field>
        </div>

        <div class="warning-message" *ngIf="data.action === 'record'">
          <mat-icon>info</mat-icon>
          <span>The payment will appear in the financial statement for the year of the Payment Date selected above.</span>
        </div>

        <div class="warning-message cancel-warning" *ngIf="data.action === 'cancel'">
          <mat-icon>warning</mat-icon>
          <span>This payment will be cancelled and moved to the Archived Payments tab. The reservation payment status will be reverted to pending.</span>
        </div>
      </div>

      <div mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="onCancel()" class="cancel-button">
          <mat-icon>close</mat-icon>
          Cancel
        </button>
        <button
          mat-raised-button
          [color]="getConfirmButtonColor()"
          (click)="onConfirm()"
          class="confirm-button">
          <mat-icon>{{data.action === 'approve' ? 'check' : (data.action === 'cancel' ? 'cancel' : 'verified')}}</mat-icon>
          {{getActionTitle()}}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirmation-dialog {
      min-width: 400px;
      max-width: 500px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
    }

    .action-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .approve-icon {
      color: #2196f3;
    }

    .record-icon {
      color: #4caf50;
    }

    .cancel-icon {
      color: #f44336;
    }

    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }

    .dialog-content {
      padding: 16px 0;
    }

    .confirmation-message {
      font-size: 16px;
      margin-bottom: 20px;
      color: #333;
      line-height: 1.4;
    }

    .payment-details {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid #e0e0e0;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .detail-label {
      font-weight: 500;
      color: #666;
      font-size: 14px;
    }

    .detail-value {
      font-weight: 600;
      color: #333;
      font-size: 14px;
    }

    .detail-value.amount {
      color: #1976d2;
      font-size: 16px;
    }

    .warning-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 6px;
      color: #856404;
      font-size: 14px;
    }

    .warning-message mat-icon {
      color: #ff9800;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .payment-date-section {
      margin: 16px 0;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .payment-date-field {
      width: 100%;
    }

    .cancel-warning {
      background: #ffebee;
      border: 1px solid #ef9a9a;
      color: #c62828;
    }

    .cancel-warning mat-icon {
      color: #f44336;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .cancel-button {
      color: #666;
    }

    .cancel-button:hover {
      background-color: #f5f5f5;
    }

    .confirm-button {
      min-width: 120px;
    }

    .confirm-button mat-icon {
      margin-right: 4px;
    }

    @media (max-width: 600px) {
      .confirmation-dialog {
        min-width: 280px;
        max-width: 95vw;
      }
      
      .dialog-actions {
        flex-direction: column-reverse;
        gap: 8px;
      }
      
      .cancel-button,
      .confirm-button {
        width: 100%;
      }
    }
  `]
})
export class PaymentConfirmationDialogComponent {
  selectedPaymentDate: Date;

  constructor(
    public dialogRef: MatDialogRef<PaymentConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PaymentConfirmationData
  ) {
    // If this payment was previously recorded, remember the date
    // Otherwise default to Jan 1, 2026
    this.selectedPaymentDate = data.existingPaymentDate
      ? new Date(data.existingPaymentDate)
      : new Date('2026-01-01');
  }

  getActionTitle(): string {
    if (this.data.action === 'approve') return 'Approve Payment';
    if (this.data.action === 'cancel') return 'Cancel Payment';
    return 'Record Payment';
  }

  getConfirmationMessage(): string {
    if (this.data.action === 'approve') {
      return `Are you sure you want to approve this payment? This will mark the payment as approved and ready to be recorded.`;
    } else if (this.data.action === 'cancel') {
      return `Are you sure you want to cancel this payment? This will move the payment to the Archived Payments tab and revert the reservation payment status to pending.`;
    } else {
      return `Are you sure you want to record this payment? This will mark the payment as fully processed and recorded in the system.`;
    }
  }

  getConfirmButtonColor(): string {
    if (this.data.action === 'approve') return 'primary';
    if (this.data.action === 'cancel') return 'warn';
    return 'accent';
  }

  formatPaymentMethod(method: string): string {
    const methodMap: {[key: string]: string} = {
      'cash': 'Cash',
      'bank_transfer': 'Bank Transfer',
      'gcash': 'GCash',
      'coins': 'Coins'
    };
    return methodMap[method] || method;
  }

  onCancel(): void {
    this.dialogRef.close({ confirmed: false });
  }

  onConfirm(): void {
    this.dialogRef.close({
      confirmed: true,
      paymentDate: this.data.action === 'record' ? this.selectedPaymentDate : undefined
    });
  }
}