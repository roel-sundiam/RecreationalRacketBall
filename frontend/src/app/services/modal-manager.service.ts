import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { OpenPlayNotificationModalComponent } from '../components/open-play-notification-modal/open-play-notification-modal.component';
import { AnnouncementModalComponent } from '../components/announcement-modal/announcement-modal.component';
import { Announcement } from './announcement.service';

@Injectable({
  providedIn: 'root'
})
export class ModalManagerService {
  private activeOpenPlayModal: MatDialogRef<OpenPlayNotificationModalComponent> | null = null;
  private isOpenPlayModalPending = false;
  private pendingTimeout: any = null;

  // Announcement modal management
  private activeAnnouncementModal: MatDialogRef<AnnouncementModalComponent> | null = null;
  private announcementQueue: Announcement[] = [];
  private isProcessingAnnouncement = false;

  constructor(private dialog: MatDialog) {}

  /**
   * Show Open Play notification modal with deduplication
   */
  showOpenPlayModal(data: any, config: any = {}): MatDialogRef<OpenPlayNotificationModalComponent> | null {
    // Prevent multiple modals from opening
    if (this.activeOpenPlayModal || this.isOpenPlayModalPending) {
      console.log('🎾 ModalManager: Open Play modal already active, skipping duplicate');
      return null;
    }

    console.log('🎾 ModalManager: Opening Open Play modal');
    this.isOpenPlayModalPending = true;

    // Clear any existing timeout
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
    }

    const modalConfig = {
      width: '90vw',
      maxWidth: '500px',
      height: 'auto',
      maxHeight: '80vh',
      disableClose: false,
      hasBackdrop: true,
      panelClass: ['open-play-modal'],
      ...config
    };

    // Small delay to prevent race conditions with timeout safety
    this.pendingTimeout = setTimeout(() => {
      if (this.isOpenPlayModalPending) {
        this.activeOpenPlayModal = this.dialog.open(OpenPlayNotificationModalComponent, {
          data,
          ...modalConfig
        });

        this.isOpenPlayModalPending = false;
        this.pendingTimeout = null;

        // Clean up when modal is closed
        this.activeOpenPlayModal.afterClosed().subscribe(() => {
          console.log('🎾 ModalManager: Open Play modal closed');
          this.activeOpenPlayModal = null;
        });
      }
    }, 100);

    return this.activeOpenPlayModal;
  }

  /**
   * Close active Open Play modal if one exists
   */
  closeOpenPlayModal(result?: any): void {
    if (this.activeOpenPlayModal) {
      console.log('🎾 ModalManager: Closing active Open Play modal');
      this.activeOpenPlayModal.close(result);
      this.activeOpenPlayModal = null;
    }
    
    // Clear pending state and timeout
    this.isOpenPlayModalPending = false;
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }
  }

  /**
   * Check if an Open Play modal is currently active
   */
  isOpenPlayModalActive(): boolean {
    return this.activeOpenPlayModal !== null || this.isOpenPlayModalPending;
  }

  /**
   * Get the active Open Play modal reference
   */
  getActiveOpenPlayModal(): MatDialogRef<OpenPlayNotificationModalComponent> | null {
    return this.activeOpenPlayModal;
  }

  /**
   * Show announcement modal with queue system for multiple announcements
   */
  showAnnouncementModal(announcement: Announcement): void {
    console.log('📢 ModalManager: Received announcement:', announcement.title);

    // Check if this announcement is already in the queue or being displayed
    const isDuplicate = this.announcementQueue.some(a => a._id === announcement._id) ||
                       (this.activeAnnouncementModal?.componentInstance.data.announcement._id === announcement._id);

    if (isDuplicate) {
      console.log('📢 ModalManager: Announcement already queued or displayed, skipping duplicate');
      return;
    }

    // Add to queue
    this.announcementQueue.push(announcement);
    console.log('📢 ModalManager: Added to queue. Queue length:', this.announcementQueue.length);

    // Process queue if not already processing
    if (!this.isProcessingAnnouncement) {
      this.processAnnouncementQueue();
    }
  }

  /**
   * Process announcement queue sequentially
   */
  private processAnnouncementQueue(): void {
    // If already showing an announcement or queue is empty, return
    if (this.activeAnnouncementModal || this.announcementQueue.length === 0) {
      this.isProcessingAnnouncement = false;
      return;
    }

    this.isProcessingAnnouncement = true;

    // Get the next announcement from the queue
    const announcement = this.announcementQueue.shift();

    if (!announcement) {
      this.isProcessingAnnouncement = false;
      return;
    }

    console.log('📢 ModalManager: Showing announcement modal:', announcement.title);

    const modalConfig = {
      width: '90vw',
      maxWidth: '600px',
      height: 'auto',
      maxHeight: '85vh',
      disableClose: false,
      hasBackdrop: true,
      panelClass: ['announcement-modal']
    };

    this.activeAnnouncementModal = this.dialog.open(AnnouncementModalComponent, {
      data: { announcement },
      ...modalConfig
    });

    // When modal closes, process next announcement after a short delay
    this.activeAnnouncementModal.afterClosed().subscribe(() => {
      console.log('📢 ModalManager: Announcement modal closed');
      this.activeAnnouncementModal = null;

      // Process next announcement in queue after 500ms delay
      if (this.announcementQueue.length > 0) {
        setTimeout(() => {
          this.processAnnouncementQueue();
        }, 500);
      } else {
        this.isProcessingAnnouncement = false;
      }
    });
  }

  /**
   * Close active announcement modal if one exists
   */
  closeAnnouncementModal(result?: any): void {
    if (this.activeAnnouncementModal) {
      console.log('📢 ModalManager: Closing active announcement modal');
      this.activeAnnouncementModal.close(result);
      this.activeAnnouncementModal = null;
    }
  }

  /**
   * Check if an announcement modal is currently active
   */
  isAnnouncementModalActive(): boolean {
    return this.activeAnnouncementModal !== null;
  }

  /**
   * Clear announcement queue
   */
  clearAnnouncementQueue(): void {
    console.log('📢 ModalManager: Clearing announcement queue');
    this.announcementQueue = [];
    this.isProcessingAnnouncement = false;
  }

  /**
   * Get announcement queue length
   */
  getAnnouncementQueueLength(): number {
    return this.announcementQueue.length;
  }
}