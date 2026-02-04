import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { CalendarViewComponent } from './components/calendar-view/calendar-view.component';
import { ReservationsComponent } from './components/reservations/reservations.component';
import { RegisterComponent } from './components/register/register.component';
import { MyReservationsComponent } from './components/my-reservations/my-reservations.component';
import { PaymentsComponent } from './components/payments/payments.component';
import { AdminCreditManagementComponent } from './components/admin-credit-management/admin-credit-management.component';
import { CreditTopupComponent } from './components/credit-topup/credit-topup.component';
import { CreditHistoryComponent } from './components/credit-history/credit-history.component';
import { CreditDashboardComponent } from './components/credit-dashboard/credit-dashboard.component';
import { MembersDirectoryComponent } from './components/members-directory/members-directory.component';
import { MemberProfileComponent } from './components/member-profile/member-profile.component';
import { CourtReceiptsReportComponent } from './components/court-receipts-report/court-receipts-report.component';
import { AdminPollManagementComponent } from './components/admin-poll-management/admin-poll-management.component';
import { PollsComponent } from './components/polls/polls.component';
import { RankingsComponent } from './components/rankings/rankings.component';
import { WeatherComponent } from './components/weather/weather.component';
import { SuggestionsComponent } from './components/suggestions/suggestions.component';
import { AdminSuggestionsComponent } from './components/admin-suggestions/admin-suggestions.component';
import { AdminAnalyticsComponent } from './components/admin-analytics/admin-analytics.component';
import { CourtUsageReportComponent } from './components/court-usage-report/court-usage-report.component';
import { FinancialReportComponent } from './components/financial-report/financial-report.component';
import { ExpenseReportComponent } from './components/expense-report/expense-report.component';
import { AdminMemberManagementComponent } from './components/admin-member-management/admin-member-management.component';
import { ProfileComponent } from './components/profile/profile.component';
import { RulesAndRegulationsComponent } from './components/rules-and-regulations/rules-and-regulations.component';
import { AdminManualCourtUsageComponent } from './components/admin-manual-court-usage/admin-manual-court-usage.component';
import { AdminBlockCourtComponent } from './components/admin-block-court/admin-block-court.component';
import { AdminMembershipPaymentsComponent } from './components/admin-membership-payments/admin-membership-payments.component';
import { TournamentManagementComponent } from './components/tournament-management/tournament-management.component';
import { AdminPaymentManagementComponent } from './components/admin-payment-management/admin-payment-management.component';
import { AdminResurfacingContributionsComponent } from './components/admin-resurfacing-contributions/admin-resurfacing-contributions.component';
import { ResurfacingContributionsComponent } from './components/resurfacing-contributions/resurfacing-contributions.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { AdminGalleryUploadComponent } from './components/admin-gallery-upload/admin-gallery-upload.component';
import { AnnouncementManagementComponent } from './pages/admin/announcement-management/announcement-management.component';
import { ClubManagementComponent } from './pages/admin/club-management/club-management.component';
import { ClubSettingsComponent } from './pages/admin/club-settings/club-settings.component';
import { PlatformOverviewComponent } from './pages/admin/platform-overview/platform-overview';
import { PendingClubsComponent } from './pages/admin/pending-clubs/pending-clubs.component';
import { ClubSelectorComponent } from './components/club-selector/club-selector.component';
import { ClubRegistrationComponent } from './components/club-registration/club-registration.component';
import { ClubAdminRegistrationComponent } from './components/club-admin-registration/club-admin-registration.component';
import { BrowseClubsComponent } from './components/browse-clubs/browse-clubs.component';
import { MyMembershipRequestsComponent } from './components/my-membership-requests/my-membership-requests.component';
import { authGuard, loginGuard, adminGuard, superadminGuard, treasurerGuard, clubSelectionGuard, clubAdminGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/calendar', pathMatch: 'full' },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [loginGuard]
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [loginGuard]
  },
  {
    path: 'register-club',
    component: ClubAdminRegistrationComponent,
    canActivate: [loginGuard] // Redirect if already logged in
  },
  // Club selection and registration (auth required but no club selection required)
  {
    path: 'club-selector',
    component: ClubSelectorComponent,
    canActivate: [authGuard]
  },
  {
    path: 'club-registration',
    component: ClubRegistrationComponent,
    canActivate: [authGuard] // Any authenticated user can request club registration
  },
  {
    path: 'browse-clubs',
    component: BrowseClubsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'my-requests',
    component: MyMembershipRequestsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard, clubSelectionGuard]
  },
  // Calendar view (new landing page)
  {
    path: 'calendar',
    component: CalendarViewComponent,
    canActivate: [authGuard, clubSelectionGuard]
  },
  // Court reservation
  {
    path: 'reservations',
    component: ReservationsComponent,
    canActivate: [authGuard, clubSelectionGuard]
  },
  {
    path: 'my-reservations',
    component: MyReservationsComponent,
    canActivate: [authGuard, clubSelectionGuard]
  },
  // Payment management
  {
    path: 'payments',
    component: PaymentsComponent,
    canActivate: [authGuard, clubSelectionGuard]
  },
  // Admin credit management
  {
    path: 'admin/credits',
    component: AdminCreditManagementComponent,
    canActivate: [authGuard, clubSelectionGuard, clubAdminGuard]
  },
  // Credit management
  {
    path: 'credits',
    component: CreditDashboardComponent,
    canActivate: [authGuard, clubSelectionGuard]
  },
  // Credit top-up
  {
    path: 'credit-topup',
    component: CreditTopupComponent,
    canActivate: [authGuard, clubSelectionGuard]
  },
  // Credit history
  {
    path: 'credit-history',
    component: CreditHistoryComponent,
    canActivate: [authGuard, clubSelectionGuard]
  },
  // Member directory
  {
    path: 'members',
    component: MembersDirectoryComponent,
    canActivate: [authGuard, clubSelectionGuard]
  },
  {
    path: 'members/:id',
    component: MemberProfileComponent,
    canActivate: [authGuard, clubSelectionGuard]
  },
  // Admin reports
  {
    path: 'admin/reports',
    component: CourtReceiptsReportComponent,
    canActivate: [authGuard, clubSelectionGuard, treasurerGuard]
  },
  // Polls and voting
  {
    path: 'polls',
    component: PollsComponent,
    canActivate: [authGuard, clubSelectionGuard]
  },
  // Rankings and leaderboard
  {
    path: 'rankings',
    component: RankingsComponent,
    canActivate: [authGuard, clubSelectionGuard]
  },
  // Weather forecast
  {
    path: 'weather',
    component: WeatherComponent,
    canActivate: [authGuard, clubSelectionGuard]
  },
  // Suggestions and complaints
  {
    path: 'suggestions',
    component: SuggestionsComponent,
    canActivate: [authGuard, clubSelectionGuard]
  },
  // Rules and Regulations
  {
    path: 'rules',
    component: RulesAndRegulationsComponent,
    canActivate: [authGuard, clubSelectionGuard]
  },
  // Gallery (members only viewing, superadmin upload)
  {
    path: 'gallery',
    component: GalleryComponent,
    canActivate: [authGuard, clubSelectionGuard]
  },
  {
    path: 'admin/gallery-upload',
    component: AdminGalleryUploadComponent,
    canActivate: [authGuard, clubSelectionGuard, superadminGuard]
  },
  // Court Usage Report
  {
    path: 'court-usage-report',
    component: CourtUsageReportComponent,
    canActivate: [authGuard, clubSelectionGuard]
  },
  // Financial Report (Treasurer/Admin/SuperAdmin)
  {
    path: 'admin/financial-report',
    component: FinancialReportComponent,
    canActivate: [authGuard, clubSelectionGuard, treasurerGuard]
  },
  // Expense Report (Admin only)
  {
    path: 'admin/expense-report',
    component: ExpenseReportComponent,
    canActivate: [authGuard, clubSelectionGuard, clubAdminGuard]
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [authGuard]
  },
  {
    path: 'admin/members',
    component: AdminMemberManagementComponent,
    canActivate: [authGuard, clubSelectionGuard, clubAdminGuard]
  },
  { path: 'admin/polls', component: AdminPollManagementComponent, canActivate: [authGuard, clubSelectionGuard, clubAdminGuard] },
  { path: 'admin/suggestions', component: AdminSuggestionsComponent, canActivate: [authGuard, clubSelectionGuard, clubAdminGuard] },
  { path: 'admin/analytics', component: AdminAnalyticsComponent, canActivate: [authGuard, clubSelectionGuard, clubAdminGuard] },
  { path: 'admin/manual-court-usage', component: AdminManualCourtUsageComponent, canActivate: [authGuard, clubSelectionGuard, clubAdminGuard] },
  { path: 'admin/block-court', component: AdminBlockCourtComponent, canActivate: [authGuard, clubSelectionGuard, clubAdminGuard] },
  { path: 'admin/membership-payments', component: AdminMembershipPaymentsComponent, canActivate: [authGuard, clubSelectionGuard, treasurerGuard] },
  { path: 'admin/tournaments', component: TournamentManagementComponent, canActivate: [authGuard, clubSelectionGuard, clubAdminGuard] },
  { path: 'admin/payments', component: AdminPaymentManagementComponent, canActivate: [authGuard, clubSelectionGuard, clubAdminGuard] },
  { path: 'admin/resurfacing-contributions', component: AdminResurfacingContributionsComponent, canActivate: [authGuard, clubSelectionGuard, clubAdminGuard] },
  { path: 'admin/announcements', component: AnnouncementManagementComponent, canActivate: [authGuard, clubSelectionGuard, superadminGuard] },
  { path: 'admin/club-settings', component: ClubSettingsComponent, canActivate: [authGuard, clubSelectionGuard, clubAdminGuard] },
  { path: 'admin/clubs', component: ClubManagementComponent, canActivate: [authGuard, superadminGuard] },
  { path: 'admin/platform-overview', component: PlatformOverviewComponent, canActivate: [authGuard, superadminGuard] },
  { path: 'admin/pending-clubs', component: PendingClubsComponent, canActivate: [authGuard, superadminGuard] },
  { path: 'resurfacing-contributions', component: ResurfacingContributionsComponent, canActivate: [authGuard, clubSelectionGuard] },
  { path: '**', redirectTo: '/calendar' }
];
