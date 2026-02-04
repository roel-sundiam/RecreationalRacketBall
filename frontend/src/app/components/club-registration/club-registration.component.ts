import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-club-registration',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatStepperModule,
    MatSelectModule
  ],
  templateUrl: './club-registration.component.html',
  styleUrls: ['./club-registration.component.scss']
})
export class ClubRegistrationComponent implements OnInit {
  clubInfoForm!: FormGroup;
  addressForm!: FormGroup;
  loading = false;

  countries = [
    'Philippines',
    'United States',
    'Canada',
    'United Kingdom',
    'Australia',
    'Singapore',
    'Malaysia',
    'Thailand',
    'Other'
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForms();
  }

  initializeForms(): void {
    // Club information form
    this.clubInfoForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      slug: ['', [Validators.pattern(/^[a-z0-9-]+$/)]],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactPhone: ['', [Validators.required, Validators.pattern(/^[\+]?[\d\s\-\(\)]+$/)]],
      primaryColor: ['#1976d2', [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
      accentColor: ['#ff4081', [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]]
    });

    // Address form
    this.addressForm = this.fb.group({
      street: ['', [Validators.required]],
      city: ['', [Validators.required]],
      province: ['', [Validators.required]],
      postalCode: ['', [Validators.required]],
      country: ['Philippines', [Validators.required]],
      latitude: ['', [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: ['', [Validators.required, Validators.min(-180), Validators.max(180)]]
    });

    // Auto-generate slug from club name
    this.clubInfoForm.get('name')?.valueChanges.subscribe(name => {
      if (name && !this.clubInfoForm.get('slug')?.dirty) {
        const slug = this.generateSlug(name);
        this.clubInfoForm.patchValue({ slug }, { emitEvent: false });
      }
    });
  }

  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async registerClub(): Promise<void> {
    if (this.clubInfoForm.invalid || this.addressForm.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.loading = true;

    const clubData = {
      ...this.clubInfoForm.value,
      address: {
        street: this.addressForm.value.street,
        city: this.addressForm.value.city,
        province: this.addressForm.value.province,
        postalCode: this.addressForm.value.postalCode,
        country: this.addressForm.value.country
      },
      coordinates: {
        latitude: this.addressForm.value.latitude,
        longitude: this.addressForm.value.longitude
      }
    };

    try {
      const response: any = await this.http.post(
        `${environment.apiUrl}/clubs/request`,
        clubData
      ).toPromise();

      if (response.success) {
        this.snackBar.open(
          'Club registration submitted! Awaiting admin approval.',
          'Close',
          {
            duration: 5000,
            panelClass: ['success-snackbar']
          }
        );

        // Redirect to dashboard instead of club-selector
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        this.snackBar.open(response.message || 'Registration failed', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    } catch (error: any) {
      console.error('Club registration error:', error);
      const message = error.error?.message || 'Failed to register club. Please try again.';
      this.snackBar.open(message, 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.loading = false;
    }
  }

  cancel(): void {
    this.router.navigate(['/club-selector']);
  }

  // Helper method to get current location (browser geolocation)
  getCurrentLocation(): void {
    if (navigator.geolocation) {
      this.loading = true;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.addressForm.patchValue({
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          });
          this.loading = false;
          this.snackBar.open('Location detected!', 'Close', { duration: 2000 });
        },
        (error) => {
          this.loading = false;
          this.snackBar.open('Failed to get location. Please enter manually.', 'Close', {
            duration: 3000
          });
        }
      );
    } else {
      this.snackBar.open('Geolocation is not supported by this browser.', 'Close', {
        duration: 3000
      });
    }
  }
}
