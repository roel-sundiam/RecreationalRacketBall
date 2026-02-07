import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalyticsService } from './services/analytics.service';
import { PWANotificationService } from './services/pwa-notification.service';
import { WebSocketService } from './services/websocket.service';
import { AppUpdateService } from './services/app-update.service';
import { SessionMonitorService } from './services/session-monitor.service';
import { ActivityMonitorService } from './services/activity-monitor.service';
import { AuthService } from './services/auth.service';
import { LayoutComponent } from './shared/layout/layout.component';

@Component({
  selector: 'app-root',
  imports: [LayoutComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('Rich Town 2 Tennis Club');
  private clubSub?: Subscription;
  private readonly defaultTitle = 'Court Reservations';

  constructor(
    private analyticsService: AnalyticsService,
    private pwaNotificationService: PWANotificationService,
    private webSocketService: WebSocketService,
    private appUpdateService: AppUpdateService,
    private sessionMonitorService: SessionMonitorService,
    private activityMonitorService: ActivityMonitorService,
    private authService: AuthService,
    private titleService: Title
  ) {
    console.log('🚀 App component constructor called');
    // Services will be initialized automatically
    // AnalyticsService handles page view tracking and session management
    console.log('📊 Analytics service initialized');
    // Initialize PWA notification service
    this.pwaNotificationService.init();
    console.log('📱 PWA notification service initialized');
    // Initialize app update service
    this.appUpdateService.init();
    console.log('🔄 App update service initialized');
    // WebSocket service will auto-initialize when user is authenticated
    console.log('🔌 WebSocket service initialized');
    // SessionMonitorService will auto-initialize and start monitoring when user logs in
    console.log('📊 Session monitor service initialized');
  }

  ngOnInit() {
    console.log('🚀 App component ngOnInit called');
    console.log('🚀 Current URL:', window.location.href);
    console.log('📊 Analytics session ID:', this.analyticsService.getCurrentSession());

    // Initialize activity tracking for ALL users
    this.activityMonitorService.initializeTracking();
    console.log('📊 Activity monitoring initialized for page tracking');

    // Initialize admin notifications (only for admins)
    this.authService.currentUser$.subscribe(user => {
      if (user && this.authService.isAdmin()) {
        console.log('👮 Initializing admin activity notifications for:', user.fullName);
        this.activityMonitorService.initializeAdminNotifications();
      }
    });

    // Update browser tab title based on selected club
    this.clubSub = this.authService.selectedClub$.subscribe(club => {
      const clubName = club?.club?.name || club?.clubName;
      if (clubName) {
        this.title.set(clubName);
        this.titleService.setTitle(`${clubName} - ${this.defaultTitle}`);
      } else {
        this.title.set('Court Reservations');
        this.titleService.setTitle(this.defaultTitle);
      }
    });
  }

  ngOnDestroy() {
    this.clubSub?.unsubscribe();
  }
}
