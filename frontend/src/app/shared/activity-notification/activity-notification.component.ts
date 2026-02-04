import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { ActivityMonitorService } from '../../services/activity-monitor.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

interface Notification {
  id: number;
  message: string;
  timestamp: string;
  show: boolean;
}

@Component({
  selector: 'app-activity-notification',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatBadgeModule],
  template: `
    <div class="notification-panel" *ngIf="isSuperAdmin && !isHidden">
      <div class="panel-header">
        <div class="panel-title">
          <mat-icon class="title-icon">notifications_active</mat-icon>
          <span>Member Activity</span>
        </div>
        <div class="panel-actions">
          <button mat-icon-button class="clear-btn" (click)="clearAll()" *ngIf="notifications.length > 0" title="Clear all">
            <mat-icon>delete_sweep</mat-icon>
          </button>
          <button mat-icon-button class="hide-btn" (click)="hidePanel()" title="Hide panel">
            <mat-icon>visibility_off</mat-icon>
          </button>
        </div>
      </div>

      <div class="notification-container">
        <div
          *ngFor="let notification of notifications"
          class="notification"
          [class.show]="notification.show">
          <div class="notification-header">
            <mat-icon class="notification-icon">person_pin</mat-icon>
            <span class="notification-time">{{ notification.timestamp }}</span>
            <button mat-icon-button class="close-btn" (click)="removeNotification(notification.id)">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="notification-message">
            {{ notification.message }}
          </div>
        </div>

        <div class="no-notifications" *ngIf="notifications.length === 0">
          <mat-icon>hourglass_empty</mat-icon>
          <p>No activity yet...</p>
        </div>
      </div>
    </div>

    <!-- Show button when panel is hidden -->
    <button
      *ngIf="isSuperAdmin && isHidden"
      mat-fab
      class="show-panel-btn"
      (click)="showPanel()"
      [matBadge]="notifications.length"
      [matBadgeHidden]="notifications.length === 0"
      matBadgeColor="warn">
      <mat-icon>notifications</mat-icon>
    </button>
  `,
  styles: [`
    .notification-panel {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9998;
      background: #1e1e1e;
      border: 2px solid #4CAF50;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(76, 175, 80, 0.3);
      max-width: 400px;
      max-height: calc(100vh - 100px);
      display: flex;
      flex-direction: column;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 2px solid #4CAF50;
      background: #2a2a2a;
      border-radius: 6px 6px 0 0;
    }

    .panel-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #4CAF50;
      font-size: 16px;
      font-weight: 600;
    }

    .title-icon {
      color: #4CAF50;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .panel-actions {
      display: flex;
      gap: 4px;
    }

    .clear-btn mat-icon,
    .hide-btn mat-icon {
      color: #888;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .clear-btn:hover mat-icon,
    .hide-btn:hover mat-icon {
      color: #fff;
    }

    .notification-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      max-height: 500px;
      overflow-y: auto;
    }

    .notification {
      background: #2a2a2a;
      border-left: 4px solid #2196F3;
      border-radius: 4px;
      padding: 12px;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateX(20px);
    }

    .notification.show {
      opacity: 1;
      transform: translateX(0);
    }

    .notification-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .notification-icon {
      color: #2196F3;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .notification-time {
      color: #90EE90;
      font-size: 12px;
      font-family: 'Courier New', monospace;
      flex: 1;
    }

    .close-btn {
      width: 24px;
      height: 24px;
      padding: 0;
    }

    .close-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #888;
    }

    .close-btn:hover mat-icon {
      color: #fff;
    }

    .notification-message {
      color: #fff;
      font-size: 12px;
      font-weight: normal;
      line-height: 1.4;
    }

    .no-notifications {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 24px;
      color: #888;
    }

    .no-notifications mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.5;
    }

    .no-notifications p {
      margin: 0;
      font-style: italic;
    }

    .show-panel-btn {
      position: fixed;
      bottom: 90px;
      right: 20px;
      z-index: 9998;
      background: #4CAF50 !important;
      color: white !important;
    }

    .show-panel-btn:hover {
      background: #45a049 !important;
    }

    @media (max-width: 600px) {
      .notification-panel {
        bottom: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
      }

      .notification {
        padding: 12px;
      }

      .notification-message {
        font-size: 12px;
      }

      .show-panel-btn {
        bottom: 90px;
        right: 16px;
      }
    }
  `]
})
export class ActivityNotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private notificationId = 0;
  private subscription?: Subscription;
  isHidden = false; // Panel visibility state
  isSuperAdmin = false; // Only show for superadmins

  constructor(
    private activityMonitorService: ActivityMonitorService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Check if user is superadmin
    this.isSuperAdmin = this.authService.isSuperAdmin();

    // Only subscribe if user is superadmin
    if (!this.isSuperAdmin) {
      return;
    }

    // Initialize admin notifications
    this.activityMonitorService.initializeAdminNotifications();

    this.subscription = this.activityMonitorService.activity$.subscribe(
      activity => {
        // Don't show notifications for own activity
        const currentUserId = this.authService.currentUser?._id;
        if (activity.data.userId === currentUserId) {
          return;
        }

        // Format message based on activity type
        let message: string;
        const clubInfo = activity.data.clubName ? ` [${activity.data.clubName}]` : '';
        
        if (activity.type === 'page_navigation' || activity.type === 'member_navigation') {
          message = `${activity.data.fullName}${clubInfo} accessed ${activity.data.page || 'Unknown Page'}`;
        } else if (activity.type === 'member_activity') {
          message = `${activity.data.fullName}${clubInfo} - ${activity.data.action || 'Unknown Action'} on ${activity.data.component || 'Unknown Component'}`;
        } else {
          // Fallback for unknown types
          console.warn('Unknown activity type:', activity.type, activity);
          message = `${activity.data.fullName}${clubInfo} performed an action`;
        }

        this.addNotification(message);
      }
    );
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  addNotification(message: string): void {
    const id = this.notificationId++;
    const timestamp = new Date().toLocaleTimeString();

    const notification: Notification = {
      id,
      message,
      timestamp,
      show: false
    };

    // Add to beginning of array (newest first)
    this.notifications.unshift(notification);

    // Play notification sound
    this.playNotificationSound();

    // Trigger animation
    setTimeout(() => {
      const notif = this.notifications.find(n => n.id === id);
      if (notif) notif.show = true;
    }, 100);

    // No auto-dismiss - notifications stay until manually removed
  }

  private playNotificationSound(): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('🔊 Audio context state:', audioContext.state);

      // Resume audio context if suspended (required for browser autoplay policies)
      if (audioContext.state === 'suspended') {
        console.log('🔊 Resuming suspended audio context...');
        audioContext.resume().then(() => {
          console.log('🔊 Audio context resumed, playing beep');
          this.playBeep(audioContext);
        }).catch(err => {
          console.error('🔊 Failed to resume audio context:', err);
        });
      } else {
        console.log('🔊 Playing beep immediately');
        this.playBeep(audioContext);
      }
    } catch (error) {
      console.error('🔊 Could not play notification sound:', error);
    }
  }

  private playBeep(audioContext: AudioContext): void {
    // Create a two-tone notification beep for better noticeability
    const now = audioContext.currentTime;

    // First beep
    const oscillator1 = audioContext.createOscillator();
    const gainNode1 = audioContext.createGain();
    oscillator1.connect(gainNode1);
    gainNode1.connect(audioContext.destination);
    oscillator1.frequency.value = 880; // A5 note
    oscillator1.type = 'sine';
    gainNode1.gain.setValueAtTime(0.6, now);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    oscillator1.start(now);
    oscillator1.stop(now + 0.15);

    // Second beep (slightly higher pitch)
    const oscillator2 = audioContext.createOscillator();
    const gainNode2 = audioContext.createGain();
    oscillator2.connect(gainNode2);
    gainNode2.connect(audioContext.destination);
    oscillator2.frequency.value = 1046; // C6 note
    oscillator2.type = 'sine';
    gainNode2.gain.setValueAtTime(0.6, now + 0.2);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    oscillator2.start(now + 0.2);
    oscillator2.stop(now + 0.35);
  }

  removeNotification(id: number): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  clearAll(): void {
    this.notifications = [];
  }

  hidePanel(): void {
    this.isHidden = true;
  }

  showPanel(): void {
    this.isHidden = false;
  }
}
