import { Component, OnInit, ViewEncapsulation } from '@angular/core';
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

@Component({
  selector: 'app-club-admin-registration',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
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
  templateUrl: './club-admin-registration.component.html',
  styleUrls: ['./club-admin-registration-custom.scss']
})
export class ClubAdminRegistrationComponent implements OnInit {
  userForm!: FormGroup;
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

  sports = [
    'Tennis',
    'Badminton',
    'Squash',
    'Racquetball',
    'Table Tennis',
    'Pickleball'
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForms();
  }

  initializeForms(): void {
    // User account form
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      gender: ['', [Validators.required]],
      contactPhone: ['', [Validators.pattern(/^[\+]?[\d\s\-\(\)]+$/)]]
    }, { validators: this.passwordMatchValidator });

    // Club information form
    this.clubInfoForm = this.fb.group({
      clubName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      slug: ['', [Validators.pattern(/^[a-z0-9-]+$/)]],
      sport: ['', [Validators.required]],
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
    this.clubInfoForm.get('clubName')?.valueChanges.subscribe(name => {
      if (name && !this.clubInfoForm.get('slug')?.dirty) {
        const slug = this.generateSlug(name);
        this.clubInfoForm.patchValue({ slug }, { emitEvent: false });
      }
    });

    // Auto-fill club contact email from user email
    this.userForm.get('email')?.valueChanges.subscribe(email => {
      if (email && !this.clubInfoForm.get('contactEmail')?.dirty) {
        this.clubInfoForm.patchValue({ contactEmail: email }, { emitEvent: false });
      }
    });

    // Auto-fill club contact phone from user phone
    this.userForm.get('contactPhone')?.valueChanges.subscribe(phone => {
      if (phone && !this.clubInfoForm.get('contactPhone')?.dirty) {
        this.clubInfoForm.patchValue({ contactPhone: phone }, { emitEvent: false });
      }
    });
  }

  passwordMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async register(): Promise<void> {
    if (this.userForm.invalid || this.clubInfoForm.invalid || this.addressForm.invalid) {
      this.snackBar.open('Please fill in all required fields correctly', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    if (this.userForm.hasError('passwordMismatch')) {
      this.snackBar.open('Passwords do not match', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.loading = true;

    const registrationData = {
      // User data
      username: this.userForm.value.username,
      email: this.userForm.value.email,
      password: this.userForm.value.password,
      fullName: this.userForm.value.fullName,
      gender: this.userForm.value.gender,
      userContactPhone: this.userForm.value.contactPhone,
      // Club data
      clubName: this.clubInfoForm.value.clubName,
      slug: this.clubInfoForm.value.slug,
      sport: this.clubInfoForm.value.sport,
      contactEmail: this.clubInfoForm.value.contactEmail,
      clubContactPhone: this.clubInfoForm.value.contactPhone || this.userForm.value.contactPhone,
      primaryColor: this.clubInfoForm.value.primaryColor,
      accentColor: this.clubInfoForm.value.accentColor,
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
        `${environment.apiUrl}/clubs/register-with-admin`,
        registrationData
      ).toPromise();

      if (response.success) {
        this.snackBar.open(
          'Registration submitted! A platform administrator will review your club and account.',
          'Close',
          {
            duration: 5000,
            panelClass: ['success-snackbar']
          }
        );

        // Redirect to login page
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      } else {
        this.snackBar.open(response.message || 'Registration failed', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const message = error.error?.error || error.error?.message || 'Failed to register. Please try again.';
      this.snackBar.open(message, 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.loading = false;
    }
  }

  cancel(): void {
    this.router.navigate(['/login']);
  }

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
