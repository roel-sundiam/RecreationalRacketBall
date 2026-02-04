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
    ReactiveFormsModule
  ],
  templateUrl: './club-management.component.html',
  styleUrls: ['./club-management.component.scss']
})
export class ClubManagementComponent implements OnInit {
  clubs: Club[] = [];
  users: User[] = [];
  loading = false;
  displayedColumns: string[] = ['name', 'status', 'tier', 'contact', 'actions'];

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
        `${environment.apiUrl}/members`
      ).toPromise();

      if (response.success) {
        this.users = response.data;
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  openAddAdminDialog(club: Club): void {
    const dialogRef = this.dialog.open(AddAdminDialogComponent, {
      width: '500px',
      data: { club, users: this.users }
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
}

// Dialog Component for Adding Admin
@Component({
  selector: 'app-add-admin-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    ReactiveFormsModule
  ],
  template: `
    <h2 mat-dialog-title>Add Club Admin</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 16px;">
          <mat-label>Select User</mat-label>
          <mat-select formControlName="userId" required>
            <mat-option *ngFor="let user of users" [value]="user._id">
              {{ user.fullName }} ({{ user.username }})
            </mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('userId')?.hasError('required')">
            Please select a user
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width: 100%;">
          <mat-label>Role</mat-label>
          <mat-select formControlName="role" required>
            <mat-option value="admin">Admin</mat-option>
            <mat-option value="treasurer">Treasurer</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="submit()" [disabled]="form.invalid">
        Add Admin
      </button>
    </mat-dialog-actions>
  `
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
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    ReactiveFormsModule
  ],
  template: `
    <h2 mat-dialog-title>Create New Club Admin</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 16px;">
          <mat-label>Username</mat-label>
          <input matInput formControlName="username" required>
          <mat-error *ngIf="form.get('username')?.hasError('required')">
            Username is required
          </mat-error>
          <mat-error *ngIf="form.get('username')?.hasError('minlength')">
            Username must be at least 3 characters
          </mat-error>
          <mat-error *ngIf="form.get('username')?.hasError('pattern')">
            Username can only contain letters, numbers, and underscores
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 16px;">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" required>
          <mat-error *ngIf="form.get('email')?.hasError('required')">
            Email is required
          </mat-error>
          <mat-error *ngIf="form.get('email')?.hasError('email')">
            Please enter a valid email
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 16px;">
          <mat-label>Full Name</mat-label>
          <input matInput formControlName="fullName" required>
          <mat-error *ngIf="form.get('fullName')?.hasError('required')">
            Full name is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 16px;">
          <mat-label>Password</mat-label>
          <input matInput type="password" formControlName="password" required>
          <mat-error *ngIf="form.get('password')?.hasError('required')">
            Password is required
          </mat-error>
          <mat-error *ngIf="form.get('password')?.hasError('minlength')">
            Password must be at least 6 characters
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 16px;">
          <mat-label>Gender</mat-label>
          <mat-select formControlName="gender" required>
            <mat-option value="male">Male</mat-option>
            <mat-option value="female">Female</mat-option>
            <mat-option value="other">Other</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('gender')?.hasError('required')">
            Gender is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width: 100%;">
          <mat-label>Role</mat-label>
          <mat-select formControlName="role" required>
            <mat-option value="admin">Admin</mat-option>
            <mat-option value="treasurer">Treasurer</mat-option>
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="submit()" [disabled]="form.invalid">
        Create Admin
      </button>
    </mat-dialog-actions>
  `
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
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>settings</mat-icon>
      Court Settings - {{ data.club.name }}
    </h2>
    <mat-dialog-content>
      <p class="dialog-description">
        Configure operating hours and reservation fees for this club. All amounts are in Philippine Pesos (₱).
      </p>

      <form [formGroup]="form">
        <h3>Operating Hours</h3>
        <div style="display: flex; gap: 16px; margin-bottom: 16px;">
          <mat-form-field appearance="outline" style="flex: 1;">
            <mat-label>Opening Hour</mat-label>
            <input matInput type="number" formControlName="operatingStart" min="0" max="23" required>
            <mat-hint>Court opens at (0-23). Default: 5 AM</mat-hint>
            <mat-error *ngIf="form.get('operatingStart')?.hasError('required')">
              Opening hour is required
            </mat-error>
            <mat-error *ngIf="form.get('operatingStart')?.hasError('min') || form.get('operatingStart')?.hasError('max')">
              Must be between 0 and 23
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" style="flex: 1;">
            <mat-label>Closing Hour</mat-label>
            <input matInput type="number" formControlName="operatingEnd" min="0" max="23" required>
            <mat-hint>Court closes at (0-23). Default: 10 PM (22)</mat-hint>
            <mat-error *ngIf="form.get('operatingEnd')?.hasError('required')">
              Closing hour is required
            </mat-error>
            <mat-error *ngIf="form.get('operatingEnd')?.hasError('min') || form.get('operatingEnd')?.hasError('max')">
              Must be between 0 and 23
            </mat-error>
          </mat-form-field>
        </div>

        <h3>Base Fees</h3>
        <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 16px;">
          <mat-label>Peak Hour Fee (₱)</mat-label>
          <input matInput type="number" formControlName="peakHourFee" min="0" required>
          <mat-hint>Base fee for peak hours (e.g., 6PM-9PM). Default: ₱150</mat-hint>
          <mat-error *ngIf="form.get('peakHourFee')?.hasError('required')">
            Peak hour fee is required
          </mat-error>
          <mat-error *ngIf="form.get('peakHourFee')?.hasError('min')">
            Must be at least 0
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 16px;">
          <mat-label>Off-Peak Hour Fee (₱)</mat-label>
          <input matInput type="number" formControlName="offPeakHourFee" min="0" required>
          <mat-hint>Base fee for off-peak hours. Default: ₱100</mat-hint>
          <mat-error *ngIf="form.get('offPeakHourFee')?.hasError('required')">
            Off-peak hour fee is required
          </mat-error>
          <mat-error *ngIf="form.get('offPeakHourFee')?.hasError('min')">
            Must be at least 0
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 16px;">
          <mat-label>Guest Fee (₱)</mat-label>
          <input matInput type="number" formControlName="guestFee" min="0" required>
          <mat-hint>Additional fee per guest. Default: ₱70</mat-hint>
          <mat-error *ngIf="form.get('guestFee')?.hasError('required')">
            Guest fee is required
          </mat-error>
          <mat-error *ngIf="form.get('guestFee')?.hasError('min')">
            Must be at least 0
          </mat-error>
        </mat-form-field>

        <h3>Peak Hours</h3>
        <mat-form-field appearance="outline" style="width: 100%;">
          <mat-label>Peak Hours (comma-separated)</mat-label>
          <input matInput formControlName="peakHoursInput" placeholder="5, 18, 19, 20, 21">
          <mat-hint>Enter hours in 24-hour format (0-23), separated by commas. Example: 5,18,19,20,21</mat-hint>
          <mat-error *ngIf="form.get('peakHoursInput')?.hasError('pattern')">
            Please enter valid hours (0-23) separated by commas
          </mat-error>
        </mat-form-field>

        <div class="pricing-preview" style="margin-top: 24px; padding: 16px; background: #f5f5f5; border-radius: 4px;">
          <h4>Preview</h4>
          <p><strong>Operating Hours:</strong> {{ formatHour(form.value.operatingStart) }} - {{ formatHour(form.value.operatingEnd) }}</p>
          <p><strong>Peak Hours:</strong> {{ formatPeakHours() }}</p>
          <p><strong>Example Calculation (1 hour, 2 members, 1 guest):</strong></p>
          <ul style="list-style: none; padding-left: 0;">
            <li>Peak: ₱{{ form.value.peakHourFee }} + (1 × ₱{{ form.value.guestFee }}) = ₱{{ form.value.peakHourFee + form.value.guestFee }}</li>
            <li>Off-Peak: ₱{{ form.value.offPeakHourFee }} + (1 × ₱{{ form.value.guestFee }}) = ₱{{ form.value.offPeakHourFee + form.value.guestFee }}</li>
          </ul>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="submit()" [disabled]="form.invalid">
        <mat-icon>save</mat-icon>
        Save Settings
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-description {
      color: rgba(0,0,0,0.6);
      margin-bottom: 24px;
    }
    h3 {
      margin-top: 16px;
      margin-bottom: 12px;
      color: #1976d2;
      font-size: 16px;
    }
    h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
    }
    .pricing-preview p {
      margin: 8px 0;
      font-size: 14px;
    }
    .pricing-preview ul {
      margin: 8px 0;
    }
    .pricing-preview li {
      margin: 4px 0;
      font-size: 13px;
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
