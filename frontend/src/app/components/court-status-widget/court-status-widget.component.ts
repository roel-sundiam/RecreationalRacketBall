import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CourtStatusService, CourtStatusData } from '../../services/court-status.service';

@Component({
  selector: 'app-court-status-widget',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './court-status-widget.component.html',
  styleUrl: './court-status-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourtStatusWidgetComponent implements OnInit, OnDestroy {
  courtStatus: CourtStatusData | null = null;
  isLoading = true;
  isMobile = false;
  timeAgo = '';

  private destroy$ = new Subject<void>();
  private timeAgoInterval: any;

  constructor(
    private courtStatusService: CourtStatusService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.checkMobileView();
  }

  ngOnInit(): void {
    // Subscribe to court status updates
    this.courtStatusService.getCurrentStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.courtStatus = status;
          this.isLoading = false;
          this.updateTimeAgo();
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading court status:', error);
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });

    // Start auto-refresh polling
    this.courtStatusService.startAutoRefresh();

    // Update "time ago" display every 5 seconds
    this.timeAgoInterval = setInterval(() => {
      this.updateTimeAgo();
      this.cdr.markForCheck();
    }, 5000);
  }

  ngOnDestroy(): void {
    // Stop auto-refresh
    this.courtStatusService.stopAutoRefresh();

    // Clear time ago interval
    if (this.timeAgoInterval) {
      clearInterval(this.timeAgoInterval);
    }

    // Unsubscribe from all observables
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Manual refresh button handler
   */
  onRefresh(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.courtStatusService.refreshStatus();
  }

  /**
   * Navigate to reservations page
   */
  onBookCourt(): void {
    this.router.navigate(['/reservations']);
  }

  /**
   * Check if current view is mobile
   */
  @HostListener('window:resize')
  onResize(): void {
    this.checkMobileView();
  }

  private checkMobileView(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  /**
   * Update "time ago" display
   */
  private updateTimeAgo(): void {
    if (!this.courtStatus || !this.courtStatus.lastUpdated) {
      this.timeAgo = '';
      return;
    }

    const now = new Date().getTime();
    const updated = new Date(this.courtStatus.lastUpdated).getTime();
    const diffSeconds = Math.floor((now - updated) / 1000);

    if (diffSeconds < 10) {
      this.timeAgo = 'just now';
    } else if (diffSeconds < 60) {
      this.timeAgo = `${diffSeconds}s ago`;
    } else if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);
      this.timeAgo = `${minutes}m ago`;
    } else {
      const hours = Math.floor(diffSeconds / 3600);
      this.timeAgo = `${hours}h ago`;
    }
  }

  /**
   * Get status icon based on court status
   */
  getStatusIcon(): string {
    if (!this.courtStatus) return 'sports_tennis';

    switch (this.courtStatus.courtStatus) {
      case 'available':
        return 'check_circle';
      case 'closed':
        return 'schedule';
      default:
        return 'sports_tennis';
    }
  }

  /**
   * Check if showing empty state (no reservations all day)
   */
  showEmptyState(): boolean {
    if (!this.courtStatus || this.courtStatus.courtStatus === 'closed') {
      return false;
    }

    // Show empty state only if:
    // 1. No reservations at all today, AND
    // 2. No current slot exists, AND
    // 3. No next slot exists
    return !this.courtStatus.hasAnyReservationsToday &&
           !this.courtStatus.current.exists &&
           !this.courtStatus.next.exists;
  }

  /**
   * Check if showing normal state (current/next split view)
   */
  showNormalState(): boolean {
    if (!this.courtStatus) {
      return false;
    }

    // Show normal state if:
    // 1. Court is closed (before/after hours), OR
    // 2. There are any reservations today (even if not current/next), OR
    // 3. Either current or next slot exists
    return this.courtStatus.courtStatus === 'closed' ||
           this.courtStatus.hasAnyReservationsToday ||
           this.courtStatus.current.exists ||
           this.courtStatus.next.exists;
  }

  /**
   * Check if "Available" message should show for current slot
   * Only show when court is OPEN and no reservation exists
   */
  isCurrentSlotAvailable(): boolean {
    if (!this.courtStatus) return false;
    if (this.courtStatus.courtStatus === 'closed') return false;
    return !this.courtStatus.current.exists && !this.courtStatus.current.isBlocked;
  }

  /**
   * Check if "No upcoming" message should show for next slot
   * Only show when there's genuinely no next reservation
   */
  isNextSlotEmpty(): boolean {
    if (!this.courtStatus) return false;
    if (this.courtStatus.courtStatus === 'closed') return false;
    return !this.courtStatus.next.exists && !this.courtStatus.next.isBlocked;
  }
}
