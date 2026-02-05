import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-club-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './club-settings.component.html',
  styleUrls: ['./club-settings.component.scss'],
})
export class ClubSettingsComponent implements OnInit {
  form: FormGroup;
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';
  hours: { value: number; label: string }[] = [];
  clubLogoUrl: string | null = null;
  uploadingLogo = false;
  selectedLogoFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
  ) {
    // Generate hours array (0-23)
    this.hours = Array.from({ length: 24 }, (_, i) => ({
      value: i,
      label: this.formatHour(i),
    }));

    this.form = this.fb.group({
      operatingStart: [5, [Validators.required]],
      operatingEnd: [22, [Validators.required]],
      pricingModel: ['variable', [Validators.required]],
      // Variable Pricing (peak/off-peak)
      peakHourFee: [150, [Validators.required, Validators.min(0)]],
      offPeakHourFee: [100, [Validators.required, Validators.min(0)]],
      peakHoursInput: ['5, 18, 19, 20, 21', [Validators.pattern(/^[\d,\s]+$/)]],
      // Fixed Hourly Rate
      fixedHourlyFee: [125, [Validators.required, Validators.min(0)]],
      // Fixed Daily Rate
      fixedDailyFee: [500, [Validators.required, Validators.min(0)]],
      // Guest fee (applies to all models)
      guestFee: [70, [Validators.required, Validators.min(0)]],
      // Membership Fee
      membershipFeeAnnual: [1000, [Validators.required, Validators.min(0)]],
      membershipFeeCurrency: [
        'PHP',
        [Validators.required, Validators.minLength(3), Validators.maxLength(3)],
      ],
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadSettings();
  }

  async loadSettings(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      // Build params with clubId if available
      let params = new HttpParams();
      const selectedClubId = this.authService.selectedClub?.clubId;

      console.log('🏢 Club Settings - Loading settings');
      console.log('  Selected Club:', this.authService.selectedClub);
      console.log('  Selected Club ID:', selectedClubId);
      console.log('  User:', this.authService.currentUser);
      console.log('  Is Superadmin:', this.authService.currentUser?.role === 'superadmin');

      if (!selectedClubId) {
        const isSuperadmin = this.authService.currentUser?.role === 'superadmin';
        if (isSuperadmin) {
          // Superadmin without a selected club - need to select one first
          this.errorMessage =
            'Please select a club from the top menu before managing club settings.';
          this.loading = false;
          return;
        } else {
          this.errorMessage = 'No club selected. Please select a club to manage settings.';
          this.loading = false;
          return;
        }
      }

      params = params.set('clubId', selectedClubId);
      console.log('  Adding clubId to query params:', selectedClubId);

      const response: any = await this.http
        .get(`${environment.apiUrl}/clubs/current/settings`, { params })
        .toPromise();

      if (response.success && response.data) {
        const { pricing, operatingHours, membershipFee, logo } = response.data;
        this.clubLogoUrl = logo || null;
        this.form.patchValue({
          operatingStart: operatingHours?.start || 5,
          operatingEnd: operatingHours?.end || 22,
          pricingModel: pricing?.pricingModel || 'variable',
          peakHourFee: pricing?.peakHourFee || 150,
          offPeakHourFee: pricing?.offPeakHourFee || 100,
          peakHoursInput: (pricing?.peakHours || [5, 18, 19, 20, 21]).join(', '),
          fixedHourlyFee: pricing?.fixedHourlyFee || 125,
          fixedDailyFee: pricing?.fixedDailyFee || 500,
          guestFee: pricing?.guestFee || 70,
          membershipFeeAnnual: membershipFee?.annual || 1000,
          membershipFeeCurrency: membershipFee?.currency || 'PHP',
        });
      }
    } catch (error: any) {
      console.error('Error loading club settings:', error);
      this.errorMessage = error.error?.error || 'Failed to load club settings. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async saveSettings(): Promise<void> {
    if (this.form.invalid) {
      this.errorMessage = 'Please fix the errors in the form before saving.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const peakHours = this.form.value.peakHoursInput
        .split(',')
        .map((h: string) => parseInt(h.trim()))
        .filter((h: number) => !isNaN(h) && h >= 0 && h <= 23);

      const settingsData = {
        operatingHours: {
          start: parseInt(this.form.value.operatingStart, 10),
          end: parseInt(this.form.value.operatingEnd, 10),
        },
        pricing: {
          pricingModel: this.form.value.pricingModel,
          peakHourFee: this.form.value.peakHourFee,
          offPeakHourFee: this.form.value.offPeakHourFee,
          fixedHourlyFee: this.form.value.fixedHourlyFee,
          fixedDailyFee: this.form.value.fixedDailyFee,
          guestFee: this.form.value.guestFee,
          peakHours: peakHours,
        },
        membershipFee: {
          annual: this.form.value.membershipFeeAnnual,
          currency: this.form.value.membershipFeeCurrency.toUpperCase(),
        },
      };

      // Build params with clubId if available
      let params = new HttpParams();
      const selectedClubId = this.authService.selectedClub?.clubId;
      if (selectedClubId) {
        params = params.set('clubId', selectedClubId);
      }

      const response: any = await this.http
        .patch(`${environment.apiUrl}/clubs/current/settings`, settingsData, { params })
        .toPromise();

      if (response.success) {
        this.successMessage = 'Club settings updated successfully!';
        // Scroll to top to show success message
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Clear success message after 5 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      }
    } catch (error: any) {
      console.error('Error updating settings:', error);
      this.errorMessage = error.error?.error || 'Failed to update club settings. Please try again.';
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      this.saving = false;
    }
  }

  formatHour(hour: number): string {
    if (isNaN(hour) || hour === null || hour === undefined) return '';
    return hour === 0
      ? '12 AM'
      : hour < 12
        ? `${hour} AM`
        : hour === 12
          ? '12 PM'
          : `${hour - 12} PM`;
  }

  formatPeakHours(): string {
    const input = this.form.value.peakHoursInput || '';
    const hours = input
      .split(',')
      .map((h: string) => h.trim())
      .filter((h: string) => h);
    return hours
      .map((h: string) => {
        const hour = parseInt(h);
        if (isNaN(hour)) return h;
        return this.formatHour(hour);
      })
      .join(', ');
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  // Helper methods for error checking
  hasError(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field) return '';

    if (field.hasError('required')) {
      return 'This field is required';
    }
    if (field.hasError('min')) {
      return `Minimum value is ${field.errors?.['min'].min}`;
    }
    if (field.hasError('max')) {
      return `Maximum value is ${field.errors?.['max'].max}`;
    }
    if (field.hasError('pattern')) {
      return 'Please enter valid hours (0-23) separated by commas';
    }
    return '';
  }

  get pricingModel(): string {
    return this.form.get('pricingModel')?.value || 'variable';
  }

  isVariablePricing(): boolean {
    return this.pricingModel === 'variable';
  }

  isFixedHourly(): boolean {
    return this.pricingModel === 'fixed-hourly';
  }

  isFixedDaily(): boolean {
    return this.pricingModel === 'fixed-daily';
  }

  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Please select an image file';
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'Image size must be less than 5MB';
        return;
      }

      this.selectedLogoFile = file;

      // Preview the image
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.clubLogoUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async uploadLogo(): Promise<void> {
    if (!this.selectedLogoFile) {
      return;
    }

    const selectedClubId = this.authService.selectedClub?.clubId;
    if (!selectedClubId) {
      this.errorMessage = 'Please select a club first';
      return;
    }

    this.uploadingLogo = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const formData = new FormData();
      formData.append('logo', this.selectedLogoFile);

      const response: any = await this.http
        .post(`${environment.apiUrl}/clubs/${selectedClubId}/logo`, formData)
        .toPromise();

      if (response.success) {
        console.log('Logo upload response:', response);
        this.clubLogoUrl = response.data.logo;
        this.successMessage = 'Club logo uploaded successfully!';
        this.selectedLogoFile = null;

        // Reload the selected club to update the toolbar
        await this.authService.reloadSelectedClub();
        console.log('Selected club after reload:', this.authService.selectedClub);

        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      this.errorMessage = error.error?.error || 'Failed to upload logo. Please try again.';
    } finally {
      this.uploadingLogo = false;
    }
  }

  removeLogo(): void {
    this.selectedLogoFile = null;
    this.clubLogoUrl = null;
  }
}
