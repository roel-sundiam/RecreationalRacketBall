# Native HTML Forms - Implementation Guide

## Overview

The Club Settings page has been refactored to use **native HTML form elements** instead of Angular Material components. This provides a modern, professional, and mobile-friendly design that serves as a template for all future forms in the application.

## Benefits of Native HTML Forms

✅ **Faster Performance**: No heavy Material Design library overhead
✅ **Better Customization**: Full control over styling and behavior
✅ **Smaller Bundle Size**: Reduced JavaScript and CSS payload
✅ **Modern Design**: Custom styling with contemporary UI patterns
✅ **Mobile First**: Optimized for touch devices and small screens
✅ **Accessibility**: Native HTML elements with proper ARIA labels
✅ **Reusable**: Shared styles that work across all forms

## File Structure

### Shared Form Styles
**Location**: `frontend/src/styles/forms.scss`

This file contains all reusable form styling including:
- Form containers and layouts
- Input fields, textareas, selects
- Buttons (primary, secondary, danger)
- Form sections and groups
- Error states and validation messages
- Loading states
- Alert messages
- Preview boxes
- Responsive breakpoints

### Global Import
The forms.scss is imported in `frontend/src/styles.scss`:
```scss
@use 'styles/forms.scss';
```

## Component Structure

### TypeScript Component

**Key Features:**
- Minimal imports (CommonModule, ReactiveFormsModule only)
- Error handling with success/error messages
- Helper methods for validation
- No Material dependencies

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-club-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './club-settings.component.html',
  styleUrls: ['./club-settings.component.scss']
})
export class ClubSettingsComponent implements OnInit {
  form: FormGroup;
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  // Helper methods
  hasError(fieldName: string): boolean { }
  getErrorMessage(fieldName: string): string { }
}
```

### HTML Template Structure

```html
<div class="form-container">
  <!-- Page Header -->
  <div class="page-header">
    <button class="back-btn" (click)="goBack()">←</button>
    <h1>
      <span class="icon">⚙</span>
      Page Title
    </h1>
  </div>

  <!-- Alert Messages -->
  <div class="alert alert-success" *ngIf="successMessage">
    <span class="icon">✓</span>
    <span>{{ successMessage }}</span>
  </div>

  <div class="alert alert-error" *ngIf="errorMessage">
    <span class="icon">⚠</span>
    <span>{{ errorMessage }}</span>
  </div>

  <!-- Form Card -->
  <div class="form-card">
    <div class="card-header">
      <h2>Form Title</h2>
      <p>Form description</p>
    </div>

    <div class="card-body">
      <form [formGroup]="form">
        <!-- Form sections here -->
      </form>
    </div>

    <div class="card-footer">
      <button class="btn btn-secondary" (click)="cancel()">
        <span class="icon">✕</span>
        Cancel
      </button>
      <button class="btn btn-primary" (click)="save()">
        <span class="icon">💾</span>
        Save
      </button>
    </div>
  </div>
</div>
```

## Form Components

### Form Section
Groups related fields together:
```html
<div class="form-section">
  <div class="section-header">
    <span class="icon">🕐</span>
    <h3>Section Title</h3>
  </div>
  <p class="section-description">
    Section description
  </p>

  <!-- Fields go here -->
</div>
```

### Form Group (Single Field)
```html
<div class="form-group">
  <label for="fieldName">
    Field Label
    <span class="required">*</span>
  </label>
  <input
    type="text"
    id="fieldName"
    formControlName="fieldName"
    [class.error]="hasError('fieldName')"
    placeholder="Placeholder text"
  />
  <span class="hint">Helpful hint text</span>
  <span class="error-message" *ngIf="hasError('fieldName')">
    {{ getErrorMessage('fieldName') }}
  </span>
</div>
```

### Form Row (Multiple Fields Side-by-Side)
```html
<div class="form-row">
  <div class="form-group">
    <!-- First field -->
  </div>
  <div class="form-group">
    <!-- Second field -->
  </div>
</div>
```

### Number Input
```html
<input
  type="number"
  id="fieldName"
  formControlName="fieldName"
  min="0"
  max="100"
  [class.error]="hasError('fieldName')"
  placeholder="0"
/>
```

### Select Dropdown
```html
<select
  id="fieldName"
  formControlName="fieldName"
  [class.error]="hasError('fieldName')"
>
  <option value="">Select an option</option>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
</select>
```

### Textarea
```html
<textarea
  id="fieldName"
  formControlName="fieldName"
  [class.error]="hasError('fieldName')"
  placeholder="Enter text..."
  rows="5"
