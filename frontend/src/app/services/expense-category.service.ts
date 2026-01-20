import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ExpenseCategory,
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryUsageResponse
} from '../models/expense-category.model';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

@Injectable({
  providedIn: 'root'
})
export class ExpenseCategoryService {
  private apiUrl = `${environment.apiUrl}/expense-categories`;

  constructor(private http: HttpClient) {}

  /**
   * Get all active expense categories
   */
  getAllCategories(): Observable<ApiResponse<ExpenseCategory[]>> {
    return this.http.get<ApiResponse<ExpenseCategory[]>>(this.apiUrl);
  }

  /**
   * Get all categories including inactive (for admin management)
   */
  getAllCategoriesIncludingInactive(): Observable<ApiResponse<ExpenseCategory[]>> {
    return this.http.get<ApiResponse<ExpenseCategory[]>>(`${this.apiUrl}/all`);
  }

  /**
   * Get single category by ID
   */
  getCategoryById(id: string): Observable<ApiResponse<ExpenseCategory>> {
    return this.http.get<ApiResponse<ExpenseCategory>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create new expense category
   */
  createCategory(data: CreateCategoryDto): Observable<ApiResponse<ExpenseCategory>> {
    return this.http.post<ApiResponse<ExpenseCategory>>(this.apiUrl, data);
  }

  /**
   * Update expense category
   */
  updateCategory(id: string, data: UpdateCategoryDto): Observable<ApiResponse<ExpenseCategory>> {
    return this.http.put<ApiResponse<ExpenseCategory>>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Soft-delete (deactivate) expense category
   */
  deleteCategory(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Activate expense category
   */
  activateCategory(id: string): Observable<ApiResponse<ExpenseCategory>> {
    return this.http.patch<ApiResponse<ExpenseCategory>>(`${this.apiUrl}/${id}/activate`, {});
  }

  /**
   * Reorder categories (bulk update display order)
   */
  reorderCategories(categoryIds: string[]): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(`${this.apiUrl}/reorder`, { categoryIds });
  }

  /**
   * Get category usage count
   */
  getCategoryUsage(id: string): Observable<ApiResponse<CategoryUsageResponse>> {
    return this.http.get<ApiResponse<CategoryUsageResponse>>(`${this.apiUrl}/${id}/usage`);
  }
}
