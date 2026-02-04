import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface Club {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  primaryColor: string;
  accentColor: string;
  status: 'active' | 'suspended' | 'trial';
}

export interface ClubMembership {
  _id: string;
  clubId: string;
  club?: Club;
  // Flat structure (as returned by backend)
  clubName?: string;
  clubSlug?: string;
  clubLogo?: string;
  clubPrimaryColor?: string;
  clubAccentColor?: string;
  clubStatus?: string;
  // Membership details
  role: 'member' | 'admin' | 'treasurer';
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  membershipFeesPaid: boolean;
  creditBalance: number;
  seedPoints: number;
  matchesWon: number;
  matchesPlayed: number;
  joinedAt: string;
}

export interface User {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  platformRole?: 'user' | 'platform_admin';
  // Deprecated fields (kept for backward compatibility)
  role: 'member' | 'admin' | 'superadmin' | 'treasurer';
  gender?: 'male' | 'female' | 'other';
  seedPoints?: number;
  matchesWon?: number;
  matchesPlayed?: number;
  phone?: string;
  dateOfBirth?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresIn: string;
  clubs: ClubMembership[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface UpdateProfileRequest {
  fullName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ImpersonationState {
  isImpersonating: boolean;
  adminUser: User | null;
  impersonatedUser: User | null;
  startedAt: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(true);
  private intendedRouteSubject = new BehaviorSubject<string | null>(null);
  private impersonationSubject = new BehaviorSubject<ImpersonationState>({
    isImpersonating: false,
    adminUser: null,
    impersonatedUser: null,
    startedAt: null
  });

  // Multi-tenant state
  private clubsSubject = new BehaviorSubject<ClubMembership[]>([]);
  private selectedClubSubject = new BehaviorSubject<ClubMembership | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();
  public intendedRoute$ = this.intendedRouteSubject.asObservable();
  public impersonation$ = this.impersonationSubject.asObservable();
  public clubs$ = this.clubsSubject.asObservable();
  public selectedClub$ = this.selectedClubSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Check for existing token on service initialization
    const token = localStorage.getItem('token');
    const userString = localStorage.getItem('user');
    const tokenExpiration = localStorage.getItem('tokenExpiration');
    const clubsString = localStorage.getItem('clubs');
    const selectedClubString = localStorage.getItem('selectedClub');

    if (token && userString && userString !== 'undefined' && userString !== 'null') {
      try {
        const user = JSON.parse(userString);

        // Check if token is expired
        if (tokenExpiration && this.isTokenExpiredByTimestamp(Number(tokenExpiration))) {
          console.log('🔐 Token expired during initialization, clearing auth state');
          this.clearAuthState();
        } else {
          this.tokenSubject.next(token);
          this.currentUserSubject.next(user);

          // Restore clubs if available
          if (clubsString && clubsString !== 'undefined' && clubsString !== 'null') {
            try {
              const clubs = JSON.parse(clubsString);
              this.clubsSubject.next(clubs);
            } catch (error) {
              console.error('Error parsing clubs from localStorage:', error);
            }
          }

          // Restore selected club if available
          if (selectedClubString && selectedClubString !== 'undefined' && selectedClubString !== 'null') {
            try {
              const selectedClub = JSON.parse(selectedClubString);
              this.selectedClubSubject.next(selectedClub);
              console.log('🏢 Restored selected club:', selectedClub.club?.name || selectedClub.clubId);
            } catch (error) {
              console.error('Error parsing selected club from localStorage:', error);
            }
          }

          // Ensure selected club has up-to-date membership details (role/status)
          const currentSelectedClub = this.selectedClubSubject.value;
          if (currentSelectedClub) {
            const clubs = this.clubsSubject.value;
            const matchingClub = clubs.find(c => c.clubId === currentSelectedClub.clubId);
            if (matchingClub) {
              this.selectedClubSubject.next(matchingClub);
              localStorage.setItem('selectedClub', JSON.stringify(matchingClub));
              console.log('🔄 Synced selected club from clubs list:', matchingClub.club?.name || matchingClub.clubId);
            }
          }

          console.log('🔐 Restored auth state from localStorage:', user.username);
        }
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        // Clear invalid data
        this.clearAuthState();
      }
    }

    // Restore impersonation state if exists
    this.restoreImpersonationState();

    // Set loading to false after initialization
    setTimeout(() => {
      this.isLoadingSubject.next(false);
      console.log('✅ Auth service initialization complete');
    }, 0);
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    this.isLoadingSubject.next(true);
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        tap((response: any) => {
          console.log('Login response:', response); // Debug log
          // Backend returns: { success: true, data: { token, user, expiresIn, clubs }, message }
          const token = response.data?.token || response.token;
          const user = response.data?.user || response.user;
          const expiresIn = response.data?.expiresIn || response.expiresIn || '7d';
          const clubs = response.data?.clubs || [];

          if (token && user) {
            // Calculate and store token expiration timestamp
            const expirationTimestamp = this.calculateExpirationTimestamp(expiresIn);

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('tokenExpiration', expirationTimestamp.toString());
            localStorage.setItem('loginTime', Date.now().toString());
            localStorage.setItem('clubs', JSON.stringify(clubs));

            this.tokenSubject.next(token);
            this.currentUserSubject.next(user);
            this.clubsSubject.next(clubs);

            // Auto-select first approved club if available
            const approvedClubs = clubs.filter((c: ClubMembership) => c.status === 'approved');
            if (approvedClubs.length > 0) {
              this.selectClub(approvedClubs[0]);
            } else {
              // Clear selected club if no approved clubs
              this.selectedClubSubject.next(null);
              localStorage.removeItem('selectedClub');
            }

            console.log('Auth state updated - token:', !!token, 'user:', user.username, 'clubs:', clubs.length, 'expires:', new Date(expirationTimestamp).toLocaleString());
          } else {
            console.error('Invalid login response - missing token or user');
          }
          this.isLoadingSubject.next(false);
        })
      );
  }

  logout(saveRoute: boolean = false): void {
    if (saveRoute) {
      const currentRoute = this.router.url;
      // Don't save login/register routes
      if (currentRoute !== '/login' && currentRoute !== '/register') {
        this.setIntendedRoute(currentRoute);
      }
    } else {
      this.clearIntendedRoute();
    }

    this.clearAuthState();
    this.router.navigate(['/login']);
  }

  /**
   * Clear all authentication state from localStorage and subjects
   */
  private clearAuthState(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiration');
    localStorage.removeItem('loginTime');
    localStorage.removeItem('impersonation');
    localStorage.removeItem('clubs');
    localStorage.removeItem('selectedClub');
    // Note: intendedRoute is NOT cleared here - handled separately
    this.tokenSubject.next(null);
    this.currentUserSubject.next(null);
    this.isLoadingSubject.next(false);
    this.clubsSubject.next([]);
    this.selectedClubSubject.next(null);
    this.impersonationSubject.next({
      isImpersonating: false,
      adminUser: null,
      impersonatedUser: null,
      startedAt: null
    });
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    return this.tokenSubject.value;
  }

  isAuthenticated(): boolean {
    if (!this.token) {
      return false;
    }

    // Check if token is expired
    if (this.isTokenExpired()) {
      console.log('🔐 Token expired, logging out');
      this.logout();
      return false;
    }

    return true;
  }

  isLoading(): boolean {
    return this.isLoadingSubject.value;
  }

  /**
   * Check if user is admin (backward compatibility - checks old role OR current club role)
   */
  isAdmin(): boolean {
    // Check platform admin
    if (this.isPlatformAdmin()) {
      return true;
    }
    // Check old role field (backward compatibility)
    if (this.currentUser?.role === 'admin' || this.currentUser?.role === 'superadmin') {
      return true;
    }
    // Check current club role
    return this.isClubAdmin();
  }

  /**
   * Check if user is superadmin (backward compatibility - now platform_admin)
   */
  isSuperAdmin(): boolean {
    // Platform admin is the new superadmin
    if (this.isPlatformAdmin()) {
      return true;
    }
    // Backward compatibility
    return this.currentUser?.role === 'superadmin';
  }

  /**
   * Check if user is treasurer (backward compatibility - checks old role OR current club role)
   */
  isTreasurer(): boolean {
    // Check old role field (backward compatibility)
    if (this.currentUser?.role === 'treasurer') {
      return true;
    }
    // Check current club role
    return this.isClubTreasurer();
  }

  /**
   * Check if user has financial access (backward compatibility)
   */
  hasFinancialAccess(): boolean {
    // Platform admin has all access
    if (this.isPlatformAdmin()) {
      return true;
    }
    // Check old role field (backward compatibility)
    if (this.currentUser?.role === 'treasurer' ||
        this.currentUser?.role === 'admin' ||
        this.currentUser?.role === 'superadmin') {
      return true;
    }
    // Check current club role
    return this.hasClubFinancialAccess();
  }

  /**
   * Get user profile from server
   */
  getProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/profile`);
  }

  /**
   * Update user profile
   */
  updateProfile(profileData: UpdateProfileRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/auth/profile`, profileData)
      .pipe(
        tap((response: any) => {
          // Update local user data if response contains updated user
          if (response.data?.user) {
            const updatedUser = response.data.user;
            this.currentUserSubject.next(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
          }
        })
      );
  }

