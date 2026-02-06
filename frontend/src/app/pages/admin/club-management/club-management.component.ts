import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

interface Club {
  _id: string;
  name: string;
  slug: string;
  status: string;
  subscriptionTier: string;
  createdAt: string;
  contactEmail: string;
  contactPhone: string;
  sport?: string;
  address?: {
    street?: string;
    city?: string;
    province?: string;
    country?: string;
  };
  logo?: string;
  primaryColor?: string;
  accentColor?: string;
  memberCount?: number;
}

interface User {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
}

@Component({
  selector: 'app-club-management',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
    ReactiveFormsModule
  ],
  templateUrl: './club-management.component.html',
  styleUrls: ['./club-management.component.scss']
})
export class ClubManagementComponent implements OnInit {
  clubs: Club[] = [];
  users: User[] = [];
  loading = false;
  displayedColumns: string[] = ['name', 'status', 'tier', 'members', 'contact', 'created', 'actions'];

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadClubs();
    this.loadUsers();
  }

  async loadClubs(): Promise<void> {
    this.loading = true;
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/clubs/platform/all`
      ).toPromise();

      if (response.success) {
        this.clubs = response.data;
      }
    } catch (error) {
      console.error('Error loading clubs:', error);
      this.snackBar.open('Failed to load clubs', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  async loadUsers(): Promise<void> {
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/members?allClubs=true`
      ).toPromise();

      if (response.success) {
        this.users = response.data;
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  openAddAdminDialog(club: Club): void {
    // Deduplicate users by _id (since allClubs=true returns one entry per membership)
    const uniqueUsers = this.users.filter((user, index, self) =>
      index === self.findIndex((u) => u._id === user._id)
    );

    const dialogRef = this.dialog.open(AddAdminDialogComponent, {
      width: '500px',
      data: { club, users: uniqueUsers }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.addAdmin(club._id, result.userId, result.role);
      }
    });
  }

  openPricingDialog(club: Club): void {
    const dialogRef = this.dialog.open(ClubPricingDialogComponent, {
      width: '600px',
      data: { club }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updatePricing(club._id, result);
      }
    });
  }

  openCreateAdminDialog(club: Club): void {
    const dialogRef = this.dialog.open(CreateAdminDialogComponent, {
      width: '600px',
      data: { club }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createAdmin(club._id, result);
      }
    });
  }

  async addAdmin(clubId: string, userId: string, role: string): Promise<void> {
    try {
      const response: any = await this.http.post(
        `${environment.apiUrl}/clubs/platform/${clubId}/add-admin`,
        { userId, role }
      ).toPromise();

      if (response.success) {
        this.snackBar.open(response.message, 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.loadUsers(); // Refresh user list
      }
    } catch (error: any) {
      console.error('Error adding admin:', error);
      const message = error.error?.error || 'Failed to add admin';
      this.snackBar.open(message, 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    }
  }

  async createAdmin(clubId: string, userData: any): Promise<void> {
    try {
      const response: any = await this.http.post(
        `${environment.apiUrl}/clubs/platform/${clubId}/create-admin`,
        userData
      ).toPromise();

      if (response.success) {
        this.snackBar.open(response.message, 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.loadUsers(); // Refresh user list
      }
    } catch (error: any) {
      console.error('Error creating admin:', error);
      const message = error.error?.error || 'Failed to create admin';
      this.snackBar.open(message, 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    }
  }

  async updatePricing(clubId: string, settingsData: any): Promise<void> {
    try {
      const response: any = await this.http.patch(
        `${environment.apiUrl}/clubs/current/settings`,
        settingsData,
        {
          headers: {
            'X-Club-Id': clubId
          }
        }
      ).toPromise();

      if (response.success) {
        this.snackBar.open('Court settings updated successfully!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      }
    } catch (error: any) {
      console.error('Error updating settings:', error);
      const message = error.error?.error || 'Failed to update court settings';
      this.snackBar.open(message, 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    }
  }

  viewClubDetails(club: Club): void {
    // Navigate to club details or open dialog
    console.log('View club details:', club);
  }

  openEditClubDialog(club: Club): void {
    const dialogRef = this.dialog.open(EditClubDialogComponent, {
      width: '700px',
      data: { club }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateClub(club._id, result);
      }
    });
  }

  openActionsDialog(club: Club): void {
    const dialogRef = this.dialog.open(ClubActionsDialogComponent, {
      width: '750px',
      maxWidth: '95vw',
      data: { club }
    });

    dialogRef.afterClosed().subscribe(action => {
      if (!action) return;

      switch(action) {
        case 'edit':
          this.openEditClubDialog(club);
          break;
        case 'pricing':
          this.openPricingDialog(club);
          break;
        case 'create-admin':
          this.openCreateAdminDialog(club);
          break;
        case 'assign-user':
          this.openAddAdminDialog(club);
          break;
        case 'toggle-status':
          this.toggleClubStatus(club);
          break;
        case 'delete':
          this.deleteClub(club);
          break;
      }
    });
  }

  async updateClub(clubId: string, updateData: any): Promise<void> {
    try {
      const response: any = await this.http.put(
        `${environment.apiUrl}/clubs/platform/${clubId}`,
        updateData
      ).toPromise();

      if (response.success) {
        this.snackBar.open('Club updated successfully!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.loadClubs(); // Refresh the list
      }
    } catch (error: any) {
      console.error('Error updating club:', error);
      const message = error.error?.error || 'Failed to update club';
      this.snackBar.open(message, 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    }
  }

  async toggleClubStatus(club: Club): Promise<void> {
    const newStatus = club.status === 'active' ? 'suspended' : 'active';
    const action = newStatus === 'active' ? 'Activate' : 'Suspend';

    // Only show dialog for suspending
    if (newStatus === 'suspended') {
      const dialogRef = this.dialog.open(SuspendClubDialogComponent, {
        width: '500px',
        data: { club }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.updateClubStatus(club._id, newStatus, action);
        }
      });
    } else {
      // For activation, just proceed
      this.updateClubStatus(club._id, newStatus, action);
    }
  }

  private async updateClubStatus(clubId: string, newStatus: string, action: string): Promise<void> {
    try {
      const response: any = await this.http.patch(
        `${environment.apiUrl}/clubs/platform/${clubId}/status`,
        { status: newStatus }
      ).toPromise();

      if (response.success) {
        this.snackBar.open(`Club ${action.toLowerCase()}d successfully!`, 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.loadClubs(); // Refresh the list
      }
    } catch (error: any) {
      console.error('Error updating club status:', error);
      const message = error.error?.error || `Failed to ${action.toLowerCase()} club`;
      this.snackBar.open(message, 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    }
  }

  deleteClub(club: Club): void {
    const dialogRef = this.dialog.open(DeleteClubDialogComponent, {
      width: '500px',
      data: { club }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.performDeleteClub(club._id);
      }
    });
  }

  private async performDeleteClub(clubId: string): Promise<void> {
    try {
      const response: any = await this.http.delete(
        `${environment.apiUrl}/clubs/platform/${clubId}`
      ).toPromise();

      if (response.success) {
        this.snackBar.open('Club deleted successfully', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.loadClubs(); // Refresh the list
      }
    } catch (error: any) {
      console.error('Error deleting club:', error);
      const message = error.error?.error || 'Failed to delete club';
      this.snackBar.open(message, 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'primary';
      case 'suspended': return 'warn';
      case 'pending': return 'accent';
      default: return '';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

// Dialog Component for Adding Admin
@Component({
  selector: 'app-add-admin-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="assign-user-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <h2>Assign User to Club</h2>
        <p class="dialog-subtitle">{{ data.club.name }}</p>
      </div>

      <!-- Form Content -->
      <form [formGroup]="form" class="assign-form">
        <!-- User Selection Section -->
        <div class="form-section">
          <div class="section-header">
            <h3>Select User</h3>
            <p class="section-description">Choose an existing user to assign admin privileges</p>
          </div>

          <div class="form-group">
            <label for="userId" class="form-label">User <span class="required">*</span></label>
            <select
              id="userId"
              formControlName="userId"
              class="form-select"
              [class.error]="form.get('userId')?.invalid && form.get('userId')?.touched"
              required
            >
              <option value="">Select a user</option>
              <option *ngFor="let user of users" [value]="user._id">
                {{ user.fullName }} ({{ user.username }})
              </option>
            </select>
            <span class="hint-text">Select from existing approved users</span>
            <span class="error-text" *ngIf="form.get('userId')?.hasError('required') && form.get('userId')?.touched">
              Please select a user
            </span>
          </div>

          <!-- User List Preview -->
          <div class="user-list-preview" *ngIf="users.length > 0">
            <div class="preview-info">
              <span class="preview-badge">{{ users.length }}</span>
              <span>user{{ users.length !== 1 ? 's' : '' }} available</span>
            </div>
          </div>
        </div>

        <!-- Role Assignment Section -->
        <div class="form-section">
          <div class="section-header">
            <h3>Role Assignment</h3>
            <p class="section-description">Define the user's responsibilities</p>
          </div>

          <div class="form-group">
            <label for="role" class="form-label">Role <span class="required">*</span></label>
            <select
              id="role"
              formControlName="role"
              class="form-select"
              [class.error]="form.get('role')?.invalid && form.get('role')?.touched"
              required
            >
              <option value="">Select role</option>
              <option value="admin">Admin</option>
              <option value="treasurer">Treasurer</option>
            </select>
            <span class="error-text" *ngIf="form.get('role')?.hasError('required') && form.get('role')?.touched">
              Role is required
            </span>
          </div>

          <!-- Role Descriptions -->
          <div class="role-descriptions">
            <div class="role-card" [class.active]="form.get('role')?.value === 'admin'">
              <div class="role-title">
                <span class="role-badge admin">Admin</span>
                <span class="role-name">Administrator</span>
              </div>
              <ul class="role-features">
                <li>Full access to club settings</li>
                <li>Manage court availability</li>
                <li>View all reservations</li>
                <li>Manage other admins</li>
                <li>Access reports & analytics</li>
              </ul>
            </div>

            <div class="role-card" [class.active]="form.get('role')?.value === 'treasurer'">
              <div class="role-title">
                <span class="role-badge treasurer">Finance</span>
                <span class="role-name">Treasurer</span>
              </div>
              <ul class="role-features">
                <li>View financial reports</li>
                <li>Process payments</li>
                <li>View payment history</li>
                <li>Generate invoices</li>
                <li>Limited setting access</li>
              </ul>
            </div>
          </div>
        </div>
      </form>

      <!-- Actions -->
      <div class="dialog-actions">
        <button type="button" class="btn btn-secondary" (click)="cancel()">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="submit()" [disabled]="form.invalid">
          Assign User
        </button>
      </div>
    </div>
  `,
  styles: [`
    .assign-user-dialog {
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      background: #fff;
    }

    .dialog-header {
      padding: 24px;
      border-bottom: 1px solid #e0e0e0;
      background: linear-gradient(135deg, #f5f7fa 0%, #f8f9fb 100%);
    }

    .dialog-header h2 {
      margin: 0 0 4px 0;
      font-size: 24px;
      font-weight: 600;
      color: #1a202c;
      letter-spacing: -0.5px;
    }

    .dialog-subtitle {
      margin: 0;
      font-size: 14px;
      color: #718096;
      font-weight: 500;
    }

    .assign-form {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .form-section {
      margin-bottom: 32px;

      &:last-of-type {
        margin-bottom: 0;
      }
    }

    .section-header {
      margin-bottom: 16px;
    }

    .section-header h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2d3748;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .section-description {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: #718096;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #2d3748;
      letter-spacing: 0.3px;
    }

    .required {
      color: #e53e3e;
      font-weight: bold;
    }

    .form-select {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #cbd5e0;
      border-radius: 8px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.2s ease;
      background: #fff;
      color: #2d3748;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%234a5568' d='M1 1l5 5 5-5'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
      padding-right: 36px;
      cursor: pointer;

      &:focus {
        outline: none;
        border-color: #4299e1;
        box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
        background-color: #f8fafb;
      }

      &:disabled {
        background: #edf2f7;
        color: #a0aec0;
        cursor: not-allowed;
      }

      &.error {
        border-color: #e53e3e;
        background-color: #fff5f5;

        &:focus {
          box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.1);
        }
      }

      &::-ms-expand {
        display: none;
      }

      option {
        color: #2d3748;
        background: #fff;
      }
    }

    .hint-text {
      display: block;
      margin-top: 6px;
      font-size: 12px;
      color: #718096;
      font-weight: 500;
    }

    .error-text {
      display: block;
      margin-top: 6px;
      font-size: 12px;
      color: #e53e3e;
      font-weight: 500;
    }

    .user-list-preview {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      margin-top: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #4a5568;
    }

    .preview-badge {
      background: #4299e1;
      color: #fff;
      border-radius: 4px;
      padding: 2px 8px;
      font-weight: 600;
      font-size: 12px;
    }

    .role-descriptions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 12px;

      @media (max-width: 600px) {
        grid-template-columns: 1fr;
      }
    }

    .role-card {
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      transition: all 0.2s ease;
      background: #fff;
      cursor: pointer;

      &:hover {
        border-color: #cbd5e0;
        background: #f8fafb;
      }

      &.active {
        border-color: #4299e1;
        background: #ebf8ff;
      }
    }

    .role-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .role-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      &.admin {
        background: #c3dafe;
        color: #2c5282;
      }

      &.treasurer {
        background: #faf089;
        color: #5a4a00;
      }
    }

    .role-name {
      font-size: 13px;
      font-weight: 600;
      color: #2d3748;
    }

    .role-features {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 12px;
      color: #4a5568;
      line-height: 1.6;

      li {
        margin-bottom: 4px;
        padding-left: 16px;
        position: relative;

        &:before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #48bb78;
          font-weight: bold;
        }
      }
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 20px 24px;
      border-top: 1px solid #e0e0e0;
      background: #f8f9fb;
    }

    .btn {
      padding: 11px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

      &:focus {
        outline: none;
      }
    }

    .btn-primary {
      background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
      color: #fff;
      box-shadow: 0 4px 6px rgba(66, 153, 225, 0.25);

      &:hover:not(:disabled) {
        box-shadow: 0 6px 12px rgba(66, 153, 225, 0.35);
        transform: translateY(-2px);
      }

      &:disabled {
        background: #cbd5e0;
        box-shadow: none;
        cursor: not-allowed;
      }
    }

    .btn-secondary {
      background: #fff;
      color: #4a5568;
      border: 1px solid #cbd5e0;

      &:hover:not(:disabled) {
        background: #f7fafc;
        border-color: #a0aec0;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    @media (max-width: 600px) {
      .assign-user-dialog {
        max-height: 100vh;
      }

      .dialog-header {
        padding: 16px;
      }

      .dialog-header h2 {
        font-size: 20px;
      }

      .assign-form {
        padding: 16px;
      }

      .dialog-actions {
        flex-direction: column-reverse;
        padding: 16px;
      }

      .btn {
        width: 100%;
      }

      .role-descriptions {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AddAdminDialogComponent {
  form: FormGroup;
  users: User[];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AddAdminDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { club: Club; users: User[] }
  ) {
    this.users = data.users;
    this.form = this.fb.group({
      userId: ['', Validators.required],
      role: ['admin', Validators.required]
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}

// Dialog Component for Creating New Admin
@Component({
  selector: 'app-create-admin-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="create-admin-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <h2>Create New Club Admin</h2>
        <p class="dialog-subtitle">Add a new administrator account</p>
      </div>

      <!-- Form Content -->
      <form [formGroup]="form" class="admin-form">
        <!-- Account Information Section -->
        <div class="form-section">
          <div class="section-header">
            <h3>Account Information</h3>
          </div>

          <div class="form-group">
            <label for="username" class="form-label">Username <span class="required">*</span></label>
            <input
              type="text"
              id="username"
              formControlName="username"
              class="form-input"
              [class.error]="form.get('username')?.invalid && form.get('username')?.touched"
              placeholder="admin_username"
              required
            />
            <span class="hint-text">3+ characters, letters, numbers, and underscores only</span>
            <span class="error-text" *ngIf="form.get('username')?.hasError('required') && form.get('username')?.touched">
              Username is required
            </span>
            <span class="error-text" *ngIf="form.get('username')?.hasError('minlength') && form.get('username')?.touched">
              Username must be at least 3 characters
            </span>
            <span class="error-text" *ngIf="form.get('username')?.hasError('pattern') && form.get('username')?.touched">
              Username can only contain letters, numbers, and underscores
            </span>
          </div>

          <div class="form-group">
            <label for="email" class="form-label">Email <span class="required">*</span></label>
            <input
              type="email"
              id="email"
              formControlName="email"
              class="form-input"
              [class.error]="form.get('email')?.invalid && form.get('email')?.touched"
              placeholder="admin@club.com"
              required
            />
            <span class="hint-text">Used for login and notifications</span>
            <span class="error-text" *ngIf="form.get('email')?.hasError('required') && form.get('email')?.touched">
              Email is required
            </span>
            <span class="error-text" *ngIf="form.get('email')?.hasError('email') && form.get('email')?.touched">
              Please enter a valid email address
            </span>
          </div>

          <div class="form-group">
            <label for="password" class="form-label">Password <span class="required">*</span></label>
            <input
              type="password"
              id="password"
              formControlName="password"
              class="form-input"
              [class.error]="form.get('password')?.invalid && form.get('password')?.touched"
              placeholder="Minimum 6 characters"
              required
            />
            <span class="hint-text">Must be at least 6 characters long</span>
            <span class="error-text" *ngIf="form.get('password')?.hasError('required') && form.get('password')?.touched">
              Password is required
            </span>
            <span class="error-text" *ngIf="form.get('password')?.hasError('minlength') && form.get('password')?.touched">
              Password must be at least 6 characters
            </span>
          </div>
        </div>

        <!-- Personal Information Section -->
        <div class="form-section">
          <div class="section-header">
            <h3>Personal Information</h3>
          </div>

          <div class="form-group">
            <label for="fullName" class="form-label">Full Name <span class="required">*</span></label>
            <input
              type="text"
              id="fullName"
              formControlName="fullName"
              class="form-input"
              [class.error]="form.get('fullName')?.invalid && form.get('fullName')?.touched"
              placeholder="John Doe"
              required
            />
            <span class="hint-text">Admin's full name</span>
            <span class="error-text" *ngIf="form.get('fullName')?.hasError('required') && form.get('fullName')?.touched">
              Full name is required
            </span>
            <span class="error-text" *ngIf="form.get('fullName')?.hasError('minlength') && form.get('fullName')?.touched">
              Full name must be at least 2 characters
            </span>
          </div>

          <div class="form-group">
            <label for="gender" class="form-label">Gender <span class="required">*</span></label>
            <select
              id="gender"
              formControlName="gender"
              class="form-select"
              [class.error]="form.get('gender')?.invalid && form.get('gender')?.touched"
              required
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <span class="error-text" *ngIf="form.get('gender')?.hasError('required') && form.get('gender')?.touched">
              Gender is required
            </span>
          </div>
        </div>

        <!-- Role Assignment Section -->
        <div class="form-section">
          <div class="section-header">
            <h3>Role Assignment</h3>
          </div>

          <div class="form-group">
            <label for="role" class="form-label">Role <span class="required">*</span></label>
            <select
              id="role"
              formControlName="role"
              class="form-select"
              [class.error]="form.get('role')?.invalid && form.get('role')?.touched"
              required
            >
              <option value="">Select role</option>
              <option value="admin">Admin</option>
              <option value="treasurer">Treasurer</option>
            </select>
            <span class="hint-text">Admin: Full control | Treasurer: Finance only</span>
            <span class="error-text" *ngIf="form.get('role')?.hasError('required') && form.get('role')?.touched">
              Role is required
            </span>
          </div>
        </div>
      </form>

      <!-- Actions -->
      <div class="dialog-actions">
        <button type="button" class="btn btn-secondary" (click)="cancel()">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="submit()" [disabled]="form.invalid">
          Create Admin
        </button>
      </div>
    </div>
  `,
  styles: [`
    .create-admin-dialog {
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      background: #fff;
    }

    .dialog-header {
      padding: 24px;
      border-bottom: 1px solid #e0e0e0;
      background: linear-gradient(135deg, #f5f7fa 0%, #f8f9fb 100%);
    }

    .dialog-header h2 {
      margin: 0 0 4px 0;
      font-size: 24px;
      font-weight: 600;
      color: #1a202c;
      letter-spacing: -0.5px;
    }

    .dialog-subtitle {
      margin: 0;
      font-size: 14px;
      color: #718096;
      font-weight: 500;
    }

    .admin-form {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .form-section {
      margin-bottom: 32px;

      &:last-of-type {
        margin-bottom: 0;
      }
    }

    .section-header {
      margin-bottom: 16px;
    }

    .section-header h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2d3748;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #2d3748;
      letter-spacing: 0.3px;
    }

    .required {
      color: #e53e3e;
      font-weight: bold;
    }

    .form-input,
    .form-select {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #cbd5e0;
      border-radius: 8px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.2s ease;
      background: #fff;
      color: #2d3748;

      &:focus {
        outline: none;
        border-color: #4299e1;
        box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
        background: #f8fafb;
      }

      &:disabled {
        background: #edf2f7;
        color: #a0aec0;
        cursor: not-allowed;
      }

      &.error {
        border-color: #e53e3e;
        background: #fff5f5;

        &:focus {
          box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.1);
        }
      }

      &::placeholder {
        color: #a0aec0;
      }
    }

    .form-select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%234a5568' d='M1 1l5 5 5-5'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 14px center;
      padding-right: 36px;
      cursor: pointer;

      &::-ms-expand {
        display: none;
      }
    }

    .hint-text {
      display: block;
      margin-top: 6px;
      font-size: 12px;
      color: #718096;
      font-weight: 500;
    }

    .error-text {
      display: block;
      margin-top: 6px;
      font-size: 12px;
      color: #e53e3e;
      font-weight: 500;
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 20px 24px;
      border-top: 1px solid #e0e0e0;
      background: #f8f9fb;
    }

    .btn {
      padding: 11px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

      &:focus {
        outline: none;
      }
    }

    .btn-primary {
      background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
      color: #fff;
      box-shadow: 0 4px 6px rgba(66, 153, 225, 0.25);

      &:hover:not(:disabled) {
        box-shadow: 0 6px 12px rgba(66, 153, 225, 0.35);
        transform: translateY(-2px);
      }

      &:disabled {
        background: #cbd5e0;
        box-shadow: none;
        cursor: not-allowed;
      }
    }

    .btn-secondary {
      background: #fff;
      color: #4a5568;
      border: 1px solid #cbd5e0;

      &:hover:not(:disabled) {
        background: #f7fafc;
        border-color: #a0aec0;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    @media (max-width: 600px) {
      .create-admin-dialog {
        max-height: 100vh;
      }

      .dialog-header {
        padding: 16px;
      }

      .dialog-header h2 {
        font-size: 20px;
      }

      .admin-form {
        padding: 16px;
      }

      .dialog-actions {
        flex-direction: column-reverse;
        padding: 16px;
      }

      .btn {
        width: 100%;
      }
    }
  `]
})
export class CreateAdminDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CreateAdminDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { club: Club }
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      gender: ['', Validators.required],
      role: ['admin', Validators.required]
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}

// Dialog Component for Editing Court Fees/Pricing
@Component({
  selector: 'app-club-pricing-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="pricing-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <h2>Court Fees</h2>
        <p class="dialog-subtitle">{{ data.club.name }}</p>
      </div>

      <!-- Form Content -->
      <form [formGroup]="form" class="pricing-form">
        <!-- Operating Hours Section -->
        <div class="form-section">
          <div class="section-header">
            <h3>Operating Hours</h3>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="operatingStart" class="form-label">Opening Hour <span class="required">*</span></label>
              <input
                type="number"
                id="operatingStart"
                formControlName="operatingStart"
                class="form-input"
                [class.error]="form.get('operatingStart')?.invalid && form.get('operatingStart')?.touched"
                min="0"
                max="23"
                required
              />
              <span class="hint-text">Court opens at (0-23). Default: 5 AM</span>
              <span class="error-text" *ngIf="form.get('operatingStart')?.hasError('required') && form.get('operatingStart')?.touched">
                Opening hour is required
              </span>
              <span class="error-text" *ngIf="(form.get('operatingStart')?.hasError('min') || form.get('operatingStart')?.hasError('max')) && form.get('operatingStart')?.touched">
                Must be between 0 and 23
              </span>
            </div>

            <div class="form-group">
              <label for="operatingEnd" class="form-label">Closing Hour <span class="required">*</span></label>
              <input
                type="number"
                id="operatingEnd"
                formControlName="operatingEnd"
                class="form-input"
                [class.error]="form.get('operatingEnd')?.invalid && form.get('operatingEnd')?.touched"
                min="0"
                max="23"
                required
              />
              <span class="hint-text">Court closes at (0-23). Default: 10 PM (22)</span>
              <span class="error-text" *ngIf="form.get('operatingEnd')?.hasError('required') && form.get('operatingEnd')?.touched">
                Closing hour is required
              </span>
              <span class="error-text" *ngIf="(form.get('operatingEnd')?.hasError('min') || form.get('operatingEnd')?.hasError('max')) && form.get('operatingEnd')?.touched">
                Must be between 0 and 23
              </span>
            </div>
          </div>
        </div>

        <!-- Base Fees Section -->
        <div class="form-section">
          <div class="section-header">
            <h3>Base Fees (₱)</h3>
            <p class="section-description">Prices in Philippine Pesos per hour</p>
          </div>

          <div class="form-group">
            <label for="peakHourFee" class="form-label">Peak Hour Fee <span class="required">*</span></label>
            <div class="input-with-currency">
              <span class="currency-symbol">₱</span>
              <input
                type="number"
                id="peakHourFee"
                formControlName="peakHourFee"
                class="form-input"
                [class.error]="form.get('peakHourFee')?.invalid && form.get('peakHourFee')?.touched"
                min="0"
                required
              />
            </div>
            <span class="hint-text">Base fee for peak hours (e.g., 6PM-9PM). Default: ₱150</span>
            <span class="error-text" *ngIf="form.get('peakHourFee')?.hasError('required') && form.get('peakHourFee')?.touched">
              Peak hour fee is required
            </span>
            <span class="error-text" *ngIf="form.get('peakHourFee')?.hasError('min') && form.get('peakHourFee')?.touched">
              Must be at least 0
            </span>
          </div>

          <div class="form-group">
            <label for="offPeakHourFee" class="form-label">Off-Peak Hour Fee <span class="required">*</span></label>
            <div class="input-with-currency">
              <span class="currency-symbol">₱</span>
              <input
                type="number"
                id="offPeakHourFee"
                formControlName="offPeakHourFee"
                class="form-input"
                [class.error]="form.get('offPeakHourFee')?.invalid && form.get('offPeakHourFee')?.touched"
                min="0"
                required
              />
            </div>
            <span class="hint-text">Base fee for off-peak hours. Default: ₱100</span>
            <span class="error-text" *ngIf="form.get('offPeakHourFee')?.hasError('required') && form.get('offPeakHourFee')?.touched">
              Off-peak hour fee is required
            </span>
            <span class="error-text" *ngIf="form.get('offPeakHourFee')?.hasError('min') && form.get('offPeakHourFee')?.touched">
              Must be at least 0
            </span>
          </div>

          <div class="form-group">
            <label for="guestFee" class="form-label">Guest Fee <span class="required">*</span></label>
            <div class="input-with-currency">
              <span class="currency-symbol">₱</span>
              <input
                type="number"
                id="guestFee"
                formControlName="guestFee"
                class="form-input"
                [class.error]="form.get('guestFee')?.invalid && form.get('guestFee')?.touched"
                min="0"
                required
              />
            </div>
            <span class="hint-text">Additional fee per guest per hour. Default: ₱70</span>
            <span class="error-text" *ngIf="form.get('guestFee')?.hasError('required') && form.get('guestFee')?.touched">
              Guest fee is required
            </span>
            <span class="error-text" *ngIf="form.get('guestFee')?.hasError('min') && form.get('guestFee')?.touched">
              Must be at least 0
            </span>
          </div>
        </div>

        <!-- Peak Hours Section -->
        <div class="form-section">
          <div class="section-header">
            <h3>Peak Hours</h3>
            <p class="section-description">Hours when peak pricing applies</p>
          </div>

          <div class="form-group">
            <label for="peakHoursInput" class="form-label">Peak Hours <span class="required">*</span></label>
            <input
              type="text"
              id="peakHoursInput"
              formControlName="peakHoursInput"
              class="form-input"
              [class.error]="form.get('peakHoursInput')?.invalid && form.get('peakHoursInput')?.touched"
              placeholder="5, 18, 19, 20, 21"
            />
            <span class="hint-text">Enter hours in 24-hour format (0-23), separated by commas. Example: 5,18,19,20,21</span>
            <span class="error-text" *ngIf="form.get('peakHoursInput')?.hasError('pattern') && form.get('peakHoursInput')?.touched">
              Please enter valid hours (0-23) separated by commas
            </span>
          </div>
        </div>

        <!-- Preview Section -->
        <div class="preview-section">
          <div class="section-header">
            <h3>Preview</h3>
          </div>

          <div class="preview-content">
            <div class="preview-item">
              <label>Operating Hours</label>
              <span class="preview-value">{{ formatHour(form.value.operatingStart) }} - {{ formatHour(form.value.operatingEnd) }}</span>
            </div>

            <div class="preview-item">
              <label>Peak Hours</label>
              <span class="preview-value">{{ formatPeakHours() }}</span>
            </div>

            <div class="preview-divider"></div>

            <div class="preview-item">
              <label>Example: 1 hour, 2 members, 1 guest</label>
            </div>

            <div class="preview-calculation">
              <div class="calculation-row">
                <span class="calc-label">Peak Hour:</span>
                <span class="calc-formula">₱{{ form.value.peakHourFee }} + (1 × ₱{{ form.value.guestFee }})</span>
                <span class="calc-result">= ₱{{ form.value.peakHourFee + form.value.guestFee }}</span>
              </div>

              <div class="calculation-row">
                <span class="calc-label">Off-Peak Hour:</span>
                <span class="calc-formula">₱{{ form.value.offPeakHourFee }} + (1 × ₱{{ form.value.guestFee }})</span>
                <span class="calc-result">= ₱{{ form.value.offPeakHourFee + form.value.guestFee }}</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      <!-- Actions -->
      <div class="dialog-actions">
        <button type="button" class="btn btn-secondary" (click)="cancel()">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="submit()" [disabled]="form.invalid">
          Save Settings
        </button>
      </div>
    </div>
  `,
  styles: [`
    .pricing-dialog {
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      background: #fff;
    }

    .dialog-header {
      padding: 24px;
      border-bottom: 1px solid #e0e0e0;
      background: linear-gradient(135deg, #f5f7fa 0%, #f8f9fb 100%);
    }

    .dialog-header h2 {
      margin: 0 0 4px 0;
      font-size: 24px;
      font-weight: 600;
      color: #1a202c;
      letter-spacing: -0.5px;
    }

    .dialog-subtitle {
      margin: 0;
      font-size: 14px;
      color: #718096;
      font-weight: 500;
    }

    .pricing-form {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .form-section {
      margin-bottom: 32px;

      &:last-of-type {
        margin-bottom: 0;
      }
    }

    .section-header {
      margin-bottom: 16px;
    }

    .section-header h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2d3748;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .section-description {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: #718096;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;

      @media (max-width: 600px) {
        grid-template-columns: 1fr;
      }
    }

    .form-label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #2d3748;
      letter-spacing: 0.3px;
    }

    .required {
      color: #e53e3e;
      font-weight: bold;
    }

    .form-input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #cbd5e0;
      border-radius: 8px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.2s ease;
      background: #fff;
      color: #2d3748;

      &:focus {
        outline: none;
        border-color: #4299e1;
        box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
        background: #f8fafb;
      }

      &:disabled {
        background: #edf2f7;
        color: #a0aec0;
        cursor: not-allowed;
      }

      &.error {
        border-color: #e53e3e;
        background: #fff5f5;

        &:focus {
          box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.1);
        }
      }

      &::placeholder {
        color: #a0aec0;
      }
    }

    .input-with-currency {
      position: relative;
      display: flex;
      align-items: center;
    }

    .currency-symbol {
      position: absolute;
      left: 14px;
      font-size: 16px;
      font-weight: 600;
      color: #4299e1;
      pointer-events: none;
    }

    .input-with-currency .form-input {
      padding-left: 32px;
    }

    .hint-text {
      display: block;
      margin-top: 6px;
      font-size: 12px;
      color: #718096;
      font-weight: 500;
    }

    .error-text {
      display: block;
      margin-top: 6px;
      font-size: 12px;
      color: #e53e3e;
      font-weight: 500;
    }

    .preview-section {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-top: 32px;
    }

    .preview-content {
      background: #fff;
      border-radius: 6px;
      padding: 16px;
    }

    .preview-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      font-size: 14px;

      label {
        font-weight: 600;
        color: #2d3748;
      }
    }

    .preview-value {
      color: #4299e1;
      font-weight: 600;
      font-size: 13px;
    }

    .preview-divider {
      height: 1px;
      background: #e2e8f0;
      margin: 12px 0;
    }

    .preview-calculation {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
    }

    .calculation-row {
      display: grid;
      grid-template-columns: 150px 1fr auto;
      gap: 8px;
      align-items: center;
      margin-bottom: 8px;
      font-size: 13px;

      @media (max-width: 600px) {
        grid-template-columns: 1fr;
        gap: 4px;
      }
    }

    .calc-label {
      font-weight: 600;
      color: #2d3748;
    }

    .calc-formula {
      color: #718096;
      font-size: 12px;
    }

    .calc-result {
      font-weight: 700;
      color: #22863a;
      background: #f0fdf4;
      padding: 2px 8px;
      border-radius: 4px;
      text-align: right;
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 20px 24px;
      border-top: 1px solid #e0e0e0;
      background: #f8f9fb;
    }

    .btn {
      padding: 11px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

      &:focus {
        outline: none;
      }
    }

    .btn-primary {
      background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
      color: #fff;
      box-shadow: 0 4px 6px rgba(66, 153, 225, 0.25);

      &:hover:not(:disabled) {
        box-shadow: 0 6px 12px rgba(66, 153, 225, 0.35);
        transform: translateY(-2px);
      }

      &:disabled {
        background: #cbd5e0;
        box-shadow: none;
        cursor: not-allowed;
      }
    }

    .btn-secondary {
      background: #fff;
      color: #4a5568;
      border: 1px solid #cbd5e0;

      &:hover:not(:disabled) {
        background: #f7fafc;
        border-color: #a0aec0;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    @media (max-width: 600px) {
      .pricing-dialog {
        max-height: 100vh;
      }

      .dialog-header {
        padding: 16px;
      }

      .dialog-header h2 {
        font-size: 20px;
      }

      .pricing-form {
        padding: 16px;
      }

      .dialog-actions {
        flex-direction: column-reverse;
        padding: 16px;
      }

      .btn {
        width: 100%;
      }

      .calculation-row {
        grid-template-columns: 1fr;
      }

      .calc-result {
        text-align: left;
      }
    }
  `]
})
export class ClubPricingDialogComponent implements OnInit {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public dialogRef: MatDialogRef<ClubPricingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { club: Club }
  ) {
    this.form = this.fb.group({
      operatingStart: [5, [Validators.required, Validators.min(0), Validators.max(23)]],
      operatingEnd: [22, [Validators.required, Validators.min(0), Validators.max(23)]],
      peakHourFee: [150, [Validators.required, Validators.min(0)]],
      offPeakHourFee: [100, [Validators.required, Validators.min(0)]],
      guestFee: [70, [Validators.required, Validators.min(0)]],
      peakHoursInput: ['5, 18, 19, 20, 21', [Validators.pattern(/^[\d,\s]+$/)]]
    });
  }

  async ngOnInit(): Promise<void> {
    // Load current settings
    try {
      const response: any = await this.http.get(
        `${environment.apiUrl}/clubs/current/settings`,
        {
          headers: {
            'X-Club-Id': this.data.club._id
          }
        }
      ).toPromise();

      if (response.success && response.data) {
        const { pricing, operatingHours } = response.data;
        this.form.patchValue({
          operatingStart: operatingHours?.start || 5,
          operatingEnd: operatingHours?.end || 22,
          peakHourFee: pricing?.peakHourFee || 150,
          offPeakHourFee: pricing?.offPeakHourFee || 100,
          guestFee: pricing?.guestFee || 70,
          peakHoursInput: (pricing?.peakHours || [5, 18, 19, 20, 21]).join(', ')
        });
      }
    } catch (error) {
      console.error('Error loading club settings:', error);
    }
  }

  formatHour(hour: number): string {
    if (isNaN(hour)) return '';
    return hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
  }

  formatPeakHours(): string {
    const input = this.form.value.peakHoursInput || '';
    const hours = input.split(',').map((h: string) => h.trim()).filter((h: string) => h);
    return hours.map((h: string) => {
      const hour = parseInt(h);
      if (isNaN(hour)) return h;
      return this.formatHour(hour);
    }).join(', ');
  }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.valid) {
      const peakHours = this.form.value.peakHoursInput
        .split(',')
        .map((h: string) => parseInt(h.trim()))
        .filter((h: number) => !isNaN(h) && h >= 0 && h <= 23);

      this.dialogRef.close({
        operatingHours: {
          start: this.form.value.operatingStart,
          end: this.form.value.operatingEnd
        },
        pricing: {
          peakHourFee: this.form.value.peakHourFee,
          offPeakHourFee: this.form.value.offPeakHourFee,
          guestFee: this.form.value.guestFee,
          peakHours: peakHours
        }
      });
    }
  }
}

// Dialog Component for Editing Club Details
@Component({
  selector: 'app-edit-club-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="edit-club-dialog">
      <!-- Header -->
      <div class="dialog-header">
        <h2>Edit Club</h2>
        <p class="dialog-subtitle">{{ data.club.name }}</p>
      </div>

      <!-- Form Content -->
      <form [formGroup]="form" class="edit-form">
        <!-- Basic Information Section -->
        <div class="form-section">
          <div class="section-header">
            <h3>Basic Information</h3>
          </div>

          <div class="form-group">
            <label for="name" class="form-label">Club Name <span class="required">*</span></label>
            <input
              type="text"
              id="name"
              formControlName="name"
              class="form-input"
              [class.error]="form.get('name')?.invalid && form.get('name')?.touched"
              placeholder="Enter club name"
              required
            />
            <span class="error-text" *ngIf="form.get('name')?.hasError('required') && form.get('name')?.touched">
              Club name is required
            </span>
          </div>

          <div class="form-group">
            <label for="slug" class="form-label">Slug (URL friendly) <span class="required">*</span></label>
            <input
              type="text"
              id="slug"
              formControlName="slug"
              class="form-input"
              [class.error]="form.get('slug')?.invalid && form.get('slug')?.touched"
              placeholder="my-tennis-club"
              required
            />
            <span class="hint-text">Used in URLs. Example: rt2-tennis</span>
            <span class="error-text" *ngIf="form.get('slug')?.hasError('required') && form.get('slug')?.touched">
              Slug is required
            </span>
          </div>

          <div class="form-group">
            <label for="sport" class="form-label">Sport</label>
            <input
              type="text"
              id="sport"
              formControlName="sport"
              class="form-input"
              placeholder="e.g., Tennis, Badminton"
            />
          </div>
        </div>

        <!-- Contact Information Section -->
        <div class="form-section">
          <div class="section-header">
            <h3>Contact Information</h3>
          </div>

          <div class="form-group">
            <label for="contactEmail" class="form-label">Email <span class="required">*</span></label>
            <input
              type="email"
              id="contactEmail"
              formControlName="contactEmail"
              class="form-input"
              [class.error]="form.get('contactEmail')?.invalid && form.get('contactEmail')?.touched"
              placeholder="contact@club.com"
              required
            />
            <span class="error-text" *ngIf="form.get('contactEmail')?.hasError('email') && form.get('contactEmail')?.touched">
              Please enter a valid email
            </span>
            <span class="error-text" *ngIf="form.get('contactEmail')?.hasError('required') && form.get('contactEmail')?.touched">
              Email is required
            </span>
          </div>

          <div class="form-group">
            <label for="contactPhone" class="form-label">Phone</label>
            <input
              type="tel"
              id="contactPhone"
              formControlName="contactPhone"
              class="form-input"
              placeholder="+63 123 456 7890"
            />
          </div>
        </div>

        <!-- Address Section -->
        <div class="form-section">
          <div class="section-header">
            <h3>Address</h3>
          </div>

          <div class="form-group">
            <label for="street" class="form-label">Street</label>
            <input
              type="text"
              id="street"
              formControlName="street"
              class="form-input"
              placeholder="Street address"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="city" class="form-label">City</label>
              <input
                type="text"
                id="city"
                formControlName="city"
                class="form-input"
                placeholder="City"
              />
            </div>

            <div class="form-group">
              <label for="province" class="form-label">Province</label>
              <input
                type="text"
                id="province"
                formControlName="province"
                class="form-input"
                placeholder="Province"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="country" class="form-label">Country</label>
            <input
              type="text"
              id="country"
              formControlName="country"
              class="form-input"
              placeholder="Country"
            />
          </div>
        </div>

        <!-- Branding Section -->
        <div class="form-section">
          <div class="section-header">
            <h3>Branding</h3>
          </div>

          <div class="form-group">
            <label for="logo" class="form-label">Logo URL</label>
            <input
              type="url"
              id="logo"
              formControlName="logo"
              class="form-input"
              placeholder="https://example.com/logo.png"
            />
            <span class="hint-text">URL to your club logo image</span>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="primaryColor" class="form-label">Primary Color</label>
              <div class="color-input-wrapper">
                <input
                  type="color"
                  id="primaryColor"
                  formControlName="primaryColor"
                  class="color-input"
                />
                <input
                  type="text"
                  formControlName="primaryColor"
                  class="form-input"
                  placeholder="#1976d2"
                />
              </div>
              <span class="hint-text">Hex color code</span>
            </div>

            <div class="form-group">
              <label for="accentColor" class="form-label">Accent Color</label>
              <div class="color-input-wrapper">
                <input
                  type="color"
                  id="accentColor"
                  formControlName="accentColor"
                  class="color-input"
                />
                <input
                  type="text"
                  formControlName="accentColor"
                  class="form-input"
                  placeholder="#ff4081"
                />
              </div>
              <span class="hint-text">Hex color code</span>
            </div>
          </div>
        </div>
      </form>

      <!-- Actions -->
      <div class="dialog-actions">
        <button type="button" class="btn btn-secondary" (click)="cancel()">Cancel</button>
        <button type="button" class="btn btn-primary" (click)="submit()" [disabled]="form.invalid">
          Save Changes
        </button>
      </div>
    </div>
  `,
  styles: [`
    .edit-club-dialog {
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      background: #fff;
    }

    .dialog-header {
      padding: 24px;
      border-bottom: 1px solid #e0e0e0;
      background: linear-gradient(135deg, #f5f7fa 0%, #f8f9fb 100%);
    }

    .dialog-header h2 {
      margin: 0 0 4px 0;
      font-size: 24px;
      font-weight: 600;
      color: #1a202c;
      letter-spacing: -0.5px;
    }

    .dialog-subtitle {
      margin: 0;
      font-size: 14px;
      color: #718096;
      font-weight: 500;
    }

    .edit-form {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .form-section {
      margin-bottom: 32px;

      &:last-of-type {
        margin-bottom: 0;
      }
    }

    .section-header {
      margin-bottom: 16px;
    }

    .section-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #2d3748;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;

      @media (max-width: 600px) {
        grid-template-columns: 1fr;
      }
    }

    .form-label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #2d3748;
      letter-spacing: 0.3px;
    }

    .required {
      color: #e53e3e;
      font-weight: bold;
    }

    .form-input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #cbd5e0;
      border-radius: 8px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: all 0.2s ease;
      background: #fff;
      color: #2d3748;

      &:focus {
        outline: none;
        border-color: #4299e1;
        box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
        background: #f8fafb;
      }

      &:disabled {
        background: #edf2f7;
        color: #a0aec0;
        cursor: not-allowed;
      }

      &.error {
        border-color: #e53e3e;
        background: #fff5f5;

        &:focus {
          box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.1);
        }
      }

      &::placeholder {
        color: #a0aec0;
      }
    }

    .color-input-wrapper {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .color-input {
      width: 50px;
      height: 44px;
      border: 1px solid #cbd5e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:focus {
        outline: none;
        border-color: #4299e1;
        box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
      }
    }

    .color-input-wrapper .form-input {
      flex: 1;
      margin: 0;
    }

    .hint-text {
      display: block;
      margin-top: 6px;
      font-size: 12px;
      color: #718096;
      font-weight: 500;
    }

    .error-text {
      display: block;
      margin-top: 6px;
      font-size: 12px;
      color: #e53e3e;
      font-weight: 500;
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 20px 24px;
      border-top: 1px solid #e0e0e0;
      background: #f8f9fb;
    }

    .btn {
      padding: 11px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

      &:focus {
        outline: none;
      }
    }

    .btn-primary {
      background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
      color: #fff;
      box-shadow: 0 4px 6px rgba(66, 153, 225, 0.25);

      &:hover:not(:disabled) {
        box-shadow: 0 6px 12px rgba(66, 153, 225, 0.35);
        transform: translateY(-2px);
      }

      &:disabled {
        background: #cbd5e0;
        box-shadow: none;
        cursor: not-allowed;
      }
    }

    .btn-secondary {
      background: #fff;
      color: #4a5568;
      border: 1px solid #cbd5e0;

      &:hover:not(:disabled) {
        background: #f7fafc;
        border-color: #a0aec0;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    @media (max-width: 600px) {
      .edit-club-dialog {
        max-height: 100vh;
      }

      .dialog-header {
        padding: 16px;
      }

      .dialog-header h2 {
        font-size: 20px;
      }

      .edit-form {
        padding: 16px;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .dialog-actions {
        flex-direction: column-reverse;
        padding: 16px;
      }

      .btn {
        width: 100%;
      }
    }
  `]
})
export class EditClubDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<EditClubDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { club: Club }
  ) {
    this.form = this.fb.group({
      name: [data.club.name, Validators.required],
      slug: [data.club.slug, Validators.required],
      sport: [data.club.sport || ''],
      contactEmail: [data.club.contactEmail, [Validators.required, Validators.email]],
      contactPhone: [data.club.contactPhone || ''],
      street: [data.club.address?.street || ''],
      city: [data.club.address?.city || ''],
      province: [data.club.address?.province || ''],
      country: [data.club.address?.country || ''],
      logo: [data.club.logo || ''],
      primaryColor: [data.club.primaryColor || ''],
      accentColor: [data.club.accentColor || '']
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.valid) {
      const formValue = this.form.value;
      this.dialogRef.close({
        name: formValue.name,
        slug: formValue.slug,
        sport: formValue.sport,
        contactEmail: formValue.contactEmail,
        contactPhone: formValue.contactPhone,
        address: {
          street: formValue.street,
          city: formValue.city,
          province: formValue.province,
          country: formValue.country
        },
        logo: formValue.logo,
        primaryColor: formValue.primaryColor,
        accentColor: formValue.accentColor
      });
    }
  }
}

// Dialog Component for Suspending Club
@Component({
  selector: 'app-suspend-club-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, ReactiveFormsModule],
  template: `
    <div class="suspend-dialog">
      <!-- Header with Warning Icon -->
      <div class="dialog-header warning">
        <div class="icon-wrapper">
          <svg class="warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l9 18H3L12 2z"/>
            <path d="M12 9v4"/>
            <circle cx="12" cy="17" r="1" fill="currentColor"/>
          </svg>
        </div>
        <h2>Suspend Club</h2>
        <p class="dialog-subtitle">{{ data.club.name }}</p>
      </div>

      <!-- Content -->
      <div class="dialog-content">
        <div class="warning-message">
          <p class="warning-title">You are about to suspend this club</p>
          <p class="warning-description">
            When suspended, club admins cannot:
          </p>
          <ul class="impact-list">
            <li>Create or manage reservations</li>
            <li>Access club settings</li>
            <li>View member information</li>
            <li>Process payments</li>
            <li>View reports and analytics</li>
          </ul>
          <p class="recovery-note">
            <strong>Note:</strong> You can reactivate this club at any time from the club list.
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="dialog-actions">
        <button type="button" class="btn btn-secondary" (click)="cancel()">Keep Active</button>
        <button type="button" class="btn btn-warning" (click)="submit()">Suspend Club</button>
      </div>
    </div>
  `,
  styles: [`
    .suspend-dialog {
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      background: #fff;
    }

    .dialog-header {
      padding: 24px;
      border-bottom: 1px solid #e0e0e0;
      text-align: center;

      &.warning {
        background: linear-gradient(135deg, #fef5e7 0%, #fcf3e2 100%);
      }
    }

    .icon-wrapper {
      margin-bottom: 16px;
      display: flex;
      justify-content: center;
    }

    .warning-icon {
      width: 56px;
      height: 56px;
      color: #f39c12;
      filter: drop-shadow(0 2px 4px rgba(243, 156, 18, 0.2));
    }

    .dialog-header h2 {
      margin: 0 0 4px 0;
      font-size: 24px;
      font-weight: 600;
      color: #1a202c;
      letter-spacing: -0.5px;
    }

    .dialog-subtitle {
      margin: 0;
      font-size: 14px;
      color: #718096;
      font-weight: 500;
    }

    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .warning-message {
      background: #fffbf0;
      border: 1px solid #ffe4b5;
      border-radius: 8px;
      padding: 16px;
    }

    .warning-title {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 700;
      color: #c05621;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .warning-description {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #4a5568;
    }

    .impact-list {
      list-style: none;
      padding: 0;
      margin: 0 0 12px 0;
      background: #fff;
      border-radius: 6px;
      padding: 12px;
      font-size: 13px;
      color: #2d3748;

      li {
        margin-bottom: 6px;
        padding-left: 20px;
        position: relative;

        &:last-child {
          margin-bottom: 0;
        }

        &:before {
          content: '•';
          position: absolute;
          left: 8px;
          color: #e53e3e;
          font-weight: bold;
          font-size: 16px;
        }
      }
    }

    .recovery-note {
      margin: 0;
      font-size: 12px;
      color: #4a5568;
      background: #f7fafc;
      border-left: 3px solid #4299e1;
      padding: 8px 12px;
      border-radius: 4px;
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 20px 24px;
      border-top: 1px solid #e0e0e0;
      background: #f8f9fb;
    }

    .btn {
      padding: 11px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

      &:focus {
        outline: none;
      }
    }

    .btn-warning {
      background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
      color: #fff;
      box-shadow: 0 4px 6px rgba(243, 156, 18, 0.25);

      &:hover:not(:disabled) {
        box-shadow: 0 6px 12px rgba(243, 156, 18, 0.35);
        transform: translateY(-2px);
      }

      &:disabled {
        background: #cbd5e0;
        box-shadow: none;
        cursor: not-allowed;
      }
    }

    .btn-secondary {
      background: #fff;
      color: #4a5568;
      border: 1px solid #cbd5e0;

      &:hover:not(:disabled) {
        background: #f7fafc;
        border-color: #a0aec0;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    @media (max-width: 600px) {
      .suspend-dialog {
        max-height: 100vh;
      }

      .dialog-header {
        padding: 16px;
      }

      .dialog-header h2 {
        font-size: 20px;
      }

      .warning-icon {
        width: 48px;
        height: 48px;
      }

      .dialog-content {
        padding: 16px;
      }

      .dialog-actions {
        flex-direction: column-reverse;
        padding: 16px;
      }

      .btn {
        width: 100%;
      }
    }
  `]
})
export class SuspendClubDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<SuspendClubDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { club: Club }
  ) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  submit(): void {
    this.dialogRef.close(true);
  }
}

// Dialog Component for Deleting Club
@Component({
  selector: 'app-delete-club-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, ReactiveFormsModule],
  template: `
    <div class="delete-dialog">
      <!-- Header with Danger Icon -->
      <div class="dialog-header danger">
        <div class="icon-wrapper">
          <svg class="danger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4"/>
            <circle cx="12" cy="16" r="1" fill="currentColor"/>
          </svg>
        </div>
        <h2>Delete Club</h2>
        <p class="dialog-subtitle">{{ data.club.name }}</p>
      </div>

      <!-- Content -->
      <div class="dialog-content">
        <div class="danger-message">
          <p class="danger-title">⚠️ This action cannot be undone</p>
          <p class="danger-description">
            Permanently deleting this club will remove:
          </p>
          <ul class="deletion-list">
            <li>All club data and settings</li>
            <li>All member accounts and profiles</li>
            <li>All court reservations</li>
            <li>All payment records</li>
            <li>All historical data</li>
          </ul>

          <!-- Confirmation Input -->
          <div class="confirmation-section">
            <p class="confirmation-label">
              Type <span class="club-name">{{ data.club.name }}</span> to confirm deletion:
            </p>
            <input
              type="text"
              class="confirmation-input"
              placeholder="Enter club name"
              (input)="onConfirmationChange($event)"
              [value]="confirmationText"
            />
            <span class="confirmation-hint">
              This is a safety measure to prevent accidental deletion.
            </span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="dialog-actions">
        <button type="button" class="btn btn-secondary" (click)="cancel()">Keep Club</button>
        <button type="button" class="btn btn-danger" (click)="submit()" [disabled]="!isConfirmed()">
          Delete Permanently
        </button>
      </div>
    </div>
  `,
  styles: [`
    .delete-dialog {
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      background: #fff;
    }

    .dialog-header {
      padding: 24px;
      border-bottom: 1px solid #e0e0e0;
      text-align: center;

      &.danger {
        background: linear-gradient(135deg, #ffe5e5 0%, #ffdbdb 100%);
      }
    }

    .icon-wrapper {
      margin-bottom: 16px;
      display: flex;
      justify-content: center;
    }

    .danger-icon {
      width: 56px;
      height: 56px;
      color: #e53e3e;
      filter: drop-shadow(0 2px 4px rgba(229, 62, 62, 0.2));
    }

    .dialog-header h2 {
      margin: 0 0 4px 0;
      font-size: 24px;
      font-weight: 600;
      color: #1a202c;
      letter-spacing: -0.5px;
    }

    .dialog-subtitle {
      margin: 0;
      font-size: 14px;
      color: #718096;
      font-weight: 500;
    }

    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .danger-message {
      background: #fff5f5;
      border: 1px solid #fed7d7;
      border-radius: 8px;
      padding: 16px;
    }

    .danger-title {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 700;
      color: #742a2a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .danger-description {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #4a5568;
    }

    .deletion-list {
      list-style: none;
      padding: 0;
      margin: 0 0 16px 0;
      background: #fff;
      border-radius: 6px;
      padding: 12px;
      font-size: 13px;
      color: #2d3748;

      li {
        margin-bottom: 6px;
        padding-left: 20px;
        position: relative;

        &:last-child {
          margin-bottom: 0;
        }

        &:before {
          content: '×';
          position: absolute;
          left: 8px;
          color: #e53e3e;
          font-weight: bold;
          font-size: 18px;
        }
      }
    }

    .confirmation-section {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      margin-top: 12px;
    }

    .confirmation-label {
      margin: 0 0 8px 0;
      font-size: 13px;
      font-weight: 600;
      color: #2d3748;
    }

    .club-name {
      background: #fff5f5;
      color: #e53e3e;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      font-family: 'Courier New', monospace;
    }

    .confirmation-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #cbd5e0;
      border-radius: 6px;
      font-size: 14px;
      font-family: 'Courier New', monospace;
      margin-bottom: 8px;
      transition: all 0.2s ease;
      background: #fff;

      &:focus {
        outline: none;
        border-color: #e53e3e;
        box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.1);
      }

      &::placeholder {
        color: #a0aec0;
      }
    }

    .confirmation-hint {
      display: block;
      font-size: 11px;
      color: #718096;
      font-style: italic;
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 20px 24px;
      border-top: 1px solid #e0e0e0;
      background: #f8f9fb;
    }

    .btn {
      padding: 11px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

      &:focus {
        outline: none;
      }
    }

    .btn-danger {
      background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%);
      color: #fff;
      box-shadow: 0 4px 6px rgba(229, 62, 62, 0.25);

      &:hover:not(:disabled) {
        box-shadow: 0 6px 12px rgba(229, 62, 62, 0.35);
        transform: translateY(-2px);
      }

      &:disabled {
        background: #cbd5e0;
        box-shadow: none;
        cursor: not-allowed;
      }
    }

    .btn-secondary {
      background: #fff;
      color: #4a5568;
      border: 1px solid #cbd5e0;

      &:hover:not(:disabled) {
        background: #f7fafc;
        border-color: #a0aec0;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    @media (max-width: 600px) {
      .delete-dialog {
        max-height: 100vh;
      }

      .dialog-header {
        padding: 16px;
      }

      .dialog-header h2 {
        font-size: 20px;
      }

      .danger-icon {
        width: 48px;
        height: 48px;
      }

      .dialog-content {
        padding: 16px;
      }

      .dialog-actions {
        flex-direction: column-reverse;
        padding: 16px;
      }

      .btn {
        width: 100%;
      }
    }
  `]
})
export class DeleteClubDialogComponent {
  confirmationText: string = '';

  constructor(
    public dialogRef: MatDialogRef<DeleteClubDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { club: Club }
  ) {}

  onConfirmationChange(event: any): void {
    this.confirmationText = event.target.value;
  }

  isConfirmed(): boolean {
    return this.confirmationText === this.data.club.name;
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  submit(): void {
    if (this.isConfirmed()) {
      this.dialogRef.close(true);
    }
  }
}

// Actions Dialog Component
@Component({
  selector: 'app-club-actions-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="actions-dialog">
      <div class="dialog-header">
        <h2>Club Actions</h2>
        <p class="club-name">{{ data.club.name }}</p>
      </div>

      <div class="actions-grid">
        <!-- Management Actions -->
        <div class="action-section">
          <h3 class="section-title">Management</h3>
          <button class="action-card" (click)="selectAction('edit')">
            <div class="action-icon edit-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <div class="action-content">
              <h4>Edit Club</h4>
              <p>Update club details and branding</p>
            </div>
          </button>

          <button class="action-card" (click)="selectAction('pricing')">
            <div class="action-icon pricing-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v12M15 9.5c0-.83-.67-1.5-1.5-1.5H10a1.5 1.5 0 0 0 0 3h4a1.5 1.5 0 0 1 0 3h-3.5c-.83 0-1.5-.67-1.5-1.5"/>
              </svg>
            </div>
            <div class="action-content">
              <h4>Court Fees</h4>
              <p>Configure pricing and hours</p>
            </div>
          </button>
        </div>

        <!-- Admin Actions -->
        <div class="action-section">
          <h3 class="section-title">Administration</h3>
          <button class="action-card" (click)="selectAction('create-admin')">
            <div class="action-icon admin-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
            </div>
            <div class="action-content">
              <h4>Create Admin</h4>
              <p>Create new admin account</p>
            </div>
          </button>

          <button class="action-card" (click)="selectAction('assign-user')">
            <div class="action-icon assign-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <path d="M20 8v6M23 11h-6"/>
              </svg>
            </div>
            <div class="action-content">
              <h4>Assign User</h4>
              <p>Grant admin access to user</p>
            </div>
          </button>
        </div>

        <!-- Status Actions -->
        <div class="action-section full-width">
          <h3 class="section-title">Club Status</h3>
          <div class="status-actions">
            <button class="action-card status-card" 
                    [class.suspend-card]="data.club.status === 'active'"
                    [class.activate-card]="data.club.status === 'suspended'"
                    (click)="selectAction('toggle-status')">
              <div class="action-icon" 
                   [class.suspend-icon]="data.club.status === 'active'"
                   [class.activate-icon]="data.club.status === 'suspended'">
                <svg *ngIf="data.club.status === 'active'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
                <svg *ngIf="data.club.status === 'suspended'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <div class="action-content">
                <h4 *ngIf="data.club.status === 'active'">Suspend Club</h4>
                <h4 *ngIf="data.club.status === 'suspended'">Activate Club</h4>
                <p *ngIf="data.club.status === 'active'">Temporarily disable access</p>
                <p *ngIf="data.club.status === 'suspended'">Restore club access</p>
              </div>
            </button>

            <button class="action-card delete-card" (click)="selectAction('delete')">
              <div class="action-icon delete-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </div>
              <div class="action-content">
                <h4>Delete Club</h4>
                <p>Permanently remove club</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="cancel-btn" (click)="cancel()">Cancel</button>
      </div>
    </div>
  `,
  styles: [`
    .actions-dialog {
      width: 100%;
      max-width: 750px;
    }

    .dialog-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 28px 32px;
      border-radius: 12px 12px 0 0;
      margin: -24px -24px 32px;
    }

    .dialog-header h2 {
      margin: 0 0 6px;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .club-name {
      margin: 0;
      font-size: 15px;
      opacity: 0.92;
      font-weight: 400;
      letter-spacing: 0.2px;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin-bottom: 28px;
      padding: 0 4px;
    }

    .action-section {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .action-section.full-width {
      grid-column: 1 / -1;
    }

    .section-title {
      font-size: 11.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      margin: 0 0 4px 4px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }

    .action-card {
      display: flex;
      align-items: center;
      gap: 18px;
      padding: 18px 20px;
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 14px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      text-align: left;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .action-card:hover {
      border-color: #667eea;
      transform: translateY(-3px);
      box-shadow: 0 12px 24px rgba(102, 126, 234, 0.18);
      background: #fafbff;
    }

    .action-card:active {
      transform: translateY(-1px);
    }

    .action-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .action-icon svg {
      width: 26px;
      height: 26px;
      stroke-width: 2.5;
    }

    .edit-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .pricing-icon {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
    }

    .admin-icon {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: white;
    }

    .assign-icon {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      color: white;
    }

    .suspend-icon {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      color: white;
    }

    .activate-icon {
      background: linear-gradient(135deg, #30cfd0 0%, #330867 100%);
      color: white;
    }

    .delete-icon {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
      color: white;
    }

    .action-content {
      flex: 1;
      padding: 2px 0;
    }

    .action-content h4 {
      margin: 0 0 5px;
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.3px;
    }

    .action-content p {
      margin: 0;
      font-size: 13.5px;
      color: #64748b;
      line-height: 1.5;
      font-weight: 400;
    }

    .status-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .status-card:hover {
      transform: translateY(-3px);
    }

    .suspend-card:hover {
      border-color: #f59e0b;
      box-shadow: 0 12px 24px rgba(245, 158, 11, 0.18);
      background: #fffbf5;
    }

    .activate-card:hover {
      border-color: #10b981;
      box-shadow: 0 12px 24px rgba(16, 185, 129, 0.18);
      background: #f0fdf9;
    }

    .delete-card:hover {
      border-color: #ef4444;
      box-shadow: 0 12px 24px rgba(239, 68, 68, 0.18);
      background: #fef5f5;
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      margin-top: 8px;
    }

    .cancel-btn {
      padding: 12px 32px;
      border: 2px solid #cbd5e1;
      background: white;
      color: #475569;
      font-size: 15px;
      font-weight: 600;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      letter-spacing: 0.3px;
    }

    .cancel-btn:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
    }

    .cancel-btn:active {
      transform: translateY(0);
    }

    @media (max-width: 768px) {
      .actions-grid {
        grid-template-columns: 1fr;
        gap: 20px;
        padding: 0;
      }

      .status-actions {
        grid-template-columns: 1fr;
      }

      .dialog-header {
        padding: 24px;
        margin: -24px -24px 24px;
      }

      .dialog-header h2 {
        font-size: 22px;
      }

      .action-card {
        padding: 16px 18px;
      }

      .action-icon {
        width: 52px;
        height: 52px;
      }

      .action-icon svg {
        width: 24px;
        height: 24px;
      }

      .action-content h4 {
        font-size: 16px;
      }

      .action-content p {
        font-size: 13px;
      }
    }
  `]
})
export class ClubActionsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ClubActionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { club: Club }
  ) {}

  selectAction(action: string): void {
    this.dialogRef.close(action);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
