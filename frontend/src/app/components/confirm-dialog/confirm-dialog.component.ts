import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'accent' | 'warn';
  icon?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="confirm-dialog">
      <div mat-dialog-title class="dialog-header">
        <mat-icon class="dialog-icon" [class.warn]="data.confirmColor === 'warn'" [class.primary]="data.confirmColor === 'primary'">
          {{ data.icon || 'help_outline' }}
        </mat-icon>
        <h2>{{ data.title }}</h2>
      </div>

      <mat-dialog-content class="dialog-content">
        <p>{{ data.message }}</p>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions" align="end">
        <button
          mat-button
          (click)="onCancel()"
          class="cancel-button"
        >
          {{ data.cancelText || 'Cancel' }}
        </button>
        <button
          mat-raised-button
          [color]="data.confirmColor || 'primary'"
          (click)="onConfirm()"
          class="confirm-button"
        >
          {{ data.confirmText || 'Confirm' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      min-width: 380px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 20px 12px 20px;
      margin: 0;

      h2 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 500;
        color: #333;
      }

      .dialog-icon {
        font-size: 1.6rem;
        width: 1.6rem;
        height: 1.6rem;
        color: #666;

        &.primary {
          color: #2196f3;
        }

        &.warn {
          color: #f44336;
        }
      }
    }

    .dialog-content {
      padding: 0 20px 16px 20px;

      p {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.5;
        color: #666;
      }
    }

    .dialog-actions {
      padding: 12px 20px 16px 20px;
      gap: 10px;

      button {
        height: 38px;
        font-size: 0.9rem;
      }

      .cancel-button {
        color: #666;
      }

      .confirm-button {
        min-width: 90px;
      }
    }

    /* Mobile Responsive */
    @media (max-width: 600px) {
      .confirm-dialog {
        min-width: 90vw;
      }

      .dialog-header {
        padding: 16px 14px 10px 14px;

        h2 {
          font-size: 1.1rem;
        }

        .dialog-icon {
          font-size: 1.5rem;
          width: 1.5rem;
          height: 1.5rem;
        }
      }

      .dialog-content {
        padding: 0 14px 12px 14px;

        p {
          font-size: 0.85rem;
        }
      }

      .dialog-actions {
        padding: 10px 14px 12px 14px;
        flex-direction: column-reverse;
        gap: 8px;

        button {
          width: 100%;
          margin: 0;
          height: 40px;
          font-size: 0.9rem;
        }
      }
    }

    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
      * {
        transition: none !important;
        animation: none !important;
      }
    }

    @media (prefers-contrast: high) {
      .dialog-header {
        border-bottom: 2px solid #000;

        h2 {
          color: #000;
        }
      }

      .dialog-content p {
        color: #000;
      }
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
