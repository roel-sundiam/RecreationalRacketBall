import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-pending-clubs',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule,
    MatCardModule
  ],
  templateUrl: './pending-clubs.component.html',
  styleUrls: ['./pending-clubs.component.scss']
})
export class PendingClubsComponent implements OnInit {
  pendingClubs: any[] = [];
  displayedColumns: string[] = ['name', 'sport', 'owner', 'contactEmail', 'contactPhone', 'createdAt', 'actions'];
  loading = false;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadPendingClubs();
  }

  async loadPendingClubs(): Promise<void> {
    this.loading = true;
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/clubs/platform/pending`
      ).toPromise();

      if (response.success) {
        this.pendingClubs = response.data;
      }
    } catch (error: any) {
      console.error('Error loading pending clubs:', error);
      this.snackBar.open('Failed to load pending clubs', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.loading = false;
    }
  }

  async approveClub(club: any): Promise<void> {
    const dialogRef = this.dialog.open(ApproveClubDialog, {
      width: '500px',
      data: { clubName: club.name, sport: club.sport }
    });

    const confirmed = await dialogRef.afterClosed().toPromise();
    if (!confirmed) {
      return;
    }

    try {
      const response: any = await this.http.post(
        `${environment.apiUrl}/clubs/platform/${club._id}/review`,
        { action: 'approve' }
      ).toPromise();

      if (response.success) {
        this.snackBar.open('Club approved successfully!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.loadPendingClubs(); // Refresh list
      }
    } catch (error: any) {
      console.error('Error approving club:', error);
      this.snackBar.open('Failed to approve club', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }

  async rejectClub(club: any): Promise<void> {
    const dialogRef = this.dialog.open(RejectClubDialog, {
      width: '500px',
      data: { clubName: club.name, sport: club.sport }
    });

    const reason = await dialogRef.afterClosed().toPromise();
    if (!reason) {
      return;
    }

    try {
      const response: any = await this.http.post(
        `${environment.apiUrl}/clubs/platform/${club._id}/review`,
        { action: 'reject', rejectionReason: reason }
      ).toPromise();

      if (response.success) {
        this.snackBar.open('Club registration rejected', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.loadPendingClubs(); // Refresh list
      }
    } catch (error: any) {
      console.error('Error rejecting club:', error);
      this.snackBar.open('Failed to reject club', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }
}

// Approve Club Dialog Component
@Component({
  selector: 'approve-club-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <mat-icon class="dialog-icon success">check_circle</mat-icon>
        <h2 mat-dialog-title>Approve Club Registration</h2>
      </div>

      <mat-dialog-content>
        <p class="dialog-message">
          Are you sure you want to approve the registration for:
        </p>
        <div class="club-info">
          <strong>{{ data.clubName }}</strong>
          <span class="sport-badge">{{ data.sport }}</span>
        </div>
        <p class="dialog-note">
          This will activate the club and grant the owner admin access.
        </p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()" class="cancel-btn">
          <mat-icon>close</mat-icon>
          Cancel
        </button>
        <button mat-raised-button color="primary" (click)="onConfirm()" class="confirm-btn">
          <mat-icon>check</mat-icon>
          Approve Club
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 8px;
    }
    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .dialog-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      &.success {
        color: #4caf50;
      }
    }
    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }
    .dialog-message {
      margin: 0 0 12px 0;
      color: #666;
    }
    .club-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
      margin: 12px 0;
      strong {
        font-size: 16px;
        color: #333;
      }
    }
    .sport-badge {
      display: inline-block;
      padding: 4px 12px;
      background: #2196f3;
      color: white;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .dialog-note {
      margin: 12px 0 0 0;
      font-size: 13px;
      color: #888;
    }
    mat-dialog-actions {
      margin-top: 24px;
      padding: 0;
      gap: 8px;
    }
    .cancel-btn {
      color: #666;
    }
    .confirm-btn {
      mat-icon {
        margin-right: 4px;
      }
    }
  `]
})
export class ApproveClubDialog {
  constructor(
    public dialogRef: MatDialogRef<ApproveClubDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { clubName: string; sport: string }
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}

// Reject Club Dialog Component
@Component({
  selector: 'reject-club-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, FormsModule],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <mat-icon class="dialog-icon error">cancel</mat-icon>
        <h2 mat-dialog-title>Reject Club Registration</h2>
      </div>

      <mat-dialog-content>
        <p class="dialog-message">
          You are about to reject the registration for:
        </p>
        <div class="club-info">
          <strong>{{ data.clubName }}</strong>
          <span class="sport-badge">{{ data.sport }}</span>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Reason for Rejection</mat-label>
          <textarea
            matInput
            [(ngModel)]="reason"
            placeholder="Please provide a reason for rejecting this club registration..."
            rows="4"
            required></textarea>
          <mat-hint>This will be visible to the club owner</mat-hint>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()" class="cancel-btn">
          <mat-icon>close</mat-icon>
          Cancel
        </button>
        <button
          mat-raised-button
          color="warn"
          (click)="onConfirm()"
          [disabled]="!reason || reason.trim().length === 0"
          class="reject-btn">
          <mat-icon>block</mat-icon>
          Reject Club
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      padding: 8px;
    }
    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .dialog-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      &.error {
        color: #f44336;
      }
    }
    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }
    .dialog-message {
      margin: 0 0 12px 0;
      color: #666;
    }
    .club-info {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #fff3e0;
      border-left: 4px solid #ff9800;
      border-radius: 4px;
      margin: 12px 0 24px 0;
      strong {
        font-size: 16px;
        color: #333;
      }
    }
    .sport-badge {
      display: inline-block;
      padding: 4px 12px;
      background: #ff9800;
      color: white;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .full-width {
      width: 100%;
      margin-top: 8px;
    }
    mat-dialog-actions {
      margin-top: 24px;
      padding: 0;
      gap: 8px;
    }
    .cancel-btn {
      color: #666;
    }
    .reject-btn {
      mat-icon {
        margin-right: 4px;
      }
    }
  `]
})
export class RejectClubDialog {
  reason: string = '';

  constructor(
    public dialogRef: MatDialogRef<RejectClubDialog>,
    @Inject(MAT_DIALOG_DATA) public data: { clubName: string; sport: string }
  ) {}

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onConfirm(): void {
    if (this.reason && this.reason.trim().length > 0) {
      this.dialogRef.close(this.reason.trim());
    }
  }
}
