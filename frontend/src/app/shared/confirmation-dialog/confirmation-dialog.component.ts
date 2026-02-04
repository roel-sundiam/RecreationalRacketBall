import { Component, Inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { A11yModule } from '@angular/cdk/a11y';

export interface ConfirmationDialogData {
  title: string;
  message: string;
  details?: string[];  // Multi-line bullet points for complex confirmations
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
  icon?: string;
  alertMode?: boolean;  // If true, hide cancel button (for alert() replacement)
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    A11yModule
  ],
  template: `
    <div class="confirmation-dialog" cdkTrapFocus [cdkTrapFocusAutoCapture]="true">
      <div class="dialog-header" [ngClass]="'dialog-' + (data.type || 'info')">
        <mat-icon class="dialog-icon" aria-hidden="true">{{ data.icon || getDefaultIcon() }}</mat-icon>
        <h2 mat-dialog-title id="dialog-title">{{ data.title }}</h2>
      </div>

      <div mat-dialog-content class="dialog-content">
        <p>{{ data.message }}</p>
        <ul *ngIf="data.details && data.details.length > 0" class="dialog-details">
          <li *ngFor="let detail of data.details">{{ detail }}</li>
        </ul>
      </div>

      <div mat-dialog-actions class="dialog-actions">
        <button
          *ngIf="!data.alertMode"
          mat-button
          (click)="onCancel()"
          class="cancel-button">
          {{ data.cancelText || 'Cancel' }}
        </button>

        <button
          mat-raised-button
          [color]="getButtonColor()"
          (click)="onConfirm()"
          class="confirm-button"
          cdkFocusInitial>
          {{ data.confirmText || 'Confirm' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirmation-dialog {
      max-width: 450px;
      min-width: 320px;
      padding: 0;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 28px 28px 20px 28px;
      margin: -24px -24px 0 -24px;
      border-radius: 4px 4px 0 0;
      position: relative;
    }

    .dialog-header.dialog-warning {
      background: linear-gradient(135deg, #fff8e1 0%, #fff3e0 100%);
      border-bottom: 2px solid #ffb74d;
    }

    .dialog-header.dialog-warning .dialog-icon {
      color: #f57c00;
      background: rgba(245, 124, 0, 0.1);
      border: 2px solid #f57c00;
    }

    .dialog-header.dialog-danger {
      background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
      border-bottom: 2px solid #ef5350;
    }

    .dialog-header.dialog-danger .dialog-icon {
      color: #d32f2f;
      background: rgba(211, 47, 47, 0.1);
      border: 2px solid #d32f2f;
    }

    .dialog-header.dialog-info {
      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
      border-bottom: 2px solid #42a5f5;
    }

    .dialog-header.dialog-info .dialog-icon {
      color: #1976d2;
      background: rgba(25, 118, 210, 0.1);
      border: 2px solid #1976d2;
    }

    .dialog-icon {
      font-size: 28px;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      flex-shrink: 0;
    }

    h2 {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
      color: rgba(0, 0, 0, 0.87);
      letter-spacing: 0.5px;
    }

    .dialog-content {
      padding: 24px 0 8px 0;
      font-size: 16px;
      line-height: 1.6;
      color: rgba(0, 0, 0, 0.87);
    }

    .dialog-content p {
      margin: 0 0 12px 0;
      white-space: pre-line;
    }

    .dialog-details {
      margin: 12px 0 0 0;
      padding-left: 20px;
      font-size: 15px;
      line-height: 1.6;
      color: rgba(0, 0, 0, 0.7);
    }

    .dialog-details li {
      margin-bottom: 8px;
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 20px;
      margin-top: 16px;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
    }

    .cancel-button {
      color: rgba(0, 0, 0, 0.6);
      min-width: 90px;
      height: 42px;
      font-size: 15px;
      font-weight: 500;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .confirm-button {
      min-width: 110px;
      height: 42px;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .confirm-button:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }

    /* Mobile bottom sheet */
    @media (max-width: 767px) {
      .confirmation-dialog {
        min-width: 100vw;
        max-width: 100vw;
        margin: 0;
        border-radius: 24px 24px 0 0;
      }

      .dialog-header {
        padding: 24px 24px 18px 24px;
        border-radius: 24px 24px 0 0;
      }

      .dialog-icon {
        width: 52px;
        height: 52px;
        font-size: 30px;
      }

      h2 {
        font-size: 20px;
      }

      .dialog-content {
        padding: 20px 0 8px 0;
        font-size: 15px;
      }

      .dialog-actions {
        flex-direction: column-reverse;
        gap: 10px;
        padding-top: 16px;
      }

      .cancel-button,
      .confirm-button {
        width: 100%;
        min-height: 50px;
        font-size: 16px;
      }
    }

    /* Tablet adjustments */
    @media (min-width: 768px) and (max-width: 1024px) {
      .confirmation-dialog {
        min-width: 400px;
      }
    }

    /* Accessibility - focus indicators */
    button:focus-visible {
      outline: 3px solid #1976d2;
      outline-offset: 2px;
    }

    /* Respect reduced motion preferences */
    @media (prefers-reduced-motion: reduce) {
      * {
        animation: none !important;
        transition: none !important;
      }
    }
  `]
})
export class ConfirmationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
  ) {
    // Configure dialog for accessibility
    dialogRef.addPanelClass('accessible-dialog');
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    // ESC key closes dialog with false (cancel)
    if (!this.data.alertMode && event instanceof KeyboardEvent) {
      event.preventDefault();
      this.onCancel();
    }
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnterKey(event: Event): void {
    // Enter key confirms if not focused on cancel button
    if (event instanceof KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (!target.classList.contains('cancel-button')) {
        event.preventDefault();
        this.onConfirm();
      }
    }
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getDefaultIcon(): string {
    switch (this.data.type) {
      case 'warning':
        return 'warning';
      case 'danger':
        return 'error';
      case 'info':
      default:
        return 'info';
    }
  }

  getButtonColor(): string {
    switch (this.data.type) {
      case 'danger':
        return 'warn';
      case 'warning':
        return 'accent';
      case 'info':
      default:
        return 'primary';
    }
  }
}