></textarea>
```

## Buttons

### Primary Button
```html
<button type="button" class="btn btn-primary" (click)="action()">
  <span class="icon">💾</span>
  Button Text
</button>
```

### Secondary Button
```html
<button type="button" class="btn btn-secondary" (click)="action()">
  <span class="icon">✕</span>
  Button Text
</button>
```

### Danger Button
```html
<button type="button" class="btn btn-danger" (click)="action()">
  <span class="icon">🗑</span>
  Delete
</button>
```

### Disabled State
```html
<button class="btn btn-primary" [disabled]="form.invalid || saving">
  <span *ngIf="!saving">Save</span>
  <span *ngIf="saving">Saving...</span>
</button>
```

## Alert Messages

### Success Alert
```html
<div class="alert alert-success" *ngIf="successMessage">
  <span class="icon">✓</span>
  <span>{{ successMessage }}</span>
</div>
```

### Error Alert
```html
<div class="alert alert-error" *ngIf="errorMessage">
  <span class="icon">⚠</span>
  <span>{{ errorMessage }}</span>
</div>
```

### Info Alert
```html
<div class="alert alert-info">
  <span class="icon">ℹ</span>
  <span>Information message</span>
</div>
```

### Warning Alert
```html
<div class="alert alert-warning">
  <span class="icon">⚠</span>
  <span>Warning message</span>
</div>
```

## Preview Box

For showing real-time previews of form data:
```html
<div class="preview-box">
  <h4>
    <span class="icon">👁</span>
    Preview
  </h4>

  <div class="preview-item">
    <strong>Label:</strong>
    <span>{{ value }}</span>
  </div>
</div>
```

## Loading State

```html
<div class="loading-container" *ngIf="loading">
  <div class="spinner"></div>
  <p>Loading...</p>
</div>
```

## Validation Helper Methods

Add these helper methods to your component:

```typescript
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
  if (field.hasError('email')) {
    return 'Please enter a valid email address';
  }
  if (field.hasError('pattern')) {
    return 'Invalid format';
  }
  return '';
}
```

## Mobile Responsiveness

All form elements are automatically responsive:
- **Desktop (>768px)**: Side-by-side fields in rows
- **Mobile (≤768px)**: Stacked fields, full-width buttons
- **Touch-friendly**: Minimum 44px touch targets
- **Large text**: 15px+ base font size

## Accessibility Features

✅ Proper label associations with `for` attribute
✅ ARIA labels on buttons
✅ Required field indicators
✅ Clear error messages
✅ Keyboard navigation support
✅ Focus states on all interactive elements
✅ High contrast colors

## Icon Usage

Use emoji icons for visual interest:
- ⚙ Settings
- 🕐 Time/Hours
- 💰 Money/Pricing
- 👁 Preview/View
- 💾 Save
- ✕ Cancel/Close
- ✓ Success
- ⚠ Warning/Error
- ℹ Information
- 🗑 Delete

## Creating New Forms

### Step 1: Create Component Files
```bash
# TypeScript component
touch component-name.component.ts

# HTML template
touch component-name.component.html

# SCSS styles (usually minimal)
touch component-name.component.scss
```

### Step 2: Component Setup
```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-component-name',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './component-name.component.html',
  styleUrls: ['./component-name.component.scss']
})
export class ComponentNameComponent implements OnInit {
  form: FormGroup;
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.form = this.fb.group({
      // Define form controls
    });
  }

  ngOnInit(): void {
    // Load initial data
  }

  // Add validation helpers
  hasError(fieldName: string): boolean { ... }
  getErrorMessage(fieldName: string): string { ... }
}
```

### Step 3: HTML Template
Copy the structure from `club-settings.component.html` and customize the fields.

### Step 4: SCSS (Minimal)
```scss
// Component-specific overrides only
// Most styles are imported from global forms.scss
```

## Best Practices

1. **Keep SCSS Minimal**: Most styling is handled by the shared forms.scss
2. **Use Semantic HTML**: Native elements with proper accessibility
3. **Validate Early**: Show validation errors only after user interaction
4. **Clear Feedback**: Use success/error messages prominently
5. **Loading States**: Show spinners during async operations
6. **Disabled States**: Disable buttons during submission
7. **Mobile First**: Test on small screens first
8. **Consistent Icons**: Use emoji or icon fonts consistently
9. **Helper Text**: Provide hints for complex fields
10. **Preview Features**: Show real-time previews when helpful

## Examples

### Complete Example: Club Settings
See: `frontend/src/app/pages/admin/club-settings/`

This serves as the reference implementation for all future forms.

---

**Last Updated**: 2026-02-03
**Status**: ✅ Production Ready