  /**
   * Change user password
   */
  changePassword(passwordData: ChangePasswordRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/auth/change-password`, passwordData);
  }

  /**
   * Check if the current token is expired
   */
  isTokenExpired(): boolean {
    const tokenExpiration = localStorage.getItem('tokenExpiration');
    if (!tokenExpiration) {
      return false; // No expiration set, assume valid (for backwards compatibility)
    }

    return this.isTokenExpiredByTimestamp(Number(tokenExpiration));
  }

  /**
   * Check if a given timestamp is in the past (token expired)
   */
  private isTokenExpiredByTimestamp(expirationTimestamp: number): boolean {
    return Date.now() >= expirationTimestamp;
  }

  /**
   * Calculate expiration timestamp from expiresIn string (e.g., "7d", "24h", "60m")
   */
  private calculateExpirationTimestamp(expiresIn: string): number {
    const now = Date.now();
    const match = expiresIn.match(/^(\d+)([dhms])$/);

    if (!match) {
      console.warn('Invalid expiresIn format:', expiresIn, '- defaulting to 7 days');
      return now + (7 * 24 * 60 * 60 * 1000); // Default to 7 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    let milliseconds = 0;
    switch (unit) {
      case 'd': // days
        milliseconds = value * 24 * 60 * 60 * 1000;
        break;
      case 'h': // hours
        milliseconds = value * 60 * 60 * 1000;
        break;
      case 'm': // minutes
        milliseconds = value * 60 * 1000;
        break;
      case 's': // seconds
        milliseconds = value * 1000;
        break;
      default:
        milliseconds = 7 * 24 * 60 * 60 * 1000; // Default to 7 days
    }

    return now + milliseconds;
  }

  /**
   * Save the intended route before logout
   */
  setIntendedRoute(route: string): void {
    localStorage.setItem('intendedRoute', route);
    this.intendedRouteSubject.next(route);
    console.log('🔐 Saved intended route:', route);
  }

  /**
   * Get the intended route after login
   */
  getIntendedRoute(): string | null {
    return localStorage.getItem('intendedRoute');
  }

  /**
   * Clear the intended route
   */
  clearIntendedRoute(): void {
    localStorage.removeItem('intendedRoute');
    this.intendedRouteSubject.next(null);
  }

  /**
   * Get the total token lifetime in milliseconds
   */
  getTokenLifetime(): number {
    const loginTime = localStorage.getItem('loginTime');
    const expirationTime = localStorage.getItem('tokenExpiration');

    if (!loginTime || !expirationTime) {
      return 0;
    }

    return Number(expirationTime) - Number(loginTime);
  }

  /**
   * Get remaining session time in milliseconds
   */
  getRemainingSessionTime(): number {
    const expirationTime = localStorage.getItem('tokenExpiration');
    if (!expirationTime) {
      return 0;
    }

    return Number(expirationTime) - Date.now();
  }

  /**
   * Check if token is about to expire (within threshold)
   */
  isTokenExpiringSoon(thresholdMs: number): boolean {
    const remaining = this.getRemainingSessionTime();
    return remaining > 0 && remaining <= thresholdMs;
  }

  /**
   * Get user's clubs
   */
  get clubs(): ClubMembership[] {
    return this.clubsSubject.value;
  }

  /**
   * Get currently selected club
   */
  get selectedClub(): ClubMembership | null {
    return this.selectedClubSubject.value;
  }

  /**
   * Get approved clubs only
   */
  get approvedClubs(): ClubMembership[] {
    return this.clubsSubject.value.filter(c => c.status === 'approved');
  }

  /**
   * Select a club (switches context to this club)
   */
  selectClub(club: ClubMembership): void {
    if (!club || club.status !== 'approved') {
      console.warn('Cannot select club:', club?.status || 'null club');
      return;
    }

    this.selectedClubSubject.next(club);
    localStorage.setItem('selectedClub', JSON.stringify(club));
    console.log('🏢 Selected club:', club.club?.name || club.clubId);
  }

  /**
   * Reload the currently selected club to get updated data
   */
  async reloadSelectedClub(): Promise<void> {
    const selectedClub = this.selectedClubSubject.value;
    if (!selectedClub || !selectedClub.clubId) {
      return;
    }

    try {
      // Fetch the club's public info to get updated logo
      const response = await this.http.get<any>(`${environment.apiUrl}/clubs/${selectedClub.clubId}/public`).toPromise();
      console.log('Reload club response:', response);
      if (response.success && response.data && response.data.club) {
        const clubData = response.data.club;
        
        // Update the selected club with new logo
        const updatedSelectedClub = {
          ...selectedClub,
          club: {
            ...selectedClub.club,
            logo: clubData.logo,
            primaryColor: clubData.primaryColor,
            accentColor: clubData.accentColor
          }
        };
        
        console.log('Updated selected club:', updatedSelectedClub);
        this.selectedClubSubject.next(updatedSelectedClub);
        localStorage.setItem('selectedClub', JSON.stringify(updatedSelectedClub));
        
        // Also update in clubs list
        const clubs = this.clubsSubject.value;
        const clubIndex = clubs.findIndex((c: ClubMembership) => c.clubId === selectedClub.clubId);
        if (clubIndex !== -1) {
          clubs[clubIndex] = updatedSelectedClub;
          this.clubsSubject.next(clubs);
          localStorage.setItem('clubs', JSON.stringify(clubs));
        }
      }
    } catch (error) {
      console.error('Error reloading selected club:', error);
    }
  }

  /**
   * Switch to a different club by clubId
   */
  switchClub(clubId: string): boolean {
    const club = this.approvedClubs.find(c => c.clubId === clubId);
    if (club) {
      this.selectClub(club);
      return true;
    }
    console.warn('Club not found or not approved:', clubId);
    return false;
  }

  /**
   * Check if user has any approved clubs
   */
  hasApprovedClubs(): boolean {
    return this.approvedClubs.length > 0;
  }

  /**
   * Get user's role in the currently selected club
   */
  getClubRole(): 'member' | 'admin' | 'treasurer' | null {
    const selectedRole = this.selectedClub?.role;
    if (selectedRole) {
      return selectedRole;
    }

    const selectedClubId = this.selectedClub?.clubId;
    if (!selectedClubId) {
      return null;
    }

    const fallbackClub = this.clubsSubject.value.find(c => c.clubId === selectedClubId);
    return fallbackClub?.role || null;
  }

  /**
   * Check if user is admin in current club
   */
  isClubAdmin(): boolean {
    const role = this.getClubRole();
    return role === 'admin' || role === 'treasurer';
  }

  /**
   * Check if user is treasurer in current club
   */
  isClubTreasurer(): boolean {
    return this.getClubRole() === 'treasurer';
  }

  /**
   * Check if user has financial access in current club
   */
  hasClubFinancialAccess(): boolean {
    const role = this.getClubRole();
    return role === 'treasurer' || role === 'admin';
  }

  /**
   * Get platform role
   */
  isPlatformAdmin(): boolean {
    return this.currentUser?.platformRole === 'platform_admin';
  }

  /**
   * Get current impersonation state
   */
  get isImpersonating(): boolean {
    return this.impersonationSubject.value.isImpersonating;
  }

  /**
   * Get real user (admin if impersonating, current user otherwise)
   */
  get realUser(): User | null {
    const impersonation = this.impersonationSubject.value;
    return impersonation.isImpersonating ? impersonation.adminUser : this.currentUser;
  }

  /**
   * Start impersonating a user
   */
  startImpersonation(userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/impersonation/start/${userId}`, {})
      .pipe(
        tap((response: any) => {
          const { token, user, adminUser, expiresIn } = response.data;

          // Calculate token expiration
          const expirationTimestamp = this.calculateExpirationTimestamp(expiresIn);

          // Update localStorage
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('tokenExpiration', expirationTimestamp.toString());
          localStorage.setItem('impersonation', JSON.stringify({
            adminUser,
            impersonatedUser: user,
            startedAt: new Date().toISOString()
          }));

          // Update subjects
          this.tokenSubject.next(token);
          this.currentUserSubject.next(user);
          this.impersonationSubject.next({
            isImpersonating: true,
            adminUser,
            impersonatedUser: user,
            startedAt: new Date()
          });

          console.log(`👥 Impersonation started: ${adminUser.username} → ${user.username}`);
        })
      );
  }

  /**
   * Stop impersonating and return to admin account
   */
  stopImpersonation(): Observable<any> {
    return this.http.post(`${this.apiUrl}/impersonation/stop`, {})
      .pipe(
        tap((response: any) => {
          const { token, user, expiresIn } = response.data;

          // Calculate token expiration
          const expirationTimestamp = this.calculateExpirationTimestamp(expiresIn);

          // Clear impersonation and restore admin
          localStorage.removeItem('impersonation');
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('tokenExpiration', expirationTimestamp.toString());

          // Update subjects
          this.tokenSubject.next(token);
          this.currentUserSubject.next(user);
          this.impersonationSubject.next({
            isImpersonating: false,
            adminUser: null,
            impersonatedUser: null,
            startedAt: null
          });

          console.log(`👥 Impersonation ended, returned to ${user.username}`);
        })
      );
  }

  /**
   * Restore impersonation state from localStorage
   */
  private restoreImpersonationState(): void {
    const impersonationString = localStorage.getItem('impersonation');
    if (impersonationString) {
      try {
        const { adminUser, impersonatedUser, startedAt } = JSON.parse(impersonationString);
        this.impersonationSubject.next({
          isImpersonating: true,
          adminUser,
          impersonatedUser,
          startedAt: new Date(startedAt)
        });
        console.log(`👥 Restored impersonation state: ${adminUser.username} → ${impersonatedUser.username}`);
      } catch (error) {
        console.error('Error restoring impersonation state:', error);
        localStorage.removeItem('impersonation');
      }
    }
  }
}