import { Component, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
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
        <div class="announcement-content" [innerHTML]="getLinkedContent()" (click)="handleContentClick($event)">
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
    private announcementService: AnnouncementService,
    private sanitizer: DomSanitizer
  ) {
    // Prevent backdrop click from closing the modal
    this.dialogRef.disableClose = false;
  }

  /**
   * Convert URLs in content to clickable links
   */
  getLinkedContent(): SafeHtml {
    const content = this.data.announcement.content;

    // Regular expression to match URLs, excluding trailing punctuation
    // Matches http:// or https:// followed by any non-whitespace characters
    // But excludes trailing punctuation like . , ! ? ; :
    const urlRegex = /(https?:\/\/[^\s]+?)([.,!?;:]*)(\s|$)/g;

    // Replace URLs with anchor tags
    const linkedContent = content.replace(urlRegex, (match, url, punctuation, whitespace) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="announcement-link">${url}</a>${punctuation}${whitespace}`;
    });

    // Preserve line breaks
    const formattedContent = linkedContent.replace(/\n/g, '<br>');

    // Use bypassSecurityTrustHtml instead of sanitize to preserve anchor tags
    return this.sanitizer.bypassSecurityTrustHtml(formattedContent);
  }

  /**
   * Handle clicks on content to ensure links work properly
   */
  handleContentClick(event: MouseEvent): void {
    console.log('📢 Content clicked, target:', event.target);

    let target = event.target as HTMLElement;

    // Walk up the DOM tree to find an anchor tag (in case a child element was clicked)
    while (target && target !== event.currentTarget) {
      console.log('📢 Checking element:', target.tagName, target);

      if (target.tagName === 'A' || target.tagName === 'a') {
        const anchor = target as HTMLAnchorElement;
        const href = anchor.getAttribute('href');

        console.log('📢 Anchor found! href:', href);

        // Prevent default and manually open the link
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (href) {
          console.log('📢 Opening link in new tab:', href);
          window.open(href, '_blank', 'noopener,noreferrer');
        }
        return;
      }

      target = target.parentElement as HTMLElement;
    }

    console.log('📢 No anchor tag found in click path');
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
