import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
    MatIconModule,
    MatProgressSpinnerModule,
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
  expandedClubs = new Set<string>();

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

  toggleClubExpanded(clubId: string): void {
    if (this.expandedClubs.has(clubId)) {
      this.expandedClubs.delete(clubId);
    } else {
      this.expandedClubs.add(clubId);
    }
  }

  isClubExpanded(clubId: string): boolean {
    return this.expandedClubs.has(clubId);
  }

}
