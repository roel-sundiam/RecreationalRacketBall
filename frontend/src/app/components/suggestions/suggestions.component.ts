import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { DialogService } from '../../services/dialog.service';

interface Suggestion {
  _id: string;
  userId: string;
  user?: {
    fullName: string;
    username: string;
  };
  type: 'suggestion' | 'complaint';
  category: 'facility' | 'service' | 'booking' | 'payments' | 'general' | 'staff' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  status: 'open' | 'in_review' | 'in_progress' | 'resolved' | 'closed';
  isAnonymous: boolean;
  adminResponse?: {
    responderId: string;
    responder?: {
      fullName: string;
      username: string;
    };
    response: string;
    responseDate: Date;
    actionTaken?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-suggestions',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    MatSnackBarModule
  ],
  template: `
    <div class="suggestions-container">
      <!-- Modern Header -->
      <div class="page-header">
        <button type="button" class="back-button" (click)="goBack()">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <div class="header-content">
          <h1>Feedback & Suggestions</h1>
          <p>Help us improve by sharing your thoughts and experiences</p>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <button type="button" 
                class="tab-button" 
                [class.active]="selectedTab === 0"
                (click)="selectedTab = 0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
          Submit Feedback
        </button>
        <button type="button" 
                class="tab-button" 
                [class.active]="selectedTab === 1"
                (click)="selectedTab = 1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
          </svg>
          My Feedback
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content-wrapper">
        <!-- Submit Feedback Tab -->
        <div class="tab-pane" *ngIf="selectedTab === 0">
          <div class="form-card">
            <div class="card-header">
              <h2>Share Your Feedback</h2>
              <p>Your input helps us provide better service</p>
            </div>

            <form [formGroup]="suggestionForm" (ngSubmit)="submitSuggestion()">
              <!-- Feedback Type -->
              <div class="form-group">
                <label for="type" class="form-label required">Feedback Type</label>
                <div class="select-wrapper">
                  <select id="type" 
                          class="form-control" 
                          formControlName="type"
                          [class.error]="suggestionForm.get('type')?.invalid && suggestionForm.get('type')?.touched">
                    <option value="" disabled selected>Select feedback type</option>
                    <option value="suggestion">💡 Suggestion - Ideas for improvement</option>
                    <option value="complaint">⚠️ Complaint - Report an issue</option>
                  </select>
                  <svg class="select-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </div>
                <div class="error-message" *ngIf="suggestionForm.get('type')?.hasError('required') && suggestionForm.get('type')?.touched">
                  Please select feedback type
                </div>
              </div>

              <!-- Category -->
              <div class="form-group">
                <label for="category" class="form-label required">Category</label>
                <div class="select-wrapper">
                  <select id="category" 
                          class="form-control" 
                          formControlName="category"
                          [class.error]="suggestionForm.get('category')?.invalid && suggestionForm.get('category')?.touched">
                    <option value="" disabled selected>Select a category</option>
                    <option value="facility">🏢 Facility & Courts</option>
                    <option value="service">🛎️ Customer Service</option>
                    <option value="booking">📅 Booking System</option>
                    <option value="payments">💳 Payments & Fees</option>
                    <option value="staff">👥 Staff & Personnel</option>
                    <option value="maintenance">🔧 Maintenance & Repairs</option>
                    <option value="general">💬 General Feedback</option>
                  </select>
                  <svg class="select-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </div>
                <div class="error-message" *ngIf="suggestionForm.get('category')?.hasError('required') && suggestionForm.get('category')?.touched">
                  Please select a category
                </div>
              </div>

              <!-- Priority (only for suggestions) -->
              <div class="form-group" *ngIf="suggestionForm.get('type')?.value === 'suggestion'">
                <label for="priority" class="form-label">Priority</label>
                <div class="select-wrapper">
                  <select id="priority" 
                          class="form-control" 
                          formControlName="priority">
                    <option value="low">🏳️ Low - Minor suggestion</option>
                    <option value="medium">🚩 Medium - Moderate importance</option>
                    <option value="high">🔴 High - Important improvement</option>
                  </select>
                  <svg class="select-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 10l5 5 5-5z"/>
                  </svg>
                </div>
                <div class="form-hint">Complaints are automatically prioritized based on category</div>
              </div>

              <!-- Title -->
              <div class="form-group">
                <label for="title" class="form-label required">Title</label>
                <div class="input-wrapper">
                  <input type="text" 
                         id="title"
                         class="form-control" 
                         formControlName="title"
                         placeholder="Brief description of your feedback"
                         maxlength="200"
                         [class.error]="suggestionForm.get('title')?.invalid && suggestionForm.get('title')?.touched">
                  <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </div>
                <div class="char-count">{{suggestionForm.get('title')?.value?.length || 0}}/200 characters</div>
                <div class="error-message" *ngIf="suggestionForm.get('title')?.hasError('required') && suggestionForm.get('title')?.touched">
                  Title is required
                </div>
                <div class="error-message" *ngIf="suggestionForm.get('title')?.hasError('minlength')">
                  Title must be at least 5 characters long
                </div>
              </div>

              <!-- Description -->
              <div class="form-group">
                <label for="description" class="form-label required">Description</label>
                <div class="textarea-wrapper">
                  <textarea id="description"
                            class="form-control" 
                            formControlName="description"
                            rows="6"
                            placeholder="Provide detailed information about your feedback..."
                            maxlength="1000"
                            [class.error]="suggestionForm.get('description')?.invalid && suggestionForm.get('description')?.touched"></textarea>
                  <svg class="textarea-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                  </svg>
                </div>
                <div class="char-count">{{suggestionForm.get('description')?.value?.length || 0}}/1000 characters</div>
                <div class="error-message" *ngIf="suggestionForm.get('description')?.hasError('required') && suggestionForm.get('description')?.touched">
                  Description is required
                </div>
                <div class="error-message" *ngIf="suggestionForm.get('description')?.hasError('minlength')">
                  Description must be at least 10 characters long
                </div>
              </div>

              <!-- Anonymous Checkbox -->
              <div class="form-group">
                <label class="checkbox-container">
                  <input type="checkbox" formControlName="isAnonymous">
                  <span class="checkbox-label">
                    Submit anonymously
                    <span class="checkbox-hint">(Your identity will not be shown to other members, but admins can see it)</span>
                  </span>
                </label>
              </div>

              <!-- Form Actions -->
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="resetForm()">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                  Reset
                </button>
                <button type="submit" 
                        class="btn btn-primary" 
                        [disabled]="suggestionForm.invalid || submitting">
                  <svg *ngIf="!submitting" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                  <div *ngIf="submitting" class="spinner"></div>
                  {{ submitting ? 'Submitting...' : 'Submit Feedback' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- My Feedback History Tab -->
        <div class="tab-pane" *ngIf="selectedTab === 1">
          <div class="history-header">
            <h2>My Feedback History</h2>
            <p>Track your submitted suggestions and complaints</p>
          </div>

          <!-- Loading State -->
          <div *ngIf="loading" class="loading-container">
            <div class="spinner large"></div>
            <p>Loading your feedback...</p>
          </div>

          <!-- Empty State -->
          <div *ngIf="!loading && suggestions.length === 0" class="empty-state">
            <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z"/>
            </svg>
            <h3>No Feedback Submitted</h3>
            <p>You haven't submitted any suggestions or complaints yet.</p>
            <button type="button" class="btn btn-primary" (click)="selectedTab = 0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Submit Your First Feedback
            </button>
          </div>

          <!-- Suggestions List -->
          <div *ngIf="!loading && suggestions.length > 0" class="suggestions-list">
            <div *ngFor="let suggestion of suggestions" 
                 class="suggestion-card"
                 [class]="getSuggestionClass(suggestion)">
              <div class="card-header">
                <div class="suggestion-title-row">
                  <svg class="type-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path *ngIf="suggestion.type === 'suggestion'" d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7z"/>
                    <path *ngIf="suggestion.type === 'complaint'" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                  </svg>
                  <h3>{{ suggestion.title }}</h3>
                </div>
                <div class="suggestion-badges">
                  <span class="badge type-badge" [class]="suggestion.type">
                    {{ suggestion.type | titlecase }}
                  </span>
                  <span class="badge category-badge">
                    {{ getCategoryLabel(suggestion.category) }}
                  </span>
                  <span class="badge priority-badge" [class]="suggestion.priority">
                    {{ suggestion.priority | titlecase }}
                  </span>
                  <span class="badge status-badge" [class]="suggestion.status">
                    {{ getStatusLabel(suggestion.status) }}
                  </span>
                </div>
                <div class="suggestion-date">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                    <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                  </svg>
                  <span>{{ formatDate(suggestion.createdAt) }}</span>
                </div>
              </div>

              <div class="card-content">
                <p class="suggestion-description">{{ suggestion.description }}</p>
                
                <!-- Admin Response -->
                <div *ngIf="suggestion.adminResponse" class="admin-response">
                  <div class="response-header">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 11c.34 0 .67.04 1 .09V6.27L10.5 3 3 6.27v4.91c0 4.54 3.2 8.79 7.5 9.82.55-.13 1.08-.32 1.6-.55-.69-.98-1.1-2.17-1.1-3.45 0-3.31 2.69-6 6-6z"/>
                      <path d="M17 13c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-1.41 5.41L14 17.83l.59-.58L16 18.67l2.83-2.83.58.58-3.41 3.41z"/>
                    </svg>
                    <h4>Admin Response</h4>
                    <span class="response-date">{{ formatDate(suggestion.adminResponse.responseDate) }}</span>
                  </div>
                  <div class="response-content">
                    <p>{{ suggestion.adminResponse.response }}</p>
                    <div *ngIf="suggestion.adminResponse.actionTaken" class="action-taken">
                      <strong>Action Taken:</strong> {{ suggestion.adminResponse.actionTaken }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="card-actions">
                <button type="button" class="btn btn-text" (click)="viewSuggestionDetails(suggestion)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                  View Details
                </button>
                <button *ngIf="suggestion.status === 'open'" 
                        type="button" 
                        class="btn btn-text danger" 
                        (click)="deleteSuggestion(suggestion)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>

          <!-- Simple Pagination -->
          <div *ngIf="!loading && suggestions.length > 0" class="pagination">
            <button type="button" 
                    class="pagination-btn" 
                    [disabled]="currentPage === 1"
                    (click)="onPageChange({pageIndex: 0, pageSize: pageSize, length: totalCount})">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z"/>
              </svg>
            </button>
            <button type="button" 
                    class="pagination-btn" 
                    [disabled]="currentPage === 1"
                    (click)="onPageChange({pageIndex: currentPage - 2, pageSize: pageSize, length: totalCount})">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
              </svg>
            </button>
            <span class="pagination-info">
              Page {{ currentPage }} of {{ Math.ceil(totalCount / pageSize) || 1 }}
            </span>
            <button type="button" 
                    class="pagination-btn" 
                    [disabled]="currentPage >= Math.ceil(totalCount / pageSize)"
                    (click)="onPageChange({pageIndex: currentPage, pageSize: pageSize, length: totalCount})">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
              </svg>
            </button>
            <button type="button" 
                    class="pagination-btn" 
                    [disabled]="currentPage >= Math.ceil(totalCount / pageSize)"
                    (click)="onPageChange({pageIndex: Math.ceil(totalCount / pageSize) - 1, pageSize: pageSize, length: totalCount})">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './suggestions-custom.scss',
  encapsulation: ViewEncapsulation.None
})
export class SuggestionsComponent implements OnInit, OnDestroy {
  private apiUrl = environment.apiUrl;
  private subscription = new Subscription();

  suggestionForm: FormGroup;
  selectedTab = 0;
  submitting = false;
  loading = false;

  suggestions: Suggestion[] = [];
  totalCount = 0;
  currentPage = 1;
  pageSize = 10;
  Math = Math;

  categories = [
    { value: 'facility', label: 'Facility & Courts', icon: 'business' },
    { value: 'service', label: 'Customer Service', icon: 'room_service' },
    { value: 'booking', label: 'Booking System', icon: 'event' },
    { value: 'payments', label: 'Payments & Fees', icon: 'payment' },
    { value: 'staff', label: 'Staff & Personnel', icon: 'people' },
    { value: 'maintenance', label: 'Maintenance & Repairs', icon: 'build' },
    { value: 'general', label: 'General Feedback', icon: 'comment' }
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialogService: DialogService
  ) {
    this.suggestionForm = this.fb.group({
      type: ['', Validators.required],
      category: ['', Validators.required],
      priority: ['medium'],
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
      isAnonymous: [false]
    });
  }

  ngOnInit(): void {
    this.loadSuggestions();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  submitSuggestion(): void {
    if (this.suggestionForm.invalid) {
      return;
    }

    this.submitting = true;
    const formData = this.suggestionForm.value;

    this.subscription.add(
      this.http.post<any>(`${this.apiUrl}/suggestions`, formData).subscribe({
        next: (response) => {
          if (response.success) {
            this.showMessage(`${formData.type === 'complaint' ? 'Complaint' : 'Suggestion'} submitted successfully!`, 'success');
            this.resetForm();
            this.selectedTab = 1; // Switch to history tab
            this.loadSuggestions(); // Refresh the list
          } else {
            this.showMessage('Failed to submit feedback', 'error');
          }
          this.submitting = false;
        },
        error: (error) => {
          console.error('Error submitting suggestion:', error);
          this.showMessage('Failed to submit feedback', 'error');
          this.submitting = false;
        }
      })
    );
  }

  loadSuggestions(): void {
    this.loading = true;

    const params = {
      page: this.currentPage.toString(),
      limit: this.pageSize.toString()
    };

    this.subscription.add(
      this.http.get<any>(`${this.apiUrl}/suggestions`, { params }).subscribe({
        next: (response) => {
          if (response.success) {
            this.suggestions = response.data;
            this.totalCount = response.pagination?.totalCount || 0;
          } else {
            this.showMessage('Failed to load suggestions', 'error');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading suggestions:', error);
          this.showMessage('Failed to load suggestions', 'error');
          this.loading = false;
        }
      })
    );
  }

  resetForm(): void {
    this.suggestionForm.reset();
    this.suggestionForm.patchValue({
      type: '',
      category: '',
      priority: 'medium',
      title: '',
      description: '',
      isAnonymous: false
    });
    
    // Clear all validation states
    Object.keys(this.suggestionForm.controls).forEach(key => {
      this.suggestionForm.get(key)?.setErrors(null);
    });
    
    this.suggestionForm.markAsUntouched();
    this.suggestionForm.markAsPristine();
  }

  deleteSuggestion(suggestion: Suggestion): void {
    this.dialogService.delete({
      title: 'Delete Suggestion',
      message: `Are you sure you want to delete this ${suggestion.type}?`,
      itemName: suggestion.type
    }).subscribe(confirmed => {
      if (!confirmed) return;

      this.subscription.add(
        this.http.delete<any>(`${this.apiUrl}/suggestions/${suggestion._id}`).subscribe({
          next: (response) => {
            if (response.success) {
              this.showMessage(`${suggestion.type} deleted successfully`, 'success');
              this.loadSuggestions();
            } else {
              this.showMessage('Failed to delete suggestion', 'error');
            }
          },
          error: (error) => {
            console.error('Error deleting suggestion:', error);
            this.showMessage('Failed to delete suggestion', 'error');
          }
        })
      );
    });
  }

  viewSuggestionDetails(suggestion: Suggestion): void {
    // Could implement a detailed view modal or navigate to details page
    console.log('Viewing suggestion details:', suggestion);
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadSuggestions();
  }

  getSuggestionClass(suggestion: Suggestion): string {
    const classes = ['suggestion-item'];
    classes.push(`type-${suggestion.type}`);
    classes.push(`status-${suggestion.status}`);
    classes.push(`priority-${suggestion.priority}`);
    return classes.join(' ');
  }

  getSuggestionIcon(suggestion: Suggestion): string {
    if (suggestion.type === 'complaint') {
      return 'report_problem';
    }
    return 'lightbulb';
  }

  getCategoryLabel(category: string): string {
    const categoryMap: Record<string, string> = {
      facility: 'Facility',
      service: 'Service',
      booking: 'Booking',
      payments: 'Payments',
      staff: 'Staff',
      maintenance: 'Maintenance',
      general: 'General'
    };
    return categoryMap[category] || category;
  }

  getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      open: 'Open',
      in_review: 'Under Review',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed'
    };
    return statusMap[status] || status;
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private showMessage(message: string, type: 'success' | 'error' | 'warning'): void {
    const config = {
      duration: 4000,
      panelClass: [`snackbar-${type}`],
      horizontalPosition: 'center' as const,
      verticalPosition: 'bottom' as const
    };

    this.snackBar.open(message, 'Close', config);
  }
}
