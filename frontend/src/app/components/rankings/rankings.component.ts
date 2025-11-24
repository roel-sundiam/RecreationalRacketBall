import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

interface PlayerRanking {
  _id: string;
  username: string;
  fullName: string;
  seedPoints: number;
  matchesWon: number;
  matchesPlayed: number;
  winRate: number;
  rank: number;
}

interface TournamentStats {
  totalMatches: number;
  matchesByTier: Record<string, number>;
  totalEvents: number;
  activeMembers: number;
}

interface TournamentMatch {
  matchType: 'singles' | 'doubles';
  player1?: string;
  player2?: string;
  player1Name?: string;
  player2Name?: string;
  team1Player1?: string;
  team1Player2?: string;
  team2Player1?: string;
  team2Player2?: string;
  team1Player1Name?: string;
  team1Player2Name?: string;
  team2Player1Name?: string;
  team2Player2Name?: string;
  score: string;
  winner: string;
  round: string;
  pointsProcessed: boolean;
}

interface Tournament {
  _id: string;
  name: string;
  date: string;
  status: string;
  matches: TournamentMatch[];
  createdAt: string;
}

@Component({
  selector: 'app-rankings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
    MatTableModule,
    MatProgressBarModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="page-container">
      <div class="page-content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="header-content">
            <div class="title-section">
              <button mat-icon-button (click)="goBack()" class="back-button">
                <mat-icon>arrow_back</mat-icon>
              </button>
              <div class="title-info">
                <h1 class="page-title">
                  <mat-icon>emoji_events</mat-icon>
                  Player Rankings
                </h1>
                <p class="page-subtitle">Tennis tournament rankings and statistics</p>
              </div>
            </div>
            <div class="header-actions">
              <button mat-icon-button (click)="refreshRankings()" [disabled]="loading" class="refresh-button" 
                      [class.spinning]="loading" title="Refresh rankings">
                <mat-icon>refresh</mat-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- Tournament Stats Cards -->
        <div class="stats-section" *ngIf="tournamentStats">
          <h2 class="section-title">
            <mat-icon>analytics</mat-icon>
            Tournament Statistics
          </h2>
          
          <div class="stats-grid">
            <div class="stat-card players-card">
              <div class="stat-content">
                <div class="stat-icon">
                  <mat-icon>people</mat-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ tournamentStats.activeMembers }}</div>
                  <div class="stat-label">Active Members</div>
                </div>
              </div>
            </div>
            
            <div class="stat-card matches-card">
              <div class="stat-content">
                <div class="stat-icon">
                  <mat-icon>event</mat-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-number">{{ tournamentStats.totalEvents }}</div>
                  <div class="stat-label">Tournaments</div>
                </div>
              </div>
            </div>
            
            <div class="stat-card tiers-card">
              <div class="stat-content">
                <div class="stat-breakdown">
                  <div class="tier-item">
                    <div class="tier-chip tier-100">100</div>
                    <span class="tier-count">{{ tournamentStats.matchesByTier['100'] || 0 }}</span>
                  </div>
                  <div class="tier-item">
                    <div class="tier-chip tier-250">250</div>
                    <span class="tier-count">{{ tournamentStats.matchesByTier['250'] || 0 }}</span>
                  </div>
                  <div class="tier-item">
                    <div class="tier-chip tier-500">500</div>
                    <span class="tier-count">{{ tournamentStats.matchesByTier['500'] || 0 }}</span>
                  </div>
                </div>
                <div class="stat-label">Series Matches</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="loading" class="state-card loading-card">
          <div class="state-content">
            <mat-spinner diameter="48"></mat-spinner>
            <h3>Loading rankings...</h3>
            <p>Please wait while we fetch the latest tournament data</p>
          </div>
        </div>

        <!-- Error State -->
        <div *ngIf="error && !loading" class="state-card error-card">
          <div class="state-content">
            <mat-icon class="state-icon error-icon">error_outline</mat-icon>
            <h3>Unable to Load Rankings</h3>
            <p>{{ error }}</p>
            <button mat-raised-button (click)="loadRankings()" class="retry-button">
              <mat-icon>refresh</mat-icon>
              Try Again
            </button>
          </div>
        </div>

        <!-- No Data State -->
        <div *ngIf="!loading && !error && rankings.length === 0" class="state-card no-data-card">
          <div class="state-content">
            <mat-icon class="state-icon">emoji_events</mat-icon>
            <h3>No Rankings Yet</h3>
            <p>Rankings will appear once players start participating in Open Play matches.</p>
          </div>
        </div>

        <!-- Rankings Table -->
        <div *ngIf="!loading && !error && rankings.length > 0" class="rankings-section">
          <div class="rankings-card">
            <div class="card-header">
              <div class="header-content">
                <div class="header-info">
                  <h2 class="card-title">Current Rankings</h2>
                  <p class="card-subtitle">Member rankings based on participation in Open Play events</p>
                </div>
                <div class="header-chips">
                  <div class="legend-chip tier-100">100</div>
                  <div class="legend-chip tier-250">250</div>
                  <div class="legend-chip tier-500">500</div>
                </div>
              </div>
            </div>
            
            <div class="card-content">
              <div class="table-scroll-container">
                <div class="rankings-table">
                  <div class="table-header">
                    <div class="rank-col">Rank</div>
                    <div class="player-col">Player</div>
                    <div class="points-col">Points</div>
                    <div class="stats-col">Record</div>
                  </div>

            <div 
              *ngFor="let player of rankings; trackBy: trackPlayer"
              class="table-row"
              [class.current-user]="player._id === currentUserId"
              [class.top-3]="player.rank <= 3">
              
              <div class="rank-col">
                <div class="rank-display" [class]="'rank-' + player.rank">
                  <mat-icon *ngIf="player.rank === 1" class="trophy gold">emoji_events</mat-icon>
                  <mat-icon *ngIf="player.rank === 2" class="trophy silver">emoji_events</mat-icon>
                  <mat-icon *ngIf="player.rank === 3" class="trophy bronze">emoji_events</mat-icon>
                  <span *ngIf="player.rank > 3" class="rank-number">#{{ player.rank }}</span>
                </div>
              </div>

              <div class="player-col">
                <div class="player-info">
                  <div class="player-name">{{ player.fullName }}</div>
                  <div class="player-username">@{{ player.username }}</div>
                </div>
              </div>

              <div class="points-col">
                <div class="points-display">
                  <span class="points-value">{{ player.seedPoints }}</span>
                  <span class="points-label">pts</span>
                </div>
              </div>

              <div class="stats-col">
                <div class="stats-display">
                  <span class="wins">{{ player.matchesWon }}W</span>
                  <span class="separator">-</span>
                  <span class="total">{{ player.matchesPlayed }}P</span>
                  <span class="win-rate" *ngIf="player.winRate > 0">({{ (player.winRate * 100).toFixed(0) }}%)</span>
                </div>
              </div>

                  </div>
                </div>
              </div>

              <div *ngIf="rankings.length >= currentLimit" class="load-more-section">
                <button mat-stroked-button (click)="loadMoreRankings()" [disabled]="loadingMore" class="load-more-button">
                  <mat-icon *ngIf="!loadingMore">expand_more</mat-icon>
                  <mat-spinner *ngIf="loadingMore" diameter="20"></mat-spinner>
                  {{ loadingMore ? 'Loading...' : 'Show More Players' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Tournament Matches Section -->
        <div *ngIf="!loadingTournaments" class="tournaments-section">
          <div class="section-header">
            <h2 class="section-title">
              <mat-icon>emoji_events</mat-icon>
              Tournament Matches
            </h2>
          </div>

          <div *ngIf="tournaments.length === 0" class="no-tournaments">
            <mat-icon>sports_tennis</mat-icon>
            <p>No tournaments have been created yet.</p>
          </div>

          <div *ngFor="let tournament of tournaments" class="tournament-card">
            <div class="tournament-header">
              <div class="tournament-info">
                <h3 class="tournament-name">{{ tournament.name }}</h3>
                <p class="tournament-date">{{ tournament.date | date:'mediumDate' }}</p>
              </div>
              <div class="tournament-badge" [class]="tournament.status">
                {{ tournament.status }}
              </div>
            </div>

            <div class="matches-list">
              <div *ngFor="let match of tournament.matches; let i = index" class="match-card">
                <div class="match-header">
                  <span class="match-round">{{ match.round }}</span>
                  <span class="match-type-badge">{{ match.matchType }}</span>
                </div>

                <div class="match-content">
                  <!-- Singles Match -->
                  <div *ngIf="match.matchType === 'singles'" class="match-players">
                    <div class="player" [class.winner]="isWinner(match, 'player1')">
                      <span class="player-name">{{ getPlayerName(match, 'player1') }}</span>
                      <mat-icon *ngIf="isWinner(match, 'player1')" class="trophy-icon">emoji_events</mat-icon>
                    </div>
                    <div class="match-score">
                      <span class="score-text">{{ getFormattedScore(match) }}</span>
                    </div>
                    <div class="player" [class.winner]="isWinner(match, 'player2')">
                      <span class="player-name">{{ getPlayerName(match, 'player2') }}</span>
                      <mat-icon *ngIf="isWinner(match, 'player2')" class="trophy-icon">emoji_events</mat-icon>
                    </div>
                  </div>

                  <!-- Doubles Match -->
                  <div *ngIf="match.matchType === 'doubles'" class="match-players doubles">
                    <div class="team" [class.winner]="isWinner(match, 'team1')">
                      <div class="team-label">Team 1</div>
                      <div class="team-players">
                        <span class="player-name">{{ getPlayerName(match, 'team1Player1') }}</span>
                        <span class="player-separator">&</span>
                        <span class="player-name">{{ getPlayerName(match, 'team1Player2') }}</span>
                      </div>
                      <mat-icon *ngIf="isWinner(match, 'team1')" class="trophy-icon">emoji_events</mat-icon>
                    </div>
                    <div class="match-score">
                      <span class="score-text">{{ getFormattedScore(match) }}</span>
                    </div>
                    <div class="team" [class.winner]="isWinner(match, 'team2')">
                      <div class="team-label">Team 2</div>
                      <div class="team-players">
                        <span class="player-name">{{ getPlayerName(match, 'team2Player1') }}</span>
                        <span class="player-separator">&</span>
                        <span class="player-name">{{ getPlayerName(match, 'team2Player2') }}</span>
                      </div>
                      <mat-icon *ngIf="isWinner(match, 'team2')" class="trophy-icon">emoji_events</mat-icon>
                    </div>
                  </div>
                </div>

                <div class="match-footer" *ngIf="match.pointsProcessed">
                  <mat-icon class="check-icon">check_circle</mat-icon>
                  <span>Points Processed</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- My Stats Card -->
        <div *ngIf="currentUserStats && !loading" class="my-stats-section">
          <div class="my-stats-card">
            <div class="card-header">
              <div class="header-icon">
                <mat-icon>account_circle</mat-icon>
              </div>
              <div class="header-text">
                <h2 class="card-title">Your Statistics</h2>
                <p class="card-subtitle">Personal performance overview</p>
              </div>
            </div>
            
            <div class="card-content">
          <div class="my-stats-grid">
            <div class="my-stat">
              <mat-icon class="stat-icon">trophy</mat-icon>
              <div class="my-stat-value">{{ currentUserStats.rank || 'Unranked' }}</div>
              <div class="my-stat-label">Rank</div>
            </div>
          </div>
          
          <mat-divider></mat-divider>
          
          <div class="no-stats-message">
            <mat-icon>sports_tennis</mat-icon>
            <p>Rankings are based on participation in Open Play events. Join an event to see your ranking!</p>
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './rankings.component.scss'
})
export class RankingsComponent implements OnInit {
  rankings: PlayerRanking[] = [];
  tournamentStats: TournamentStats | null = null;
  currentUserStats: any = null;
  tournaments: Tournament[] = [];
  loading = true;
  loadingMore = false;
  loadingTournaments = false;
  error: string | null = null;
  currentLimit = 50;
  currentUserId: string | null = null;

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.currentUserId = this.authService.currentUser?._id || null;
  }

  ngOnInit(): void {
    this.loadRankings();
    this.loadTournamentStats();
    this.loadCurrentUserStats();
    this.loadTournaments();
  }

  loadTournaments(): void {
    this.loadingTournaments = true;

    this.http.get<any>(`${this.apiUrl}/tournaments?populate=true`).subscribe({
      next: (response) => {
        if (response.success) {
          this.tournaments = response.data || [];
          // Debug: Log first tournament's first match to see the structure
          if (this.tournaments.length > 0 && this.tournaments[0].matches.length > 0) {
            console.log('Sample match data:', this.tournaments[0].matches[0]);
          }
        }
        this.loadingTournaments = false;
      },
      error: (error) => {
        console.error('Error loading tournaments:', error);
        this.loadingTournaments = false;
      }
    });
  }

  getPlayerName(match: any, playerKey: string): string {
    // Check for custom name field first (non-member)
    const nameKey = `${playerKey}Name`;
    const playerName = match[nameKey];

    // Debug logging
    console.log(`Getting player name for key: ${playerKey}`);
    console.log(`  - Custom name (${nameKey}):`, playerName);
    console.log(`  - Player object (${playerKey}):`, match[playerKey]);

    if (playerName && playerName.trim()) {
      return String(playerName).trim();
    }

    // Check for populated member object
    const playerObj = match[playerKey];
    if (playerObj && typeof playerObj === 'object') {
      return playerObj.fullName || playerObj.username || 'Unknown Member';
    }

    return 'Unknown Player';
  }

  isWinner(match: TournamentMatch, identifier: string): boolean {
    return match.winner === identifier;
  }

  getFormattedScore(match: TournamentMatch): string {
    if (!match.score) return '';

    // Score is stored as "winner-score - loser-score" (e.g., "4-0")
    // We need to display it as "team1/player1-score - team2/player2-score"
    const scoreParts = match.score.split('-').map(s => s.trim());
    if (scoreParts.length !== 2) return match.score;

    const [score1, score2] = scoreParts;

    // If team2/player2 won, we need to reverse the score
    if (match.matchType === 'doubles') {
      if (match.winner === 'team2') {
        return `${score2}-${score1}`;
      }
    } else if (match.matchType === 'singles') {
      if (match.winner === 'player2') {
        return `${score2}-${score1}`;
      }
    }

    // If team1/player1 won, score is already correct
    return match.score;
  }

  loadRankings(): void {
    this.loading = true;
    this.error = null;

    this.http.get<any>(`${this.apiUrl}/seeding/rankings?limit=${this.currentLimit}`).subscribe({
      next: (response) => {
        if (response.success) {
          // Filter out players with 0 seed points
          this.rankings = (response.data.rankings || []).filter((player: any) => player.seedPoints > 0);
        } else {
          this.error = response.message || 'Failed to load rankings';
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading rankings:', error);
        this.error = error.error?.message || 'Failed to load rankings';
        this.loading = false;
      }
    });
  }

  loadTournamentStats(): void {
    this.http.get<any>(`${this.apiUrl}/seeding/tournament-stats`).subscribe({
      next: (response) => {
        if (response.success) {
          this.tournamentStats = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading tournament stats:', error);
      }
    });
  }

  loadCurrentUserStats(): void {
    if (!this.currentUserId) return;
    
    this.http.get<any>(`${this.apiUrl}/seeding/my-stats`).subscribe({
      next: (response) => {
        if (response.success) {
          this.currentUserStats = response.data;
        }
      },
      error: (error) => {
        console.log('Current user has no seeding stats yet (no matches played)');
        // Create default stats for display
        if (this.authService.currentUser) {
          this.currentUserStats = {
            user: {
              ...this.authService.currentUser
            },
            rank: null,
            totalPlayers: this.rankings.length
          };
        }
      }
    });
  }

  loadMoreRankings(): void {
    this.loadingMore = true;
    this.currentLimit += 50;
    
    this.http.get<any>(`${this.apiUrl}/seeding/rankings?limit=${this.currentLimit}`).subscribe({
      next: (response) => {
        if (response.success) {
          this.rankings = response.data.rankings || [];
        }
        this.loadingMore = false;
      },
      error: (error) => {
        console.error('Error loading more rankings:', error);
        this.loadingMore = false;
      }
    });
  }

  refreshRankings(): void {
    this.loadRankings();
    this.loadTournamentStats();
    this.loadCurrentUserStats();
  }

  trackPlayer(index: number, player: PlayerRanking): string {
    return player._id;
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

}