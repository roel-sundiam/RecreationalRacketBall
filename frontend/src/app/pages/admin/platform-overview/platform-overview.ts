import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { environment } from '../../../../environments/environment';

interface ClubMember {
  userId: {
    _id: string;
    username: string;
    fullName: string;
    email: string;
  };
  role: 'member' | 'admin' | 'treasurer';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  joinedAt: string;
}

interface ClubOverview {
  _id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'trial';
  logo: string | null;
  primaryColor: string;
  address: {
    city: string;
    province: string;
  };
  members: ClubMember[];
  memberCount: number;
  adminCount: number;
  activeMembers: number;
}

@Component({
  selector: 'app-platform-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatExpansionModule,
    MatBadgeModule,
  ],
  templateUrl: './platform-overview.html',
  styleUrls: ['./platform-overview.scss'],
})
export class PlatformOverviewComponent implements OnInit {
  clubs: ClubOverview[] = [];
  loading = true;
  totalClubs = 0;
  totalMembers = 0;
  totalAdmins = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPlatformOverview();
  }

  loadPlatformOverview(): void {
    this.http.get<any>(`${environment.apiUrl}/clubs/platform/overview`).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.clubs = response.data;
          this.calculateTotals();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load platform overview:', error);
        this.loading = false;
      },
    });
  }

  calculateTotals(): void {
    this.totalClubs = this.clubs.length;
    this.totalMembers = this.clubs.reduce((sum, club) => sum + club.memberCount, 0);
    this.totalAdmins = this.clubs.reduce((sum, club) => sum + club.adminCount, 0);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'primary';
      case 'trial':
        return 'accent';
      case 'suspended':
        return 'warn';
      default:
        return '';
    }
  }

  getRoleColor(role: string): string {
    switch (role) {
      case 'admin':
        return 'warn';
      case 'treasurer':
        return 'accent';
      case 'member':
        return 'primary';
      default:
        return '';
    }
  }

  getMemberStatusColor(status: string): string {
    switch (status) {
      case 'approved':
        return 'primary';
      case 'pending':
        return 'accent';
      case 'rejected':
        return 'warn';
      case 'suspended':
        return 'warn';
      default:
        return '';
    }
  }

  adjustColor(color: string): string {
    // Darken the color slightly for gradient effect
    try {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);

      const darkenFactor = 0.8;
      const newR = Math.floor(r * darkenFactor);
      const newG = Math.floor(g * darkenFactor);
      const newB = Math.floor(b * darkenFactor);

      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    } catch {
      return color;
    }
  }
}
