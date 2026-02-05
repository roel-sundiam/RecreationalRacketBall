import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { AuthService, ClubMembership } from '../../services/auth.service';

@Component({
  selector: 'app-club-switcher',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatBadgeModule,
    MatTooltipModule,
  ],
  templateUrl: './club-switcher.component.html',
  styleUrls: ['./club-switcher.component.scss'],
})
export class ClubSwitcherComponent implements OnInit, OnDestroy {
  clubs: ClubMembership[] = [];
  selectedClub: ClubMembership | null = null;
  private subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Subscribe to clubs
    this.subscription.add(
      this.authService.clubs$.subscribe((clubs) => {
        this.clubs = clubs.filter((c) => c.status === 'approved');
      }),
    );

    // Subscribe to selected club
    this.subscription.add(
      this.authService.selectedClub$.subscribe((club) => {
        this.selectedClub = club;
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  switchClub(club: ClubMembership): void {
    if (this.selectedClub?.clubId === club.clubId) {
      console.log('⚠️ Club already selected, skipping switch');
      return; // Already selected
    }

    const fromName =
      this.selectedClub?.club?.name ||
      (this.selectedClub as any)?.clubName ||
      this.selectedClub?.clubId;
    const toName = club.club?.name || (club as any)?.clubName || club.clubId;
    console.log('🔄 Switching club from:', fromName, 'to:', toName);
    console.log('Club object:', club);
    this.authService.selectClub(club);
    console.log('✅ Switched to club:', toName);
    // No page reload needed - components subscribe to club changes
  }

  navigateToClubSelector(): void {
    if (this.isSuperAdmin) {
      this.router.navigate(['/admin/pending-clubs']);
      return;
    }
    this.router.navigate(['/club-selector']);
  }

  get isSuperAdmin(): boolean {
    const role = this.authService.currentUser?.role as string | undefined;
    return role === 'superadmin' || role === 'platform_admin';
  }

  get hasMultipleClubs(): boolean {
    return this.clubs.length > 1;
  }

  get displayName(): string {
    if (!this.selectedClub) {
      return 'No Club Selected';
    }
    // Handle both data structures: nested club object or direct clubName property
    return this.selectedClub.club?.name || (this.selectedClub as any).clubName || 'Unknown Club';
  }

  get displayLogo(): string | null {
    // Handle both data structures: nested club object or direct clubLogo property
    return this.selectedClub?.club?.logo || (this.selectedClub as any).clubLogo || null;
  }

  getRoleIcon(role: string): string {
    switch (role) {
      case 'admin':
        return 'admin_panel_settings';
      case 'treasurer':
        return 'account_balance';
      default:
        return 'person';
    }
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'admin':
        return '#f44336';
      case 'treasurer':
        return '#4caf50';
      default:
        return '#2196f3';
    }
  }
}
