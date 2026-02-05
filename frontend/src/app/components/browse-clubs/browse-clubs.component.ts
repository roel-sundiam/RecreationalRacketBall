import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { environment } from '../../../environments/environment';
import { DialogService } from '../../services/dialog.service';
import { SnackbarService } from '../../services/snackbar.service';

interface ClubDetails {
  _id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string;
  accentColor: string;
  address: any;
  contactEmail: string;
  contactPhone: string;
  memberCount: number;
  settings: {
    membershipFee: { annual: number; currency: string };
    pricing: { peakHourFee: number; offPeakHourFee: number; guestFee: number };
    operatingHours: { start: number; end: number };
  };
}

@Component({
  selector: 'app-browse-clubs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  templateUrl: './browse-clubs.component.html',
  styleUrls: ['./browse-clubs.component.scss'],
})
export class BrowseClubsComponent implements OnInit {
  clubs: ClubDetails[] = [];
  filteredClubs: ClubDetails[] = [];
  searchQuery = '';
  loading = true;
  requesting = false;
  selectedClubId: string | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private dialogService: DialogService,
    private snackbarService: SnackbarService,
  ) {}

  ngOnInit(): void {
    this.loadAvailableClubs();
  }

  loadAvailableClubs(): void {
    this.http.get<any>(`${environment.apiUrl}/clubs/available`).subscribe({
      next: (response) => {
        this.clubs = response.data;
        this.filteredClubs = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load clubs:', error);
        this.loading = false;
      },
    });
  }

  searchClubs(query: string): void {
    this.searchQuery = query;
    if (!query.trim()) {
      this.filteredClubs = this.clubs;
      return;
    }

    const lowerQuery = query.toLowerCase();
    this.filteredClubs = this.clubs.filter(
      (club) =>
        club.name.toLowerCase().includes(lowerQuery) ||
        club.address.city.toLowerCase().includes(lowerQuery) ||
        club.address.province.toLowerCase().includes(lowerQuery) ||
        club.address.street.toLowerCase().includes(lowerQuery),
    );
  }

  requestMembership(clubId: string): void {
    this.requesting = true;
    this.selectedClubId = clubId;

    this.http.post<any>(`${environment.apiUrl}/members/request`, { clubId }).subscribe({
      next: (response) => {
        this.dialogService
          .alert({
            title: 'Success',
            message: response.message,
            type: 'info',
            icon: 'check_circle',
          })
          .subscribe(() => {
            this.router.navigate(['/my-requests']);
          });
      },
      error: (error) => {
        this.snackbarService.error(error.error?.error || 'Failed to submit request');
        this.requesting = false;
        this.selectedClubId = null;
      },
    });
  }

  viewMyRequests(): void {
    this.router.navigate(['/my-requests']);
  }
}
