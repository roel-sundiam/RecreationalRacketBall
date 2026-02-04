import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService, ClubMembership } from '../../services/auth.service';

@Component({
  selector: 'app-club-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './club-selector.component.html',
  styleUrls: ['./club-selector.component.scss']
})
export class ClubSelectorComponent implements OnInit {
  clubs: ClubMembership[] = [];
  loading = true;
  isSuperAdmin = false;
  returnUrl: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Check for return URL from query params or auth service
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || this.authService.getIntendedRoute() || '/dashboard';
      console.log('🔄 Club Selector - Return URL:', this.returnUrl);
    });

    this.loadClubs();
  }

  loadClubs(): void {
    this.clubs = this.authService.approvedClubs;
    this.isSuperAdmin = this.authService.isSuperAdmin();
    this.loading = false;

    // If user has no approved clubs, show message
    if (this.clubs.length === 0) {
      console.log('User has no approved clubs');
    }
  }

  selectClub(club: ClubMembership): void {
    this.authService.selectClub(club);
    console.log('✅ Selected club:', (club as any).clubName || club.club?.name || club.clubId);

    // Clear the intended route from auth service
    this.authService.clearIntendedRoute();

    // Navigate to return URL or dashboard
    const navigateTo = this.returnUrl || '/dashboard';
    console.log('🔄 Navigating to:', navigateTo);
    this.router.navigateByUrl(navigateTo);
  }

  navigateToRegistration(): void {
    this.router.navigate(['/club-registration']);
  }

  getClubStatusColor(status: string): string {
    switch (status) {
      case 'approved':
        return 'primary';
      case 'pending':
        return 'accent';
      case 'suspended':
        return 'warn';
      default:
        return '';
    }
  }

  getClubStatusIcon(status: string): string {
    switch (status) {
      case 'approved':
        return 'check_circle';
      case 'pending':
        return 'schedule';
      case 'suspended':
        return 'block';
      default:
        return 'help';
    }
  }
}
