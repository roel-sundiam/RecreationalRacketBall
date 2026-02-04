import { Injectable, OnDestroy, Inject, forwardRef } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { AnnouncementService, Announcement } from './announcement.service';

export interface OpenPlayNotificationEvent {
  type: 'open_play_created' | 'open_play_updated' | 'open_play_closed';
  data: {
    pollId: string;
    title: string;
    description: string;
    eventDate: string;
    startTime: number;
    endTime: number;
    maxPlayers: number;
    confirmedPlayers: number;
    createdBy: {
      _id: string;
      username: string;
      fullName: string;
    };
  };
  timestamp: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  public socket: Socket | null = null;
  private serverUrl = environment.socketUrl;
  private connectionSubject = new BehaviorSubject<boolean>(false);
  private openPlayNotificationSubject = new Subject<OpenPlayNotificationEvent>();
  
  // Production resilience
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private heartbeatInterval: any = null;
  private isProduction = environment.production;

  public isConnected$ = this.connectionSubject.asObservable();
  public openPlayNotifications$ = this.openPlayNotificationSubject.asObservable();

  private announcementService?: AnnouncementService;

  constructor(private authService: AuthService) {
    console.log('🔌 WebSocketService constructor called');

    // Always connect WebSocket (for both authenticated and anonymous users)
    this.connect();

    // Handle authentication state changes
    this.authService.currentUser$.subscribe(user => {
      console.log('🔌 WebSocketService: User auth state changed:', !!user);
      if (user) {
        console.log('🔌 WebSocketService: User authenticated');
        // WebSocket already connected, just ensure it's active
        if (!this.socket?.connected) {
          this.connect();
        }
      } else {
        console.log('🔌 WebSocketService: User logged out, but keeping WebSocket connected for anonymous tracking');
        // Keep connection active for anonymous tracking
      }
    });
  }

  /**
   * Establish WebSocket connection
   */
  private connect(): void {
    if (this.socket?.connected) {
      console.log('🔌 Already connected to WebSocket');
      return;
    }

    console.log('🔌 Connecting to WebSocket server at:', this.serverUrl);
    
    // Production-optimized socket configuration
    const socketOptions: any = {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: this.isProduction ? 20000 : 5000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 10000,
      maxReconnectionAttempts: this.maxReconnectAttempts,
      forceNew: false
    };

    // Additional production settings for Render.com
    if (this.isProduction) {
      socketOptions.pingTimeout = 60000;
      socketOptions.pingInterval = 25000;
    }
    
    this.socket = io(this.serverUrl, socketOptions);

    this.socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server:', this.socket?.id);
      this.reconnectAttempts = 0; // Reset on successful connection
      this.connectionSubject.next(true);
      this.subscribeToOpenPlayNotifications();
      this.subscribeToAnnouncements();

      // Start heartbeat for production
      if (this.isProduction) {
        this.startHeartbeat();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from WebSocket server:', reason);
      this.connectionSubject.next(false);
      this.stopHeartbeat();
      
      // Auto-reconnect for production if not intentional disconnect
      if (this.isProduction && reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('reconnect', () => {
      console.log('🔄 Reconnected to WebSocket server');
      this.reconnectAttempts = 0;
      this.connectionSubject.next(true);
      this.subscribeToOpenPlayNotifications();
      this.subscribeToAnnouncements();

      if (this.isProduction) {
        this.startHeartbeat();
      }
    });

    this.socket.on('connect_error', (error) => {
      // Only log in development mode, and only if it's not a timeout
      if (!this.isProduction && error.message !== 'timeout') {
        console.warn('⚠️ WebSocket connection issue:', error.message);
      }
      this.connectionSubject.next(false);
      this.reconnectAttempts++;

      if (this.isProduction && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    });

    // Listen for open play notifications
    this.socket.on('open_play_notification', (data: OpenPlayNotificationEvent) => {
      console.log('🎾 Received open play notification:', data);
      console.log('🎾 Notification startTime:', data.data.startTime, 'endTime:', data.data.endTime);
      this.openPlayNotificationSubject.next(data);
    });

    // Listen for general open play events
    this.socket.on('open_play_event', (data: any) => {
      console.log('🎾 Received open play event (fallback):', data);
      console.log('🎾 Fallback event startTime:', data.startTime, 'endTime:', data.endTime);
      // Convert to notification format for consistency
      const notification: OpenPlayNotificationEvent = {
        type: 'open_play_created',
        data: {
          pollId: data.pollId,
          title: data.title,
          description: '',
          eventDate: data.eventDate,
          startTime: data.startTime || 0,
          endTime: data.endTime || 0,
          maxPlayers: 12,
          confirmedPlayers: 0,
          createdBy: {
            _id: '',
            username: 'System',
            fullName: 'System'
          }
        },
        timestamp: data.timestamp,
        message: data.message
      };
      this.openPlayNotificationSubject.next(notification);
    });

    // Listen for announcement notifications
    this.socket.on('announcement_notification', (data: Announcement) => {
      console.log('📢 Received announcement notification:', data);
      if (this.announcementService) {
        this.announcementService.emitNewAnnouncement(data);
      }
    });

    // Listen for fallback announcement events
    this.socket.on('new_announcement', (data: any) => {
      console.log('📢 Received new announcement (fallback):', data);
      if (this.announcementService && data.announcement) {
        this.announcementService.emitNewAnnouncement(data.announcement);
      }
    });

    this.socket.on('welcome', (data) => {
      console.log('👋 WebSocket welcome message:', data);
    });

    this.socket.on('subscription_confirmed', (data) => {
      console.log('✅ WebSocket subscription confirmed:', data);
    });
  }

  /**
   * Subscribe to open play notifications
   */
  private subscribeToOpenPlayNotifications(): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Cannot subscribe - not connected to WebSocket');
      return;
    }

    console.log('📡 Subscribing to open play notifications...');
    this.socket.emit('subscribe_open_play_notifications');
  }

  /**
   * Subscribe to announcements
   */
  private subscribeToAnnouncements(): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Cannot subscribe to announcements - not connected to WebSocket');
      return;
    }

