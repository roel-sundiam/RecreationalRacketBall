import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AnnouncementService, Announcement } from '../../../services/announcement.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-announcement-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './announcement-management.component.html',
  styleUrl: './announcement-management.component.scss'
})
export class AnnouncementManagementComponent implements OnInit {
  announcementForm: FormGroup;
  announcements: Announcement[] = [];
  isLoading = false;
  isSubmitting = false;
  displayedColumns: string[] = ['title', 'content', 'createdBy', 'createdAt', 'actions'];

  constructor(
    private fb: FormBuilder,
    private announcementService: AnnouncementService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.announcementForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      content: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]]
    });
  }

  ngOnInit(): void {
    this.loadAnnouncements();
  }

  /**
   * Load all announcements
   */
  loadAnnouncements(): void {
    this.isLoading = true;
    this.announcementService.getAllAnnouncements(1, 50).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.announcements = response.data.announcements || [];
          console.log('📢 Loaded announcements:', this.announcements.length);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('📢 Error loading announcements:', error);
        this.snackBar.open('Failed to load announcements', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  /**
   * Create new announcement
   */
  onSubmit(): void {
    if (this.announcementForm.invalid) {
      this.snackBar.open('Please fill in all required fields correctly', 'Close', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;
    const { title, content } = this.announcementForm.value;

    this.announcementService.createAnnouncement(title, content).subscribe({
      next: (response) => {
        if (response.success) {
          this.snackBar.open('Announcement created successfully! All users will see it.', 'Close', { duration: 4000 });
          this.announcementForm.reset();
          this.loadAnnouncements();
        } else {
          this.snackBar.open(response.message || 'Failed to create announcement', 'Close', { duration: 3000 });
        }
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('📢 Error creating announcement:', error);
        this.snackBar.open(error.error?.message || 'Failed to create announcement', 'Close', { duration: 3000 });
        this.isSubmitting = false;
      }
    });
  }

  /**
   * Stop announcement (deactivate it)
   */
  stopAnnouncement(announcement: Announcement): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: {
        title: 'Stop Announcement',
        message: `Stop "${announcement.title}"? It will no longer show to users, but you can reactivate it later.`,
        confirmText: 'Stop',
        cancelText: 'Cancel',
        confirmColor: 'accent',
        icon: 'pause_circle'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      this.announcementService.stopAnnouncement(announcement._id).subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open('Announcement stopped successfully', 'Close', { duration: 3000 });
            this.loadAnnouncements();
          } else {
            this.snackBar.open(response.message || 'Failed to stop announcement', 'Close', { duration: 3000 });
          }
        },
        error: (error) => {
          console.error('📢 Error stopping announcement:', error);
          this.snackBar.open(error.error?.message || 'Failed to stop announcement', 'Close', { duration: 3000 });
        }
      });
    });
  }

  /**
   * Activate announcement (reactivate a stopped announcement)
   */
  activateAnnouncement(announcement: Announcement): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: {
        title: 'Activate Announcement',
        message: `Activate "${announcement.title}"? It will start showing to all users again.`,
        confirmText: 'Activate',
        cancelText: 'Cancel',
        confirmColor: 'primary',
        icon: 'play_circle'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      this.announcementService.activateAnnouncement(announcement._id).subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open('Announcement activated! All users will see it now.', 'Close', { duration: 4000 });
            this.loadAnnouncements();
          } else {
            this.snackBar.open(response.message || 'Failed to activate announcement', 'Close', { duration: 3000 });
          }
        },
        error: (error) => {
          console.error('📢 Error activating announcement:', error);
          this.snackBar.open(error.error?.message || 'Failed to activate announcement', 'Close', { duration: 3000 });
        }
      });
    });
  }

  /**
   * Edit announcement (opens a dialog)
   */
  editAnnouncement(announcement: Announcement): void {
    const dialogRef = this.dialog.open(EditAnnouncementDialogComponent, {
      width: '600px',
      data: { announcement }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.announcementService.updateAnnouncement(announcement._id, result.title, result.content).subscribe({
          next: (response) => {
            if (response.success) {
              this.snackBar.open('Announcement updated successfully!', 'Close', { duration: 3000 });
              this.loadAnnouncements();
            } else {
              this.snackBar.open(response.message || 'Failed to update announcement', 'Close', { duration: 3000 });
            }
          },
          error: (error) => {
            console.error('📢 Error updating announcement:', error);
            this.snackBar.open(error.error?.message || 'Failed to update announcement', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  /**
   * Delete announcement
   */
  deleteAnnouncement(announcement: Announcement): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: {
        title: 'Delete Announcement',
        message: `Are you sure you want to permanently delete "${announcement.title}"? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmColor: 'warn',
        icon: 'delete_forever'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;

      this.announcementService.deleteAnnouncement(announcement._id).subscribe({
        next: (response) => {
          if (response.success) {
            this.snackBar.open('Announcement deleted successfully', 'Close', { duration: 3000 });
            this.loadAnnouncements();
          } else {
            this.snackBar.open(response.message || 'Failed to delete announcement', 'Close', { duration: 3000 });
          }
        },
        error: (error) => {
          console.error('📢 Error deleting announcement:', error);
          this.snackBar.open(error.error?.message || 'Failed to delete announcement', 'Close', { duration: 3000 });
        }
      });
    });
  }

  /**
   * Get creator name
   */
  getCreatorName(announcement: Announcement): string {
    const creator = announcement.createdBy;
    if (creator.firstName && creator.lastName) {
      return `${creator.firstName} ${creator.lastName}`;
    }
    return creator.username || 'Unknown';
  }

  /**
   * Format date to readable string
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  /**
   * Get truncated content for table display
   */
  getTruncatedContent(content: string, maxLength: number = 100): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  }
}

// Edit Announcement Dialog Component
@Component({
  selector: 'app-edit-announcement-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>edit</mat-icon>
      Edit Announcement
    </h2>
    <mat-dialog-content>
      <form [formGroup]="editForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Title</mat-label>
          <input
            matInput
            formControlName="title"
            placeholder="Enter announcement title"
            maxlength="100"
          />
          <mat-hint align="end">{{ editForm.get('title')?.value?.length || 0 }}/100</mat-hint>
          <mat-error *ngIf="editForm.get('title')?.hasError('required')">
            Title is required
          </mat-error>
          <mat-error *ngIf="editForm.get('title')?.hasError('minlength')">
            Title must be at least 3 characters
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Content</mat-label>
          <textarea
            matInput
            formControlName="content"
            placeholder="Enter announcement content"
            rows="3"
            maxlength="1000"
          ></textarea>
          <mat-hint align="end">{{ editForm.get('content')?.value?.length || 0 }}/1000</mat-hint>
          <mat-error *ngIf="editForm.get('content')?.hasError('required')">
            Content is required
          </mat-error>
          <mat-error *ngIf="editForm.get('content')?.hasError('minlength')">
            Content must be at least 10 characters
          </mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="editForm.invalid"
        (click)="save()"
      >
        <mat-icon>save</mat-icon>
        Save Changes
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 1.2rem;
      font-weight: 500;
      margin: 0;
    }
    .full-width {
      width: 100%;
      margin-bottom: 12px;
    }
    mat-dialog-content {
      min-height: 250px;
      padding: 16px 24px !important;
    }
    mat-dialog-actions {
      padding: 12px 24px 16px !important;
    }
    ::ng-deep {
      .mat-mdc-form-field-infix {
        min-height: 40px !important;
        padding-top: 8px !important;
        padding-bottom: 8px !important;
      }
      .mat-mdc-floating-label {
        font-size: 0.9rem !important;
      }
      .mat-mdc-form-field-flex {
        padding-top: 0 !important;
      }
      input.mat-mdc-input-element {
        font-size: 0.85rem !important;
        padding: 6px 0 !important;
        line-height: 1.3 !important;
      }
      textarea.mat-mdc-input-element {
        font-size: 0.85rem !important;
        padding: 4px 0 !important;
        line-height: 1.35 !important;
      }
      .mat-mdc-form-field-hint,
      .mat-mdc-form-field-error {
        font-size: 0.7rem !important;
        margin-top: 2px !important;
      }
      .mat-mdc-form-field-subscript-wrapper {
        margin-top: 2px !important;
      }
      .mat-mdc-text-field-wrapper.mdc-text-field--outlined {
        padding-left: 12px !important;
        padding-right: 12px !important;
      }
      button {
        height: 38px !important;
        font-size: 0.85rem !important;
      }
      mat-icon {
        font-size: 1.05rem !important;
        width: 1.05rem !important;
        height: 1.05rem !important;
      }
    }
  `]
})
export class EditAnnouncementDialogComponent {
  editForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EditAnnouncementDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { announcement: Announcement }
  ) {
    this.editForm = this.fb.group({
      title: [data.announcement.title, [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      content: [data.announcement.content, [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]]
    });
  }

  save(): void {
    if (this.editForm.valid) {
      this.dialogRef.close(this.editForm.value);
    }
  }
}
