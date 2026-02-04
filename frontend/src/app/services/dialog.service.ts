import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmationDialogComponent } from '../shared/confirmation-dialog/confirmation-dialog.component';

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  details?: string[];  // Multi-line bullet points
  type?: 'warning' | 'danger' | 'info';
  icon?: string;
  confirmText?: string;
  cancelText?: string;
}

export interface AlertDialogConfig {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'danger';
  icon?: string;
  buttonText?: string;
}

export interface DeleteDialogConfig {
  title?: string;
  message: string;
  itemName?: string;  // Name of item being deleted
  confirmText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  constructor(private dialog: MatDialog) {}

  /**
   * Show a confirmation dialog requiring user to confirm or cancel
   * @param config Dialog configuration
   * @returns Observable<boolean> - true if confirmed, false if cancelled
   */
  confirm(config: ConfirmDialogConfig): Observable<boolean> {
    const dialogRef: MatDialogRef<ConfirmationDialogComponent, boolean> = this.dialog.open(
      ConfirmationDialogComponent,
      {
        width: '450px',
        maxWidth: '92vw',
        disableClose: false,
        autoFocus: true,
        restoreFocus: true,
        panelClass: 'modern-dialog-container',
        hasBackdrop: true,
        backdropClass: 'modern-dialog-backdrop',
        data: {
          title: config.title,
          message: config.message,
          details: config.details,
          type: config.type || 'info',
          icon: config.icon,
          confirmText: config.confirmText || 'Confirm',
          cancelText: config.cancelText || 'Cancel',
          alertMode: false
        }
      }
    );

    return dialogRef.afterClosed();
  }

  /**
   * Show an alert dialog with single OK button (replaces native alert())
   * @param config Dialog configuration
   * @returns Observable<void> - completes when user acknowledges
   */
  alert(config: AlertDialogConfig): Observable<void> {
    const dialogRef: MatDialogRef<ConfirmationDialogComponent, boolean> = this.dialog.open(
      ConfirmationDialogComponent,
      {
        width: '450px',
        maxWidth: '92vw',
        disableClose: false,
        autoFocus: true,
        restoreFocus: true,
        panelClass: 'modern-dialog-container',
        hasBackdrop: true,
        backdropClass: 'modern-dialog-backdrop',
        data: {
          title: config.title,
          message: config.message,
          type: config.type || 'info',
          icon: config.icon,
          confirmText: config.buttonText || 'OK',
          alertMode: true  // Hide cancel button
        }
      }
    );

    return new Observable(observer => {
      dialogRef.afterClosed().subscribe(() => {
        observer.next();
        observer.complete();
      });
    });
  }

  /**
   * Show a delete confirmation dialog (specialized danger dialog)
   * @param config Dialog configuration
   * @returns Observable<boolean> - true if confirmed, false if cancelled
   */
  delete(config: DeleteDialogConfig): Observable<boolean> {
    const itemName = config.itemName ? ` "${config.itemName}"` : '';
    const title = config.title || 'Confirm Delete';
    const message = config.message || `Are you sure you want to delete${itemName}?`;

    return this.confirm({
      title,
      message,
      type: 'danger',
      icon: 'delete',
      confirmText: config.confirmText || 'Delete',
      cancelText: 'Cancel'
    });
  }
}
