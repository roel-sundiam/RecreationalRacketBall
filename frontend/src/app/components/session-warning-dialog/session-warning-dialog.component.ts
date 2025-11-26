import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface SessionWarningDialogData {
  remainingTimeMs: number;
  canExtend: boolean; // Future: if backend supports token refresh
}

@Component({
  selector: 'app-session-warning-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './session-warning-dialog.component.html',
  styleUrls: ['./session-warning-dialog.component.scss']
})
export class SessionWarningDialogComponent implements OnInit, OnDestroy {
  remainingTime: string = '';
  private updateInterval?: any;

  constructor(
    public dialogRef: MatDialogRef<SessionWarningDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SessionWarningDialogData
  ) {}

  ngOnInit() {
    this.updateRemainingTime(this.data.remainingTimeMs);

    // Start internal countdown for display
    this.updateInterval = setInterval(() => {
      this.data.remainingTimeMs -= 1000;
      if (this.data.remainingTimeMs <= 0) {
        // Countdown reached 0, close dialog with 'expired' result
        this.dialogRef.close('expired');
      } else {
        this.updateRemainingTime(this.data.remainingTimeMs);
      }
    }, 1000);
  }

  updateRemainingTime(ms: number): void {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    this.remainingTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  onStayLoggedIn(): void {
    this.dialogRef.close('stay');
  }

  onLogout(): void {
    this.dialogRef.close('logout');
  }

  ngOnDestroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}
