import { Component, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { Announcement, AnnouncementService } from '../../services/announcement.service';

export interface AnnouncementModalData {
  announcement: Announcement;
}

@Component({
  selector: 'app-announcement-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  template: `
    <div class="announcement-modal">
      <div mat-dialog-title class="modal-header">
        <div class="header-content">
          <mat-icon class="header-icon">campaign</mat-icon>
          <div class="header-text">
            <h2>{{data.announcement.title}}</h2>
          </div>
        </div>
        <button mat-icon-button (click)="dismiss()" class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div mat-dialog-content class="modal-content">
        <div class="announcement-content">
          {{data.announcement.content}}
        </div>
      </div>

      <div mat-dialog-actions class="modal-actions">
        <button mat-raised-button color="primary" (click)="dismiss()">
          <mat-icon>check</mat-icon>
          Dismiss
        </button>
      </div>
    </div>
  `,
  styleUrl: './announcement-modal.component.scss'
})
export class AnnouncementModalComponent implements OnDestroy {
  constructor(
    public dialogRef: MatDialogRef<AnnouncementModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AnnouncementModalData,
    private announcementService: AnnouncementService
  ) {
    // Prevent backdrop click from closing the modal
    this.dialogRef.disableClose = false;
  }

  /**
   * Dismiss the announcement and close the modal
   */
  dismiss(): void {
    // Call API to dismiss announcement
    this.announcementService.dismissAnnouncement(this.data.announcement._id).subscribe({
      next: (response) => {
        console.log('📢 Announcement dismissed successfully:', response);
        this.dialogRef.close();
      },
      error: (error) => {
        console.error('📢 Error dismissing announcement:', error);
        // Close anyway to avoid blocking the user
        this.dialogRef.close();
      }
    });
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }
}
