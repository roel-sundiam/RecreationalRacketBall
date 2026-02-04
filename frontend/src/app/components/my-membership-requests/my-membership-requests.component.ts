import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../environments/environment';
import { DialogService } from '../../services/dialog.service';
import { SnackbarService } from '../../services/snackbar.service';

interface MembershipRequest {
  _id: string;
  club: {
    _id: string;
    name: string;
    slug: string;
    logo: string | null;
    primaryColor: string;
    accentColor: string;
    status: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  role: string;
  joinedAt: string;
  approvedAt?: string;
  creditBalance: number;
  seedPoints: number;
}

@Component({
  selector: 'app-my-membership-requests',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './my-membership-requests.component.html',
  styleUrls: ['./my-membership-requests.component.scss']
})
export class MyMembershipRequestsComponent implements OnInit {
  requests: MembershipRequest[] = [];
  loading = true;
  canceling = false;
  selectedRequestId: string | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private dialogService: DialogService,
    private snackbarService: SnackbarService
  ) {}

  ngOnInit(): void {
    this.loadMyRequests();
  }

  loadMyRequests(): void {
    this.http.get<any>(`${environment.apiUrl}/members/my-requests`).subscribe({
      next: (response) => {
        this.requests = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Failed to load requests:', error);
        this.loading = false;
      }
    });
  }

  cancelRequest(requestId: string): void {
    this.dialogService.confirm({
      title: 'Cancel Membership Request',
      message: 'Are you sure you want to cancel this membership request?',
      type: 'warning',
      icon: 'cancel',
      confirmText: 'Cancel Request',
      cancelText: 'Keep Request'
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.canceling = true;
      this.selectedRequestId = requestId;

      this.http.delete<any>(`${environment.apiUrl}/members/requests/${requestId}/cancel`).subscribe({
        next: (response) => {
          this.snackbarService.success(response.message);
          this.loadMyRequests();
          this.canceling = false;
          this.selectedRequestId = null;
        },
        error: (error) => {
          this.snackbarService.error(error.error?.error || 'Failed to cancel request');
          this.canceling = false;
          this.selectedRequestId = null;
        }
      });
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'approved': return 'primary';
      case 'pending': return 'accent';
      case 'rejected': return 'warn';
      case 'suspended': return 'warn';
      default: return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'approved': return 'check_circle';
      case 'pending': return 'schedule';
      case 'rejected': return 'cancel';
      case 'suspended': return 'block';
      default: return 'help';
    }
  }

  browseClubs(): void {
    this.router.navigate(['/browse-clubs']);
  }

  goToClubSelector(): void {
    this.router.navigate(['/club-selector']);
  }
}
