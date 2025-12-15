import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { BehaviorSubject, Subject, Subscription, interval } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SessionMonitorService implements OnDestroy {
  // Configuration from environment
  private readonly CHECK_INTERVAL_MS = environment.session.checkIntervalMs;
  private readonly WARNING_TIME_MS = environment.session.warningTimeMs;

  // State management
  private monitorSubscription?: Subscription;
  private warningDialogRef?: MatDialogRef<any>;
  private hasShownWarning = new BehaviorSubject<boolean>(false);

  // Observables for components to subscribe
  public sessionWarning$ = new Subject<number>(); // Emits remaining time
  public sessionExpired$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.initializeMonitoring();
  }

  /**
   * Initialize monitoring based on authentication state
   */
  private initializeMonitoring(): void {
    // Subscribe to auth state changes
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        console.log('📊 Session Monitor: User logged in, starting monitoring');
        this.startMonitoring();
      } else {
        console.log('📊 Session Monitor: User logged out, stopping monitoring');
        this.stopMonitoring();
      }
    });
  }

  /**
   * Start monitoring token expiration
   */
  private startMonitoring(): void {
    // Stop any existing monitoring first
    this.stopMonitoring();

    // Reset warning state
    this.hasShownWarning.next(false);

    // Create interval timer
    this.monitorSubscription = interval(this.CHECK_INTERVAL_MS).subscribe(() => {
      this.checkTokenExpiration();
    });

    // Check immediately on start
    this.checkTokenExpiration();

    console.log(`📊 Session Monitor: Started (checking every ${this.CHECK_INTERVAL_MS / 1000}s)`);
  }

  /**
   * Stop monitoring token expiration
   */
  private stopMonitoring(): void {
    if (this.monitorSubscription) {
      this.monitorSubscription.unsubscribe();
      this.monitorSubscription = undefined;
      console.log('📊 Session Monitor: Stopped');
    }

    // Close any open warning dialog
    if (this.warningDialogRef) {
      this.warningDialogRef.close();
      this.warningDialogRef = undefined;
    }
  }

  /**
   * Check token expiration and trigger warnings/logout
   */
  private checkTokenExpiration(): void {
    try {
      if (!this.authService.isAuthenticated()) {
        this.stopMonitoring();
        return;
      }

      const remainingMs = this.authService.getRemainingSessionTime();

      // Token expired - immediate redirect
      if (remainingMs <= 0) {
        console.log('📊 Session Monitor: Token expired, triggering logout');
        this.handleSessionExpired();
        return;
      }

      // Check if warning should be shown
      if (remainingMs <= this.WARNING_TIME_MS && !this.hasShownWarning.value) {
        console.log(`📊 Session Monitor: ${Math.floor(remainingMs / 1000)}s remaining, showing warning`);
        this.showWarningDialog(remainingMs);
        this.sessionWarning$.next(remainingMs);
        this.hasShownWarning.next(true);
      }

      // Update countdown in dialog if it's open
      if (this.warningDialogRef && remainingMs > 0) {
        const dialogInstance = this.warningDialogRef.componentInstance;
        if (dialogInstance && typeof dialogInstance.updateRemainingTime === 'function') {
          dialogInstance.updateRemainingTime(remainingMs);
        }
      }

    } catch (error) {
      console.error('📊 Session Monitor: Error checking token expiration:', error);
      // Don't stop monitoring on single error
    }
  }

  /**
   * Show warning dialog to user
   */
  private showWarningDialog(remainingMs: number): void {
    try {
      // Close any existing dialog first
      if (this.warningDialogRef) {
        this.warningDialogRef.close();
      }

      // Import dialog component dynamically
      import('../components/session-warning-dialog/session-warning-dialog.component').then(module => {
        this.warningDialogRef = this.dialog.open(module.SessionWarningDialogComponent, {
          width: '500px',
          maxWidth: '95vw',
          disableClose: true,
          panelClass: 'session-dialog',
          data: {
            remainingTimeMs: remainingMs,
            canExtend: false // No token refresh yet
          }
        });

        this.warningDialogRef.afterClosed().subscribe(result => {
          console.log('📊 Session Monitor: Warning dialog closed with result:', result);

          if (result === 'logout') {
            // User clicked "Logout Now"
            this.authService.logout(true); // Save route
          } else if (result === 'stay') {
            // User clicked "Stay Logged In" - just close dialog
            // They can continue until actual expiration
            console.log('📊 Session Monitor: User chose to stay logged in');
            // Allow warning to show again if they don't interact
            setTimeout(() => {
              this.hasShownWarning.next(false);
            }, 60000); // Reset after 1 minute
          } else if (result === 'expired') {
            // Dialog countdown reached 0
            this.handleSessionExpired();
          }

          this.warningDialogRef = undefined;
        });
      }).catch(error => {
        console.error('📊 Session Monitor: Error loading warning dialog:', error);
      });

    } catch (error) {
      console.error('📊 Session Monitor: Error showing warning dialog:', error);
    }
  }

  /**
   * Handle session expiration - immediate redirect
   */
  private handleSessionExpired(): void {
    console.log('📊 Session Monitor: Handling session expiration');

    this.stopMonitoring();

    // Save current route before logout
    const currentRoute = this.router.url;
    if (currentRoute !== '/login' && currentRoute !== '/register') {
      this.authService.setIntendedRoute(currentRoute);
    }

    // Emit expiration event
    this.sessionExpired$.next();

    // Logout with route preservation
    this.authService.logout(true);
  }

  /**
   * Manual trigger for session expiration (for testing)
   */
  public triggerSessionExpired(): void {
    this.handleSessionExpired();
  }

  /**
   * Get remaining session time in milliseconds
   */
  public getRemainingTime(): number {
    return this.authService.getRemainingSessionTime();
  }

  /**
   * Check if warning has been shown
   */
  public isWarningShown(): boolean {
    return this.hasShownWarning.value;
  }

  ngOnDestroy(): void {
    console.log('📊 Session Monitor: Service destroyed, cleaning up');
    this.stopMonitoring();
    this.sessionWarning$.complete();
    this.sessionExpired$.complete();
    this.hasShownWarning.complete();
  }
}
