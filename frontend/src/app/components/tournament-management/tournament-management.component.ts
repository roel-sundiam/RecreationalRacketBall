import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatRadioModule } from '@angular/material/radio';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

interface Tournament {
  _id: string;
  name: string;
  date: string;
  createdBy: any;
  matches: TournamentMatch[];
  status: 'draft' | 'completed';
  totalMatches: number;
  createdAt: string;
  updatedAt: string;
}

interface TournamentMatch {
  matchType: 'singles' | 'doubles';
  // Singles fields
  player1?: string;
  player2?: string;
  player1Name?: string;
  player2Name?: string;
  // Doubles fields
  team1Player1?: string;
  team1Player2?: string;
  team2Player1?: string;
  team2Player2?: string;
  team1Player1Name?: string;
  team1Player2Name?: string;
  team2Player1Name?: string;
  team2Player2Name?: string;
  // Common fields
  score: string;
  winner: string;
  round: string;
  player1Games?: number;
  player2Games?: number;
  team1Games?: number;
  team2Games?: number;
  pointsProcessed: boolean;
}

interface Member {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
}

@Component({
  selector: 'app-tournament-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatToolbarModule,
    MatExpansionModule,
    MatTooltipModule,
    MatChipsModule,
    MatRadioModule
  ],
  templateUrl: './tournament-management.component.html',
  styleUrls: ['./tournament-management.component.scss']
})
export class TournamentManagementComponent implements OnInit {
  tournaments: Tournament[] = [];
  members: Member[] = [];
  loading = false;
  showCreateForm = false;
  editingTournament: Tournament | null = null;
  tournamentForm!: FormGroup;
  displayedColumns: string[] = ['name', 'date', 'matches', 'status', 'actions'];
  debugData: any = null;
  showDebug = true;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadMembers();
    this.loadTournaments();
  }

  initForm(): void {
    this.tournamentForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      date: ['', Validators.required],
      matches: this.fb.array([])
    });
  }

  get matches(): FormArray {
    return this.tournamentForm.get('matches') as FormArray;
  }

  createMatchFormGroup(): FormGroup {
    return this.fb.group({
      matchType: ['singles', Validators.required],
      // Singles fields
      player1: [''],
      player2: [''],
      player1Name: [''],  // For non-member name
      player2Name: [''],  // For non-member name
      // Doubles fields
      team1Player1: [''],
      team1Player2: [''],
      team2Player1: [''],
      team2Player2: [''],
      team1Player1Name: [''],  // For non-member name
      team1Player2Name: [''],  // For non-member name
      team2Player1Name: [''],  // For non-member name
      team2Player2Name: [''],  // For non-member name
      // Common fields
      score: ['8-6', [Validators.required, Validators.pattern(/^\d+\s*-\s*\d+$/)]],
      winner: ['', Validators.required],
      round: ['Elimination', Validators.required],
      pointsProcessed: [false]
    });
  }

  addMatch(): void {
    this.matches.push(this.createMatchFormGroup());
  }

  removeMatch(index: number): void {
    this.matches.removeAt(index);
  }

  loadMembers(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/members?limit=100`)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.members = response.data.filter((m: Member) =>
              m.role === 'member' || m.role === 'admin' || m.role === 'superadmin'
            );
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading members:', error);
          this.snackBar.open('Failed to load members', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  loadTournaments(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/tournaments`)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.tournaments = response.data;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading tournaments:', error);
          this.snackBar.open('Failed to load tournaments', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    this.editingTournament = null;
    if (this.showCreateForm && this.matches.length === 0) {
      this.addMatch(); // Add one match by default
    }
  }

  editTournament(tournament: Tournament): void {
    this.editingTournament = tournament;
    this.showCreateForm = true;

    // Clear existing matches
    while (this.matches.length > 0) {
      this.matches.removeAt(0);
    }

    // Populate form with tournament data
    this.tournamentForm.patchValue({
      name: tournament.name,
      date: new Date(tournament.date)
    });

    // Add existing matches to form
    tournament.matches.forEach(match => {
      const matchGroup = this.createMatchFormGroup();
      matchGroup.patchValue({
        matchType: match.matchType,
        player1: match.player1 || '',
        player2: match.player2 || '',
        player1Name: match.player1Name || '',
        player2Name: match.player2Name || '',
        team1Player1: match.team1Player1 || '',
        team1Player2: match.team1Player2 || '',
        team2Player1: match.team2Player1 || '',
        team2Player2: match.team2Player2 || '',
        team1Player1Name: match.team1Player1Name || '',
        team1Player2Name: match.team1Player2Name || '',
        team2Player1Name: match.team2Player1Name || '',
        team2Player2Name: match.team2Player2Name || '',
        score: match.score,
        winner: match.winner,
        round: match.round,
        pointsProcessed: match.pointsProcessed || false
      });
      this.matches.push(matchGroup);
    });

    // If no matches, add one empty match
    if (this.matches.length === 0) {
      this.addMatch();
    }
  }

  // Helper function to extract ID from value (handles both strings and populated objects)
  private extractId(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value._id) return value._id;
    return '';
  }

  // Helper function to check if a value has content (handles both strings and objects)
  private hasValue(value: any): boolean {
    if (!value) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'object') return true; // Populated object
    return false;
  }

  createTournament(): void {
    if (this.tournamentForm.invalid) {
      this.snackBar.open('Please fill all required fields correctly', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    const formValue = this.tournamentForm.value;

    try {
      const isEditing = this.editingTournament !== null;

      // Validate and clean up matches
      const cleanedMatches = formValue.matches.map((match: any, index: number) => {
        const matchType = match.matchType || 'singles';

        const cleanedMatch: any = {
          matchType: matchType,
          score: match.score,
          winner: match.winner,
          round: match.round,
          pointsProcessed: match.pointsProcessed || false
        };

        if (matchType === 'singles') {
          // Validate singles fields - must have either member ID or name for each player
          const hasPlayer1 = this.hasValue(match.player1) || this.hasValue(match.player1Name);
          const hasPlayer2 = this.hasValue(match.player2) || this.hasValue(match.player2Name);

          if (!hasPlayer1 || !hasPlayer2) {
            throw new Error(`Match ${index + 1}: Please provide both players (select member or enter name)`);
          }

          cleanedMatch.player1 = this.extractId(match.player1);
          cleanedMatch.player2 = this.extractId(match.player2);
          cleanedMatch.player1Name = match.player1Name || '';
          cleanedMatch.player2Name = match.player2Name || '';
        } else {
          // Validate doubles fields - must have either member ID or name for each player
          const hasT1P1 = this.hasValue(match.team1Player1) || this.hasValue(match.team1Player1Name);
          const hasT1P2 = this.hasValue(match.team1Player2) || this.hasValue(match.team1Player2Name);
          const hasT2P1 = this.hasValue(match.team2Player1) || this.hasValue(match.team2Player1Name);
          const hasT2P2 = this.hasValue(match.team2Player2) || this.hasValue(match.team2Player2Name);

          if (!hasT1P1 || !hasT1P2 || !hasT2P1 || !hasT2P2) {
            throw new Error(`Match ${index + 1}: Please provide all 4 players (select member or enter name)`);
          }

          cleanedMatch.team1Player1 = this.extractId(match.team1Player1);
          cleanedMatch.team1Player2 = this.extractId(match.team1Player2);
          cleanedMatch.team2Player1 = this.extractId(match.team2Player1);
          cleanedMatch.team2Player2 = this.extractId(match.team2Player2);
          cleanedMatch.team1Player1Name = match.team1Player1Name || '';
          cleanedMatch.team1Player2Name = match.team1Player2Name || '';
          cleanedMatch.team2Player1Name = match.team2Player1Name || '';
          cleanedMatch.team2Player2Name = match.team2Player2Name || '';
        }

        return cleanedMatch;
      });

      const tournamentData = {
        name: formValue.name,
        date: formValue.date,
        matches: cleanedMatches
      };

      // Set debug data for UI display
      this.debugData = {
        tournament: tournamentData,
        rawFormValue: formValue,
        timestamp: new Date().toISOString()
      };

      const url = isEditing
        ? `${environment.apiUrl}/tournaments/${this.editingTournament!._id}`
        : `${environment.apiUrl}/tournaments`;
      const method = isEditing ? 'put' : 'post';

      console.log(`${isEditing ? 'Updating' : 'Creating'} tournament with data:`, tournamentData);

      this.http.request<any>(method, url, { body: tournamentData })
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.snackBar.open(
                `Tournament ${isEditing ? 'updated' : 'created'} successfully!`,
                'Close',
                { duration: 3000 }
              );
              this.loadTournaments();
              this.resetForm();
              this.showCreateForm = false;
              this.editingTournament = null;
            }
            this.loading = false;
          },
          error: (error) => {
            console.error(`Error ${isEditing ? 'updating' : 'creating'} tournament:`, error);
            const errorMsg = error.error?.error || `Failed to ${isEditing ? 'update' : 'create'} tournament`;
            this.snackBar.open(errorMsg, 'Close', { duration: 5000 });
            this.loading = false;
          }
        });
    } catch (error: any) {
      this.loading = false;
      this.snackBar.open(error.message || 'Validation error', 'Close', { duration: 5000 });
    }
  }

  processPoints(tournamentId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Process Tournament Points',
        message: 'Are you sure you want to process points for this tournament? This action will award points to all players based on their match results.',
        confirmText: 'Process Points',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      this.loading = true;
      this.http.post<any>(`${environment.apiUrl}/tournaments/${tournamentId}/process-points`, {})
        .subscribe({
          next: (response) => {
            if (response.success) {
              const msg = `${response.message}. Processed: ${response.data.processed} matches`;
              this.snackBar.open(msg, 'Close', { duration: 5000 });
              this.loadTournaments();
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error processing points:', error);
            const errorMsg = error.error?.error || 'Failed to process points';
            this.snackBar.open(errorMsg, 'Close', { duration: 5000 });
            this.loading = false;
          }
        });
    });
  }

  deleteTournament(tournamentId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Tournament',
        message: 'Are you sure you want to delete this tournament? This action cannot be undone and all match data will be permanently removed.',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      this.loading = true;
      this.http.delete<any>(`${environment.apiUrl}/tournaments/${tournamentId}`)
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.snackBar.open('Tournament deleted successfully', 'Close', { duration: 3000 });
              this.loadTournaments();
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error deleting tournament:', error);
            const errorMsg = error.error?.error || error.error?.suggestion || 'Failed to delete tournament';
            this.snackBar.open(errorMsg, 'Close', { duration: 5000 });
            this.loading = false;
          }
        });
    });
  }

  resetForm(): void {
    this.tournamentForm.reset();
    this.editingTournament = null;
    while (this.matches.length > 0) {
      this.matches.removeAt(0);
    }
    this.addMatch(); // Add one default match
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  getMemberName(memberId: string): string {
    const member = this.members.find(m => m._id === memberId);
    return member ? member.fullName : 'Unknown';
  }

  hasPlayer(match: any, memberField: string, nameField: string): boolean {
    const memberId = match.get(memberField)?.value;
    const name = match.get(nameField)?.value;
    return (memberId && typeof memberId === 'string' && memberId.trim() !== '') ||
           (name && typeof name === 'string' && name.trim() !== '');
  }

  getPlayerDisplayName(match: any, memberField: string, nameField: string): string {
    const memberValue = match.get(memberField)?.value;
    const nameValue = match.get(nameField)?.value;

    // Check if custom name is provided
    if (nameValue && typeof nameValue === 'string' && nameValue.trim()) {
      return nameValue.trim();
    }

    // Check if memberValue is a populated object (from backend)
    if (memberValue && typeof memberValue === 'object' && memberValue.fullName) {
      return memberValue.fullName;
    }

    // Check if memberValue is a string ID
    if (memberValue && typeof memberValue === 'string' && memberValue.trim()) {
      return this.getMemberName(memberValue);
    }

    return '';
  }

  getMatchPreview(match: any): string {
    if (!match) return '';

    const matchType = match.get('matchType')?.value || 'singles';

    if (matchType === 'doubles') {
      const t1p1Display = this.getPlayerDisplayName(match, 'team1Player1', 'team1Player1Name');
      const t1p2Display = this.getPlayerDisplayName(match, 'team1Player2', 'team1Player2Name');
      const t2p1Display = this.getPlayerDisplayName(match, 'team2Player1', 'team2Player1Name');
      const t2p2Display = this.getPlayerDisplayName(match, 'team2Player2', 'team2Player2Name');

      if (t1p1Display && t1p2Display && t2p1Display && t2p2Display) {
        return `${t1p1Display}/${t1p2Display} vs ${t2p1Display}/${t2p2Display}`;
      }
    } else {
      const p1Display = this.getPlayerDisplayName(match, 'player1', 'player1Name');
      const p2Display = this.getPlayerDisplayName(match, 'player2', 'player2Name');

      if (p1Display && p2Display) {
        return `${p1Display} vs ${p2Display}`;
      }
    }

    return '';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  hasUnprocessedMatches(tournament: Tournament): boolean {
    // Button is enabled if there are matches AND at least one is not processed
    return tournament.matches.length > 0 &&
           tournament.matches.some(match => !match.pointsProcessed);
  }
}
