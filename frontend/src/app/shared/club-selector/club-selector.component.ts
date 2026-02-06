import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';

export interface ClubOption {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  primaryColor?: string;
  accentColor?: string;
  status?: string;
}

@Component({
  selector: 'app-club-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule
  ],
  template: `
    <mat-form-field class="club-selector" [appearance]="appearance">
      <mat-label>{{ label }}</mat-label>
      <mat-select
        [(value)]="selectedClubId"
        (selectionChange)="onClubChange()"
        [disabled]="loading || disabled">
        <mat-option *ngIf="showAllOption" value="">
          All Clubs
        </mat-option>
        <mat-option *ngFor="let club of clubs" [value]="club._id">
          <div class="club-option">
            <img *ngIf="club.logo" [src]="club.logo" [alt]="club.name" class="club-logo">
            <span class="club-name">{{ club.name }}</span>
            <span *ngIf="club.status === 'suspended'" class="club-status suspended">Suspended</span>
          </div>
        </mat-option>
      </mat-select>
      <mat-spinner *ngIf="loading" diameter="20" class="loading-spinner"></mat-spinner>
    </mat-form-field>
  `,
  styles: [`
    .club-selector {
      min-width: 250px;
      width: 100%;
    }

    .club-option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 4px 0;
    }

    .club-logo {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid rgba(0, 0, 0, 0.12);
    }

    .club-name {
      flex: 1;
      font-size: 15px;
      font-weight: 500;
    }

    .club-status {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .club-status.suspended {
      background-color: #ffebee;
      color: #c62828;
    }

    .loading-spinner {
      position: absolute;
      right: 30px;
      top: 50%;
      transform: translateY(-50%);
    }

    /* Mobile responsive */
    @media (max-width: 767px) {
      .club-selector {
        min-width: 100%;
      }

      .club-option {
        gap: 8px;
      }

      .club-logo {
        width: 20px;
        height: 20px;
      }

      .club-name {
        font-size: 14px;
      }
    }
  `]
})
export class ClubSelectorComponent implements OnInit {
  @Input() label: string = 'Select Club';
  @Input() showAllOption: boolean = false;
  @Input() appearance: 'fill' | 'outline' = 'outline';
  @Input() disabled: boolean = false;
  @Input() autoSelectFirst: boolean = false;
  @Input() initialClubId: string = '';

  @Output() clubSelected = new EventEmitter<ClubOption | null>();

  clubs: ClubOption[] = [];
  selectedClubId: string = '';
  loading: boolean = false;

  constructor(
    private http: HttpClient,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadClubs();
  }

  loadClubs(): void {
    this.loading = true;

    // Determine which endpoint to use based on user role
    const isSuperAdminOrPlatformAdmin =
      this.authService.isSuperAdmin() || this.authService.isPlatformAdmin();

    if (isSuperAdminOrPlatformAdmin) {
      // Load all clubs for superadmins/platform admins
      this.http.get<any>('/api/clubs/platform/all').subscribe({
        next: (response) => {
          this.clubs = response.data || response.clubs || response || [];
          this.initializeSelection();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading clubs:', error);
          this.fallbackToUserClubs();
        }
      });
    } else {
      // Use user's clubs from auth service
      this.fallbackToUserClubs();
    }
  }

  private fallbackToUserClubs(): void {
    // Get clubs from AuthService (user's clubs from ClubMembership)
    const userClubs = this.authService.clubs || [];
    this.clubs = userClubs
      .filter((membership: any) => membership.status === 'approved')
      .map((membership: any) => ({
        _id: membership.clubId || membership.club?._id,
        name: membership.club?.name || membership.clubName,
        slug: membership.club?.slug || membership.clubSlug,
        logo: membership.club?.logo || membership.clubLogo,
        primaryColor: membership.club?.primaryColor || membership.clubPrimaryColor,
        accentColor: membership.club?.accentColor || membership.clubAccentColor,
        status: membership.club?.status || membership.clubStatus
      }));

    this.initializeSelection();
    this.loading = false;
  }

  private initializeSelection(): void {
    if (this.initialClubId) {
      this.selectedClubId = this.initialClubId;
      this.emitSelection();
    } else if (this.autoSelectFirst && this.clubs.length > 0 && !this.showAllOption) {
      this.selectedClubId = this.clubs[0]._id;
      this.emitSelection();
    } else if (this.showAllOption) {
      this.selectedClubId = '';
      this.emitSelection();
    } else {
      // Try to use currently selected club from auth service
      const currentClub = this.authService.selectedClub;
      if (currentClub && currentClub.clubId) {
        this.selectedClubId = currentClub.clubId;
        this.emitSelection();
      }
    }
  }

  onClubChange(): void {
    this.emitSelection();
  }

  private emitSelection(): void {
    if (this.selectedClubId === '') {
      // "All Clubs" selected
      this.clubSelected.emit(null);
    } else {
      const selectedClub = this.clubs.find(c => c._id === this.selectedClubId);
      if (selectedClub) {
        this.clubSelected.emit(selectedClub);
      }
    }
  }

  // Public method to programmatically set club
  setClub(clubId: string): void {
    this.selectedClubId = clubId;
    this.emitSelection();
  }

  // Public method to get currently selected club
  getSelectedClub(): ClubOption | null {
    if (this.selectedClubId === '') {
      return null;
    }
    return this.clubs.find(c => c._id === this.selectedClubId) || null;
  }
}
