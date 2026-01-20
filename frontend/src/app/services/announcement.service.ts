import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Announcement {
  _id: string;
  title: string;
  content: string;
  createdBy: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementResponse {
  success: boolean;
  message?: string;
  data?: Announcement | Announcement[] | any;
}

@Injectable({
  providedIn: 'root'
})
export class AnnouncementService {
  private apiUrl = `${environment.apiUrl}/announcements`;

  // BehaviorSubjects for reactive state management
  private activeAnnouncementsSubject = new BehaviorSubject<Announcement[]>([]);
  public activeAnnouncements$ = this.activeAnnouncementsSubject.asObservable();

  private newAnnouncementSubject = new BehaviorSubject<Announcement | null>(null);
  public newAnnouncement$ = this.newAnnouncementSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Load active announcements from API (not dismissed by current user)
   */
  loadActiveAnnouncements(): Observable<AnnouncementResponse> {
    return this.http.get<AnnouncementResponse>(`${this.apiUrl}/active`);
  }

  /**
   * Update the active announcements state
   */
  setActiveAnnouncements(announcements: Announcement[]): void {
    this.activeAnnouncementsSubject.next(announcements);
  }

  /**
   * Get current active announcements value
   */
  getActiveAnnouncements(): Announcement[] {
    return this.activeAnnouncementsSubject.value;
  }

  /**
   * Emit a new announcement (triggered by WebSocket)
   */
  emitNewAnnouncement(announcement: Announcement): void {
    this.newAnnouncementSubject.next(announcement);
  }

  /**
   * Dismiss an announcement
   */
  dismissAnnouncement(announcementId: string): Observable<AnnouncementResponse> {
    return this.http.post<AnnouncementResponse>(`${this.apiUrl}/${announcementId}/dismiss`, {});
  }

  /**
   * Create a new announcement (superadmin only)
   */
  createAnnouncement(title: string, content: string): Observable<AnnouncementResponse> {
    return this.http.post<AnnouncementResponse>(this.apiUrl, { title, content });
  }

  /**
   * Get all announcements with pagination (admin view)
   */
  getAllAnnouncements(page: number = 1, limit: number = 10): Observable<AnnouncementResponse> {
    return this.http.get<AnnouncementResponse>(`${this.apiUrl}?page=${page}&limit=${limit}`);
  }

  /**
   * Stop an announcement (deactivate - superadmin only)
   */
  stopAnnouncement(announcementId: string): Observable<AnnouncementResponse> {
    return this.http.patch<AnnouncementResponse>(`${this.apiUrl}/${announcementId}/stop`, {});
  }

  /**
   * Activate an announcement (reactivate - superadmin only)
   */
  activateAnnouncement(announcementId: string): Observable<AnnouncementResponse> {
    return this.http.patch<AnnouncementResponse>(`${this.apiUrl}/${announcementId}/activate`, {});
  }

  /**
   * Update an announcement (edit title and content - superadmin only)
   */
  updateAnnouncement(announcementId: string, title: string, content: string): Observable<AnnouncementResponse> {
    return this.http.put<AnnouncementResponse>(`${this.apiUrl}/${announcementId}`, { title, content });
  }

  /**
   * Delete an announcement (superadmin only)
   */
  deleteAnnouncement(announcementId: string): Observable<AnnouncementResponse> {
    return this.http.delete<AnnouncementResponse>(`${this.apiUrl}/${announcementId}`);
  }

  /**
   * Clear the new announcement notification
   */
  clearNewAnnouncement(): void {
    this.newAnnouncementSubject.next(null);
  }
}
