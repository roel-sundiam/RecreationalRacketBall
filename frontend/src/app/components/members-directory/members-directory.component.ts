import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { MemberService, Member, MemberDirectory, MemberSearchParams } from '../../services/member.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-members-directory',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatToolbarModule,
    MatGridListModule,
    MatTooltipModule
  ],
  template: `
    <div class="page-container">
      <div class="page-content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="header-content">
            <div class="title-section">
              <button mat-icon-button (click)="goBack()" class="back-button">
                <mat-icon>arrow_back</mat-icon>
              </button>
              <div class="title-info">
                <h1 class="page-title">
                  <mat-icon>people</mat-icon>
                  Member Directory
                </h1>
                <p class="page-subtitle" *ngIf="!loading && memberData?.pagination">
                  {{memberData.pagination.total}} members in our community
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Search and Filters -->
        <div class="filters-card">
          <form [formGroup]="filterForm" class="filters-form">
          <!-- Search Bar -->
          <mat-form-field class="search-field" appearance="outline">
            <mat-label>Search members</mat-label>
            <input matInput 
                   formControlName="search" 
                   placeholder="Search by name, username, or email..."
                   #searchInput>
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <!-- Filter Controls -->
          <div class="filter-controls">
            <mat-form-field appearance="outline">
              <mat-label>Gender</mat-label>
              <mat-select formControlName="gender">
                <mat-option value="">All</mat-option>
                <mat-option value="male">Male</mat-option>
                <mat-option value="female">Female</mat-option>
                <mat-option value="other">Other</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" *ngIf="isAdmin">
              <mat-label>Status</mat-label>
              <mat-select formControlName="approved">
                <mat-option value="">All</mat-option>
                <mat-option [value]="true">Approved</mat-option>
                <mat-option [value]="false">Pending</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Sort by</mat-label>
              <mat-select formControlName="sortBy">
                <mat-option value="name">Name</mat-option>
                <mat-option value="registrationDate">Registration Date</mat-option>
                <mat-option value="lastActivity">Last Activity</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Order</mat-label>
              <mat-select formControlName="sortOrder">
                <mat-option value="asc">A-Z / Oldest First</mat-option>
                <mat-option value="desc">Z-A / Newest First</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          </form>

          <!-- Active Filters Display -->
          <div class="active-filters" *ngIf="hasActiveFilters()">
            <span class="filters-label">Active filters:</span>
            <mat-chip-set>
              <mat-chip *ngIf="filterForm.get('gender')?.value" 
                        (removed)="clearFilter('gender')" 
                        removable>
                Gender: {{filterForm.get('gender')?.value}}
                <mat-icon matChipRemove>cancel</mat-icon>
              </mat-chip>
              <mat-chip *ngIf="filterForm.get('approved')?.value !== null && filterForm.get('approved')?.value !== ''" 
                        (removed)="clearFilter('approved')" 
                        removable>
                Status: {{filterForm.get('approved')?.value ? 'Approved' : 'Pending'}}
                <mat-icon matChipRemove>cancel</mat-icon>
              </mat-chip>
            </mat-chip-set>
            <button mat-button (click)="clearAllFilters()" class="clear-all-btn">
              Clear All
            </button>
          </div>
        </div>

        <!-- Loading Spinner -->
        <div class="loading-card" *ngIf="loading">
          <mat-spinner></mat-spinner>
          <p>Loading members...</p>
        </div>

        <!-- Error Message -->
        <div class="error-card" *ngIf="error && !loading">
          <mat-icon class="error-icon">error</mat-icon>
          <h3>Unable to load members</h3>
          <p>{{error}}</p>
          <button mat-raised-button color="primary" (click)="loadMembers()" class="retry-btn">
            <mat-icon>refresh</mat-icon>
            Try Again
          </button>
        </div>

        <!-- Members Grid -->
        <div class="members-content" *ngIf="!loading && !error && memberData">
          <!-- No results message -->
          <div class="no-results-card" *ngIf="memberData?.data && memberData.data.length === 0">
            <mat-icon class="no-results-icon">search_off</mat-icon>
            <h3>No members found</h3>
            <p>Try adjusting your search criteria or filters.</p>
          </div>

          <!-- Mobile Filter Buttons -->
          <div class="mobile-filters">
            <!-- Homeowner Filter -->
            <div class="filter-group">
              <span class="filter-label">Homeowner Status</span>
              <button class="filter-btn homeowner"
                      [class.active]="mobileFilters.homeowner === true"
                      (click)="toggleMobileFilter('homeowner', true)">
                <mat-icon>home</mat-icon>
                Homeowner
              </button>
              <button class="filter-btn"
                      [class.active]="mobileFilters.homeowner === false"
                      (click)="toggleMobileFilter('homeowner', false)">
                <mat-icon>home_work</mat-icon>
                Non-Homeowner
              </button>
            </div>

            <!-- Gender Filter -->
            <div class="filter-group">
              <span class="filter-label">Gender</span>
              <button class="filter-btn male"
                      [class.active]="mobileFilters.gender === 'male'"
                      (click)="toggleMobileFilter('gender', 'male')">
                <mat-icon>man</mat-icon>
                Male
              </button>
              <button class="filter-btn female"
                      [class.active]="mobileFilters.gender === 'female'"
                      (click)="toggleMobileFilter('gender', 'female')">
                <mat-icon>woman</mat-icon>
                Female
              </button>
            </div>

            <!-- Payment Status Filter -->
            <div class="filter-group">
              <span class="filter-label">Payment Status</span>
              <button class="filter-btn paid"
                      [class.active]="mobileFilters.paid === true"
                      (click)="toggleMobileFilter('paid', true)">
                <mat-icon>check_circle</mat-icon>
                Paid
              </button>
              <button class="filter-btn unpaid"
                      [class.active]="mobileFilters.paid === false"
                      (click)="toggleMobileFilter('paid', false)">
                <mat-icon>cancel</mat-icon>
                Unpaid
              </button>
            </div>
          </div>

          <!-- Members Grid -->
          <div class="members-grid" *ngIf="memberData?.data && memberData.data.length > 0">
            <div class="member-card" *ngFor="let member of memberData.data">
              <!-- Gender Badge (Mobile) -->
              <div class="gender-badge"
                   *ngIf="member.gender"
                   [class.male]="member.gender.toLowerCase() === 'male'"
                   [class.female]="member.gender.toLowerCase() === 'female'"
                   [matTooltip]="member.gender | titlecase">
                <mat-icon>{{member.gender.toLowerCase() === 'male' ? 'man' : 'woman'}}</mat-icon>
              </div>

              <div class="card-header">
                <div class="member-avatar">
                  <mat-icon *ngIf="!member.profilePicture">person</mat-icon>
                  <img *ngIf="member.profilePicture" [src]="member.profilePicture" [alt]="member.fullName">
                </div>
                
                <div class="member-title">
                  <div class="name-section">
                    <span class="member-name">{{member.fullName}}</span>
                    <mat-icon class="role-icon" 
                              [class.admin-role]="member.role === 'admin' || member.role === 'superadmin'"
                              [matTooltip]="member.role | titlecase"
                              *ngIf="member.role !== 'member'">
                      {{member.role === 'admin' || member.role === 'superadmin' ? 'admin_panel_settings' : 'person'}}
                    </mat-icon>
                  </div>
                  
                  <div class="member-info">
                    <span class="username">@{{member.username}}</span>
                    <span class="join-date" *ngIf="member.registrationDate">
                      Joined {{member.registrationDate | date:'MMM yyyy'}}
                    </span>
                  </div>
                </div>
              </div>

              <div class="card-content">
                <div class="member-details">
                  <div class="detail-item" *ngIf="member.gender">
                    <mat-icon class="detail-icon">person</mat-icon>
                    <span>{{member.gender | titlecase}}</span>
                  </div>
                  
                  <div class="detail-item" *ngIf="isAdmin || canViewContact(member)">
                    <mat-icon class="detail-icon">email</mat-icon>
                    <span>{{member.email}}</span>
                  </div>
                  
                  <div class="detail-item" *ngIf="(isAdmin || canViewContact(member)) && member.phone">
                    <mat-icon class="detail-icon">phone</mat-icon>
                    <span>{{member.phone}}</span>
                  </div>

                  <!-- Status badges for admin view -->
                  <div class="status-badges" *ngIf="isAdmin">
                    <span class="status-badge approved" *ngIf="member.isApproved">
                      <mat-icon>verified</mat-icon>
                      Approved
                    </span>
                    <span class="status-badge pending" *ngIf="!member.isApproved">
                      <mat-icon>pending</mat-icon>
                      Pending
                    </span>
                    <span class="status-badge paid" *ngIf="member.membershipFeesPaid">
                      <mat-icon>paid</mat-icon>
                      Paid
                    </span>
                    <span class="status-badge unpaid" *ngIf="!member.membershipFeesPaid">
                      <mat-icon>payment</mat-icon>
                      Unpaid
                    </span>
                  </div>
                </div>
              </div>

              <div class="card-actions">
                <button mat-raised-button color="primary" (click)="viewMemberProfile(member._id)" class="action-btn primary">
                  <mat-icon>person</mat-icon>
                  View Profile
                </button>
                
                <button mat-stroked-button 
                        *ngIf="canContact(member)" 
                        (click)="contactMember(member)"
                        class="action-btn secondary">
                  <mat-icon>message</mat-icon>
                  Contact
                </button>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div class="pagination-card" *ngIf="memberData?.pagination && memberData.pagination.totalPages > 1">
            <mat-paginator 
              [length]="memberData.pagination.total"
              [pageSize]="currentPageSize"
              [pageIndex]="memberData.pagination.page - 1"
              [pageSizeOptions]="[12, 24, 48, 96]"
              (page)="onPageChange($event)"
              showFirstLastButtons>
            </mat-paginator>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './members-directory.component.scss'
})
export class MembersDirectoryComponent implements OnInit, OnDestroy {
  filterForm: FormGroup;
  memberData: MemberDirectory | null = null;
  loading = false;
  error = '';
  isAdmin = false;
  currentPageSize = 12;

  // Mobile filter state
  mobileFilters = {
    homeowner: null as boolean | null,
    gender: null as string | null,
    paid: true as boolean | null  // Default to showing only Paid members
  };

  private destroy$ = new Subject<void>();

  constructor(
    private memberService: MemberService,
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      gender: [''],
      approved: [''],
      sortBy: ['name'],
      sortOrder: ['asc']
    });
  }

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.setupFormSubscriptions();
    // Load all members for filtering since we default to showing only Paid members
    this.loadAllMembersForFiltering();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFormSubscriptions(): void {
    this.filterForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadMembers();
    });
  }

  loadMembers(): void {
    this.loading = true;
    this.error = '';

    const params: MemberSearchParams = {
      ...this.filterForm.value,
      page: this.memberData?.pagination?.page || 1,
      limit: this.currentPageSize
    };

    Object.keys(params).forEach(key => {
      if (params[key as keyof MemberSearchParams] === '' || params[key as keyof MemberSearchParams] === null) {
        delete params[key as keyof MemberSearchParams];
      }
    });

    this.memberService.getMembers(params).subscribe({
      next: (response: MemberDirectory) => {
        console.log('Members API response:', response);
        this.memberData = response;
        // Store original data for mobile filtering
        this.originalMemberData = JSON.parse(JSON.stringify(response));
        this.loading = false;
        // Apply any active mobile filters
        if (this.mobileFilters.homeowner !== null || this.mobileFilters.gender || this.mobileFilters.paid !== null) {
          this.loadMembersWithMobileFilters();
        }
      },
      error: (error) => {
        console.error('Error loading members:', error);
        this.error = error.error?.message || 'Failed to load members. Please try again.';
        this.loading = false;
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPageSize = event.pageSize;
    const newPage = event.pageIndex + 1;
    
    if (this.memberData?.pagination) {
      this.memberData.pagination.page = newPage;
      this.loadMembers();
    }
  }

  hasActiveFilters(): boolean {
    const values = this.filterForm.value;
    return values.gender !== '' || 
           (values.approved !== '' && values.approved !== null) ||
           values.search !== '';
  }

  clearFilter(filterName: string): void {
    this.filterForm.patchValue({ [filterName]: '' });
  }

  clearAllFilters(): void {
    this.filterForm.patchValue({
      search: '',
      gender: '',
      approved: ''
    });
  }

  toggleMobileFilter(filterType: string, value: any): void {
    // Toggle filter - if clicking the same value, clear it; otherwise set it
    switch (filterType) {
      case 'homeowner':
        this.mobileFilters.homeowner = this.mobileFilters.homeowner === value ? null : value;
        break;
      case 'gender':
        this.mobileFilters.gender = this.mobileFilters.gender === value ? null : value;
        break;
      case 'paid':
        this.mobileFilters.paid = this.mobileFilters.paid === value ? null : value;
        break;
    }

    // Check if any filter is active
    const hasActiveFilter = this.mobileFilters.homeowner !== null ||
                           this.mobileFilters.gender !== null ||
                           this.mobileFilters.paid !== null;

    if (hasActiveFilter) {
      // Load ALL members for filtering
      this.loadAllMembersForFiltering();
    } else {
      // No filters active, reload with pagination
      this.loadMembers();
    }
  }

  private originalMemberData: any = null; // Store unfiltered data

  loadAllMembersForFiltering(): void {
    this.loading = true;
    this.error = '';

    // Load ALL members (no pagination) for filtering
    const params: MemberSearchParams = {
      limit: 100, // Max allowed by backend
      page: 1
    };

    this.memberService.getMembers(params).subscribe({
      next: (response: MemberDirectory) => {
        console.log('📥 Loaded ALL members for filtering:', response.data.length);
        // Store as original data
        this.originalMemberData = JSON.parse(JSON.stringify(response));
        this.loading = false;
        // Apply filters
        this.loadMembersWithMobileFilters();
      },
      error: (error) => {
        console.error('Error loading all members:', error);
        this.error = error.error?.message || 'Failed to load members for filtering.';
        this.loading = false;
      }
    });
  }

  loadMembersWithMobileFilters(): void {
    // Store original data if not already stored
    if (!this.originalMemberData && this.memberData?.data) {
      this.originalMemberData = JSON.parse(JSON.stringify(this.memberData));
    }

    // Debug logging
    console.log('🔍 Mobile Filters:', this.mobileFilters);
    console.log('📊 Original Data Count:', this.originalMemberData?.data?.length);

    // If no filters active, restore original data
    if (this.mobileFilters.homeowner === null && !this.mobileFilters.gender && this.mobileFilters.paid === null) {
      if (this.originalMemberData) {
        this.memberData = JSON.parse(JSON.stringify(this.originalMemberData));
      }
      return;
    }

    // Apply filters to original data
    if (this.originalMemberData?.data) {
      let filtered = [...this.originalMemberData.data];

      console.log('👥 Members before filter:', filtered.length);
      console.log('🏠 Sample isHomeowner values:', filtered.slice(0, 5).map((m: any) => ({ name: m.fullName, isHomeowner: m.isHomeowner })));

      // Filter by homeowner status
      if (this.mobileFilters.homeowner !== null) {
        console.log('🔎 Filtering by homeowner:', this.mobileFilters.homeowner);
        filtered = filtered.filter((member: any) => member.isHomeowner === this.mobileFilters.homeowner);
        console.log('✅ After homeowner filter:', filtered.length);
      }

      // Filter by gender
      if (this.mobileFilters.gender) {
        filtered = filtered.filter((member: any) =>
          member.gender?.toLowerCase() === this.mobileFilters.gender?.toLowerCase()
        );
      }

      // Filter by payment status (2026 membership)
      if (this.mobileFilters.paid !== null) {
        filtered = filtered.filter((member: any) => {
          const hasPaid2026 = member.membershipYearsPaid?.includes(2026) || false;
          return hasPaid2026 === this.mobileFilters.paid;
        });
      }

      // Update memberData with filtered results
      this.memberData = {
        ...this.originalMemberData,
        data: filtered,
        pagination: {
          ...this.originalMemberData.pagination,
          total: filtered.length
        }
      };
    }
  }

  canViewContact(member: Member): boolean {
    return member._id === this.authService.currentUser?._id || this.isAdmin;
  }

  canContact(member: Member): boolean {
    return member._id !== this.authService.currentUser?._id && 
           member.isApproved && 
           member.isActive;
  }

  viewMemberProfile(memberId: string): void {
    this.router.navigate(['/members', memberId]);
  }

  contactMember(member: Member): void {
    console.log('Contact member:', member.username);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}