    console.log('📡 Subscribing to announcements...');
    this.socket.emit('subscribe_announcements');
  }

  /**
   * Set announcement service (to avoid circular dependency)
   */
  setAnnouncementService(service: AnnouncementService): void {
    this.announcementService = service;
  }

  /**
   * Unsubscribe from open play notifications
   */
  private unsubscribeFromOpenPlayNotifications(): void {
    if (!this.socket?.connected) {
      return;
    }

    console.log('📡 Unsubscribing from open play notifications...');
    this.socket.emit('unsubscribe_open_play_notifications');
  }

  /**
   * Disconnect from WebSocket
   */
  private disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting from WebSocket...');
      this.unsubscribeFromOpenPlayNotifications();
      this.socket.disconnect();
      this.socket = null;
      this.connectionSubject.next(false);
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Force reconnection
   */
  reconnect(): void {
    console.log('🔄 Force reconnecting WebSocket...');
    this.disconnect();
    setTimeout(() => {
      if (this.authService.isAuthenticated()) {
        this.connect();
      }
    }, 1000);
  }

  /**
   * Subscribe to financial updates (existing functionality)
   */
  subscribeToFinancialUpdates(): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe_financial_updates');
    }
  }

  /**
   * Subscribe to court usage updates (existing functionality)
   */
  subscribeToCourtUsageUpdates(): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe_court_usage_updates');
    }
  }

  /**
   * Subscribe to activity monitor (admin only)
   */
  subscribeToActivityMonitor(): void {
    if (this.socket?.connected) {
      this.socket.emit('subscribe_activity_monitor');
    }
  }

  /**
   * Authenticate user for chat and activity monitoring
   */
  authenticateUser(userId: string, username: string, fullName: string, role: string): void {
    if (this.socket?.connected) {
      console.log('💬 Authenticating user for WebSocket:', username);
      this.socket.emit('chat_authenticate', {
        userId,
        username,
        fullName,
        role
      });
    }
  }

  /**
   * Start heartbeat for production connection stability
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Ensure no duplicate intervals
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.socket?.connected && this.authService.isAuthenticated()) {
        console.log(`🔄 Attempting reconnect ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}`);
        this.reconnect();
      }
    }, delay);
  }

  ngOnDestroy(): void {
    this.stopHeartbeat();
    this.disconnect();
  }
}