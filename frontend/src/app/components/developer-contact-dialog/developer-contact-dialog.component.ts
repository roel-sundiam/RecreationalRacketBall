import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-developer-contact-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './developer-contact-dialog.component.html',
  styleUrls: ['./developer-contact-dialog.component.scss']
})
export class DeveloperContactDialogComponent {
  developerEmail = 'sundiamr@aol.com';
  developerPhone = '09175105185';
  developerPortfolio = 'https://github.com/roel-sundiam';

  constructor(
    public dialogRef: MatDialogRef<DeveloperContactDialogComponent>,
    private snackBar: MatSnackBar
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  copyEmail(): void {
    navigator.clipboard.writeText(this.developerEmail).then(() => {
      this.snackBar.open('Email copied to clipboard!', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    }).catch(() => {
      this.snackBar.open('Failed to copy email', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    });
  }

  callPhone(): void {
    window.location.href = `tel:${this.developerPhone}`;
  }

  openPortfolio(): void {
    window.open(this.developerPortfolio, '_blank');
  }
}
