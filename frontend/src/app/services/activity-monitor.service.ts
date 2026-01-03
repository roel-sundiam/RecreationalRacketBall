import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { Subject, BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { WebSocketService } from './websocket.service';

export interface ActivityBroadcast {
  type: 'member_navigation';
  data: {
    userId: string;
    username: string;
    fullName: string;
    role: string;
    page: string;
    path: string;
    timestamp: string;
  };
  timestamp: string;
}

export interface DebugInfo {
  websocketConnected: boolean;
  userAuthenticated: boolean;
  adminSubscribed: boolean;
  isAdmin: boolean;
  recentActivities: string[];
  recentEmissions: string[];
  debugLogs: string[];
  lastError?: string;
  socketId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityMonitorService {
  private activitySubject = new Subject<ActivityBroadcast>();
  public activity$ = this.activitySubject.asObservable();
  private isAdminSubscribed = false;

  // Debug information
  private debugSubject = new BehaviorSubject<DebugInfo>({
    websocketConnected: false,
    userAuthenticated: false,
    adminSubscribed: false,
    isAdmin: false,
    recentActivities: [],
    recentEmissions: [],
    debugLogs: []
  });
  public debug$ = this.debugSubject.asObservable();

  // Page mapping for friendly names (copied from AnalyticsService)
  private pageMapping: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/schedules': 'Court Schedules',
    '/my-reservations': 'My Reservations',
    '/payments': 'Payments',
    '/profile': 'Profile',
    '/members': 'Members Directory',
    '/polls': 'Polls & Voting',
    '/coins': 'Coin Management',
    '/suggestions': 'Suggestions',
    '/admin/members': 'Admin - Member Management',
    '/admin/payments': 'Admin - Payment Management',
    '/admin/suggestions': 'Admin - Suggestions Management',
    '/admin/reports': 'Admin - Reports',
    '/admin/analytics': 'Admin - Analytics Dashboard',
    '/login': 'Login',
    '/register': 'Registration',
    '/calendar': 'Court Calendar',
    '/reservations': 'Court Reservations',
    '/rankings': 'Player Rankings',
    '/open-play': 'Open Play Events',
    '/admin/financial-report': 'Admin - Financial Report',
    '/admin/polls': 'Admin - Polls Management',
    '/admin/gallery-upload': 'Admin - Gallery Upload',
    '/admin/manual-court-usage': 'Admin - Manual Court Usage'
  };

  constructor(
    private authService: AuthService,
    private webSocketService: WebSocketService,
    private router: Router
  ) {}

  /**
   * Initialize tracking for ALL users
   * Emits page navigation events to backend
   */
  initializeTracking(): void {
    console.log('📊 ActivityMonitor: Initializing page tracking for all users');

    // Authenticate user when WebSocket connects
    this.authenticateUserWhenConnected();

    // Track route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.emitPageNavigation(event.urlAfterRedirects);
      });
  }

  /**
   * Authenticate user when WebSocket connects
   * This allows backend to auto-join admins to admin_monitor room
   */
  private authenticateUserWhenConnected(): void {
    this.webSocketService.isConnected$.subscribe(isConnected => {
      this.updateDebug({
        websocketConnected: isConnected,
        socketId: this.webSocketService.socket?.id
      });
      this.addDebugLog(`WebSocket ${isConnected ? 'connected' : 'disconnected'} (ID: ${this.webSocketService.socket?.id || 'none'})`);

      if (isConnected) {
        // Wait a bit for socket to be fully ready
        setTimeout(() => {
          const user = this.authService.currentUser;
          if (user && this.webSocketService.socket) {
            this.addDebugLog(`Authenticating user: ${user.username} (role: ${user.role})`);

            this.webSocketService.authenticateUser(
              user._id,
              user.username,
              user.fullName,
              user.role
            );

            this.updateDebug({
              userAuthenticated: true,
              isAdmin: this.authService.isAdmin()
            });

            this.addDebugLog(`User authenticated. IsAdmin: ${this.authService.isAdmin()}`);

            // For admins, also explicitly subscribe
            if (this.authService.isAdmin()) {
              setTimeout(() => {
                this.addDebugLog('Admin detected - calling subscribeToActivityMonitor()');
                this.webSocketService.subscribeToActivityMonitor();
                this.addDebugLog('Emitted subscribe_activity_monitor event');
              }, 500);
            }
          } else {
            this.addDebugLog(`ERROR: User or socket missing. User: ${!!user}, Socket: ${!!this.webSocketService.socket}`);
          }
        }, 500);
      } else {
        this.updateDebug({
          userAuthenticated: false,
          adminSubscribed: false
        });
        this.addDebugLog('WebSocket disconnected - clearing auth state');
      }
    });
  }

  /**
   * Update debug information
   */
  private updateDebug(updates: Partial<DebugInfo>): void {
    const current = this.debugSubject.value;
    this.debugSubject.next({ ...current, ...updates });
  }

  /**
   * Add activity to recent list (for debugging)
   */
  private addRecentActivity(activity: string): void {
    const current = this.debugSubject.value;
    const recentActivities = [activity, ...current.recentActivities].slice(0, 10);
    this.updateDebug({ recentActivities });
  }

  /**
   * Add emission to recent list (for debugging)
   */
  private addRecentEmission(emission: string): void {
    const current = this.debugSubject.value;
    const recentEmissions = [emission, ...current.recentEmissions].slice(0, 10);
    this.updateDebug({ recentEmissions });
  }

  /**
   * Add debug log (for debugging)
   */
  private addDebugLog(log: string): void {
    const current = this.debugSubject.value;
    const timestamp = new Date().toLocaleTimeString();
    const debugLogs = [`${timestamp}: ${log}`, ...current.debugLogs].slice(0, 20);
    this.updateDebug({ debugLogs });
    console.log('📊', log);
  }

  /**
   * Initialize admin notifications (admins only)
   * Subscribes to activity broadcasts from backend
   */
  initializeAdminNotifications(): void {
    if (!this.authService.isAdmin()) {
      console.log('📊 ActivityMonitor: User is not admin, skipping notification subscription');
      return;
    }

    if (this.isAdminSubscribed) {
      console.log('📊 ActivityMonitor: Admin already subscribed');
      return;
    }

    console.log('📊 ActivityMonitor: Initializing admin notifications');

    // Subscribe to activity broadcasts
    this.subscribeToActivityBroadcasts();

    // Notifications are now handled by ActivityNotificationComponent

    this.isAdminSubscribed = true;
  }

  /**
   * Emit page navigation event to backend
   */
  private emitPageNavigation(path: string): void {
    // Wait for WebSocket to be connected
    if (!this.webSocketService.isConnected()) {
      console.log('📊 ActivityMonitor: WebSocket not connected, waiting...');
      // Retry after a short delay
      setTimeout(() => this.emitPageNavigation(path), 1000);
      return;
    }

    const user = this.authService.currentUser;
    if (!user) {
      console.log('📊 ActivityMonitor: No user logged in, skipping page navigation emit');
      return;
    }

    const pageName = this.getPageName(path);

    // Emit page navigation event
    this.webSocketService.socket?.emit('page_navigation', {
      type: 'page_navigation',
      data: {
        userId: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        page: pageName,
        path: path,
        timestamp: new Date().toISOString()
      }
    });

    console.log(`📍 ActivityMonitor: Emitted navigation to ${pageName}`);
    this.addRecentEmission(`${new Date().toLocaleTimeString()}: ${pageName}`);
  }

  /**
   * Subscribe to activity broadcasts from backend
   */
  private subscribeToActivityBroadcasts(): void {
    if (!this.webSocketService.socket) {
      console.warn('⚠️  ActivityMonitor: WebSocket not initialized');
      return;
    }

    // Subscribe to activity monitor room
    this.webSocketService.socket.emit('subscribe_activity_monitor');

    // Listen for subscription confirmation
    this.webSocketService.socket.on('subscription_confirmed', (data: any) => {
      this.addDebugLog(`Received subscription_confirmed: ${JSON.stringify(data)}`);
      if (data.type === 'activity_monitor') {
        this.addDebugLog('✅ Successfully subscribed to activity monitor!');
        this.updateDebug({ adminSubscribed: true });
      }
    });

    // Listen for activity broadcasts
    this.webSocketService.socket.on('activity_broadcast', (data: ActivityBroadcast) => {
      this.addDebugLog(`Received activity broadcast from ${data.data.fullName}`);
      this.activitySubject.next(data);
      this.addRecentActivity(`${new Date().toLocaleTimeString()}: ${data.data.fullName} → ${data.data.page}`);
    });

    this.addDebugLog('Set up listeners for subscription_confirmed and activity_broadcast');
  }

  // Notification display is now handled by ActivityNotificationComponent

  /**
   * Get friendly page name from path
   */
  private getPageName(path: string): string {
    // Remove query parameters and fragments
    const cleanPath = path.split('?')[0].split('#')[0];

    // Check exact matches first
    if (this.pageMapping[cleanPath]) {
      return this.pageMapping[cleanPath];
    }

    // Check for dynamic routes
    for (const [pattern, name] of Object.entries(this.pageMapping)) {
      if (cleanPath.startsWith(pattern.replace('*', ''))) {
        return name;
      }
    }

    // Default to path if no mapping found
    return cleanPath || 'Unknown Page';
  }

  /**
   * Clean up subscriptions
   */
  destroy(): void {
    if (this.webSocketService.socket) {
      this.webSocketService.socket.off('activity_broadcast');
      this.webSocketService.socket.off('subscription_confirmed');
    }
    this.activitySubject.complete();
    this.isAdminSubscribed = false;
  }
}
