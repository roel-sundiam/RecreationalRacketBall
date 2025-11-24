import User from '../models/User';
import Reservation from '../models/Reservation';
import Poll from '../models/Poll';
import SeedingPoint from '../models/SeedingPoint';
import Tournament from '../models/Tournament';
import { PlayerRanking, PlayerStats, MatchResult } from '../types';

export class SeedingService {
  // Point values for each tournament tier
  private static readonly POINT_VALUES = {
    '100': { winner: 10, participant: 5 },
    '250': { winner: 25, participant: 15 },
    '500': { winner: 50, participant: 30 }
  };

  /**
   * Process match results and award points to players
   */
  static async processMatchResults(reservationId: string, matchResults: MatchResult[]): Promise<void> {
    try {
      // Get the reservation to determine tournament tier
      const reservation = await Reservation.findById(reservationId);
      if (!reservation) {
        throw new Error('Reservation not found');
      }

      if (reservation.pointsProcessed) {
        throw new Error('Points have already been processed for this reservation');
      }

      const tierPoints = this.POINT_VALUES[reservation.tournamentTier];
      
      // Process each match result
      for (const match of matchResults) {
        await this.awardPointsForMatch(match, tierPoints, reservation.tournamentTier);
      }

      // Mark reservation as points processed
      reservation.matchResults = matchResults;
      reservation.pointsProcessed = true;
      await reservation.save({ validateBeforeSave: false });

    } catch (error) {
      console.error('Error processing match results:', error);
      throw error;
    }
  }

  /**
   * Award points for a single match
   */
  private static async awardPointsForMatch(
    match: MatchResult,
    tierPoints: { winner: number; participant: number },
    tournamentTier: string
  ): Promise<void> {
    const { winnerId, participants } = match;

    // Award winner points
    await User.findByIdAndUpdate(
      winnerId,
      {
        $inc: {
          seedPoints: tierPoints.winner,
          matchesWon: 1,
          matchesPlayed: 1
        }
      }
    );

    // Award participation points to other players
    const otherParticipants = participants.filter(p => p !== winnerId);
    for (const participantId of otherParticipants) {
      await User.findByIdAndUpdate(
        participantId,
        {
          $inc: {
            seedPoints: tierPoints.participant,
            matchesPlayed: 1
          }
        }
      );
    }

    console.log(`📊 Points awarded - Tier ${tournamentTier}: Winner ${winnerId} (+${tierPoints.winner}), ${otherParticipants.length} participants (+${tierPoints.participant} each)`);
  }

  /**
   * Get current player rankings
   */
  static async getRankings(limit: number = 50): Promise<PlayerRanking[]> {
    try {
      console.log(`🔍 DEBUGGING: Getting rankings with limit: ${limit}`);
      
      const users = await User.find({
        isActive: true,
        isApproved: true,
        role: { $in: ['member', 'admin'] }
      })
      .select('username fullName seedPoints matchesWon matchesPlayed')
      .sort({ seedPoints: -1, matchesWon: -1, username: 1 })
      .limit(limit);

      console.log(`🔍 DEBUGGING: Found ${users.length} active approved users`);
      console.log(`🔍 DEBUGGING: Users with points:`, users.filter(u => u.seedPoints > 0).map(u => ({
        name: u.fullName || u.username,
        points: u.seedPoints,
        wins: u.matchesWon,
        played: u.matchesPlayed
      })));

      const rankings = users.map((user, index) => ({
        _id: user._id.toString(),
        username: user.username,
        fullName: user.fullName,
        seedPoints: user.seedPoints,
        matchesWon: user.matchesWon,
        matchesPlayed: user.matchesPlayed,
        winRate: user.matchesPlayed > 0 ? Math.round((user.matchesWon / user.matchesPlayed) * 100) / 100 : 0,
        rank: index + 1
      }));

      console.log(`🔍 DEBUGGING: Returning ${rankings.length} rankings`);
      return rankings;
    } catch (error) {
      console.error('Error getting rankings:', error);
      throw error;
    }
  }

  /**
   * Get detailed stats for a specific player
   */
  static async getPlayerStats(userId: string): Promise<PlayerStats | null> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.isActive || !user.isApproved) {
        return null;
      }

      // Get player's rank
      const allRankings = await this.getRankings(1000); // Get all players for accurate ranking
      const playerRanking = allRankings.find(r => r._id === userId);
      
      // If player is not in rankings (no matches played), create default stats
      if (!playerRanking) {
        return {
          user: {
            ...user.toObject(),
            _id: user._id.toString()
          },
          rank: 0, // Unranked
          totalPlayers: allRankings.length,
          recentMatches: []
        };
      }

      // Get recent match history
      const recentReservations = await Reservation.find({
        $or: [
          { userId: userId },
          { 'matchResults.winnerId': userId },
          { 'matchResults.participants': userId }
        ],
        status: 'completed',
        pointsProcessed: true
      })
      .sort({ date: -1 })
      .limit(10)
      .populate('userId', 'username fullName');

      const recentMatches = [];
      for (const reservation of recentReservations) {
        if (reservation.matchResults) {
          for (const match of reservation.matchResults) {
            if (match.participants.includes(userId)) {
              const tierPoints = this.POINT_VALUES[reservation.tournamentTier];
              const isWinner = match.winnerId === userId;
              const opponents = match.participants.filter(p => p !== userId);
              
              recentMatches.push({
                date: reservation.date,
                tournamentTier: reservation.tournamentTier,
                result: isWinner ? 'won' as const : 'played' as const,
                points: isWinner ? tierPoints.winner : tierPoints.participant,
                opponents: opponents
              });
            }
          }
        }
      }

      return {
        user: {
          ...user.toObject(),
          _id: user._id.toString()
        },
        rank: playerRanking.rank,
        totalPlayers: allRankings.length,
        recentMatches: recentMatches.slice(0, 10)
      };
    } catch (error) {
      console.error('Error getting player stats:', error);
      throw error;
    }
  }

  /**
   * Recalculate all seed points from scratch (admin function)
   */
  static async recalculateAllPoints(): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    try {
      // Reset all user points
      await User.updateMany(
        {},
        {
          $set: {
            seedPoints: 0,
            matchesWon: 0,
            matchesPlayed: 0
          }
        }
      );

      // Get all completed reservations with match results
      const reservations = await Reservation.find({
        status: 'completed',
        matchResults: { $exists: true, $ne: [] }
      }).sort({ date: 1 });

      // Reprocess all match results
      for (const reservation of reservations) {
        try {
          if (reservation.matchResults && reservation.matchResults.length > 0) {
            const tierPoints = this.POINT_VALUES[reservation.tournamentTier];
            
            for (const match of reservation.matchResults) {
              await this.awardPointsForMatch(match, tierPoints, reservation.tournamentTier);
            }
            processed++;
          }
        } catch (error) {
          console.error(`Error reprocessing reservation ${reservation._id}:`, error);
          errors++;
        }
      }

      console.log(`🔄 Recalculation complete: ${processed} reservations processed, ${errors} errors`);
      return { processed, errors };
      
    } catch (error) {
      console.error('Error recalculating points:', error);
      throw error;
    }
  }

  /**
   * Award seeding points to a specific player
   */
  static async awardPoints(
    userId: string, 
    points: number, 
    reason: string, 
    tournamentTier: string = '100',
    pollId?: string,
    matchId?: string
  ): Promise<void> {
    try {
      console.log(`🔍 DEBUGGING: Attempting to award ${points} points to user ID: ${userId} for: ${reason}`);
      
      // First, check if user exists
      const user = await User.findById(userId);
      if (!user) {
        console.error(`❌ DEBUGGING: User with ID ${userId} not found!`);
        throw new Error(`User with ID ${userId} not found`);
      }
      
      console.log(`✅ DEBUGGING: Found user: ${user.fullName || user.username} (ID: ${userId})`);
      console.log(`🔍 DEBUGGING: User current stats - Points: ${user.seedPoints}, Wins: ${user.matchesWon}, Played: ${user.matchesPlayed}`);
      
      // Create SeedingPoint record for tracking and rankings
      const seedingPoint = new SeedingPoint({
        userId: userId,
        points: points,
        description: reason,
        tournamentTier: tournamentTier,
        pollId: pollId,
        matchId: matchId
      });
      
      await seedingPoint.save();
      console.log(`📝 DEBUGGING: Created SeedingPoint record with ${points} points`);
      
      // Update user stats
      const updateResult = await User.findByIdAndUpdate(
        userId,
        {
          $inc: {
            seedPoints: points,
            matchesWon: reason.includes('Won') ? 1 : 0,
            matchesPlayed: 1
          }
        },
        { new: true } // Return updated document
      );

      if (updateResult) {
        console.log(`📊 DEBUGGING: Points successfully awarded to ${updateResult.fullName || updateResult.username}:`);
        console.log(`   - New Points: ${updateResult.seedPoints} (+${points})`);
        console.log(`   - New Wins: ${updateResult.matchesWon}`);
        console.log(`   - New Played: ${updateResult.matchesPlayed}`);
      } else {
        console.error(`❌ DEBUGGING: Failed to update user ${userId}`);
      }

      console.log(`📊 Points awarded to ${userId}: +${points} (${reason})`);
    } catch (error) {
      console.error('❌ DEBUGGING: Error awarding points:', error);
      throw error;
    }
  }

  /**
   * Get tournament tier statistics
   */
  static async getTournamentStats(): Promise<{
    totalMatches: number;
    matchesByTier: Record<string, number>;
    totalEvents: number;
    activeMembers: number;
  }> {
    try {
      // Count all tournaments (active and completed)
      const totalEvents = await Tournament.countDocuments({
        status: { $in: ['active', 'completed'] }
      });

      // Count total matches across all tournaments
      const tournaments = await Tournament.find({
        status: { $in: ['active', 'completed'] }
      }).select('matches');

      let totalMatches = 0;
      tournaments.forEach((tournament: any) => {
        if (tournament.matches && Array.isArray(tournament.matches)) {
          totalMatches += tournament.matches.length;
        }
      });

      // Count active members
      const activeMembers = await User.countDocuments({
        isActive: true,
        isApproved: true
      });

      const matchesByTier: Record<string, number> = {
        '100': 0,
        '250': 0,
        '500': 0
      };

      return {
        totalMatches,
        matchesByTier,
        totalEvents,
        activeMembers
      };
    } catch (error) {
      console.error('Error getting tournament stats:', error);
      throw error;
    }
  }

  /**
   * Parse game score string and return winner/loser games
   * Examples: "8-6" -> { winnerGames: 8, loserGames: 6 }
   *           "10-8" -> { winnerGames: 10, loserGames: 8 }
   */
  static parseGameScore(scoreString: string): { winnerGames: number; loserGames: number } {
    // Remove whitespace and try to match score pattern
    const cleaned = scoreString?.trim();
    const match = cleaned?.match(/^(\d+)\s*-\s*(\d+)$/);

    if (match && match[1] && match[2]) {
      const num1 = parseInt(match[1] as string);
      const num2 = parseInt(match[2] as string);

      // Winner has higher score
      return {
        winnerGames: Math.max(num1, num2),
        loserGames: Math.min(num1, num2)
      };
    }

    // Default: assume close 8-6 match if score is invalid
    console.warn(`⚠️ Invalid score format: "${scoreString}", using default 8-6`);
    return { winnerGames: 8, loserGames: 6 };
  }

  /**
   * Process all matches in a tournament and award points
   */
  static async processTournamentPoints(tournamentId: string): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    try {
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      console.log(`🏆 Processing points for tournament: ${tournament.name}`);

      // Process each match
      for (let i = 0; i < tournament.matches.length; i++) {
        const match = tournament.matches[i];

        // Skip if match is undefined or already processed
        if (!match || match.pointsProcessed) {
          console.log(`⏭️ Skipping match ${i + 1} - ${!match ? 'undefined' : 'already processed'}`);
          continue;
        }

        try {
          await this.processTournamentMatch(tournamentId, i);
          processed++;
        } catch (error) {
          console.error(`Error processing match ${i + 1}:`, error);
          errors++;
        }
      }

      // Update tournament status to completed
      tournament.status = 'completed';
      await tournament.save();

      console.log(`✅ Tournament processing complete: ${processed} matches processed, ${errors} errors`);
      return { processed, errors };

    } catch (error) {
      console.error('Error processing tournament points:', error);
      throw error;
    }
  }

  /**
   * Process a single match in a tournament and award game-based points
   */
  static async processTournamentMatch(tournamentId: string, matchIndex: number): Promise<void> {
    try {
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        throw new Error('Tournament not found');
      }

      const match = tournament.matches[matchIndex];
      if (!match) {
        throw new Error(`Match ${matchIndex} not found in tournament`);
      }

      if (match.pointsProcessed) {
        console.log(`⏭️ Match ${matchIndex + 1} already processed`);
        return;
      }

      // Parse score to get games won by each player/team
      const { winnerGames, loserGames } = this.parseGameScore(match.score);

      console.log(`🎾 Processing ${match.matchType} match: ${match.score} - Winner gets ${winnerGames} pts, Loser gets ${loserGames} pts`);

      if (match.matchType === 'doubles') {
        // Doubles match - award points to all 4 players
        const winningTeam = match.winner; // "team1" or "team2"

        if (winningTeam === 'team1') {
          // Team 1 won
          if (match.team1Player1) {
            await this.awardTournamentPoints(
              match.team1Player1,
              winnerGames,
              `Tournament doubles - ${tournament.name} (${match.round}) - Won`,
              tournamentId,
              matchIndex,
              true
            );
          }
          if (match.team1Player2) {
            await this.awardTournamentPoints(
              match.team1Player2,
              winnerGames,
              `Tournament doubles - ${tournament.name} (${match.round}) - Won`,
              tournamentId,
              matchIndex,
              true
            );
          }
          // Team 2 lost
          if (match.team2Player1) {
            await this.awardTournamentPoints(
              match.team2Player1,
              loserGames,
              `Tournament doubles - ${tournament.name} (${match.round}) - Played`,
              tournamentId,
              matchIndex,
              false
            );
          }
          if (match.team2Player2) {
            await this.awardTournamentPoints(
              match.team2Player2,
              loserGames,
              `Tournament doubles - ${tournament.name} (${match.round}) - Played`,
              tournamentId,
              matchIndex,
              false
            );
          }
        } else {
          // Team 2 won
          if (match.team2Player1) {
            await this.awardTournamentPoints(
              match.team2Player1,
              winnerGames,
              `Tournament doubles - ${tournament.name} (${match.round}) - Won`,
              tournamentId,
              matchIndex,
              true
            );
          }
          if (match.team2Player2) {
            await this.awardTournamentPoints(
              match.team2Player2,
              winnerGames,
              `Tournament doubles - ${tournament.name} (${match.round}) - Won`,
              tournamentId,
              matchIndex,
              true
            );
          }
          // Team 1 lost
          if (match.team1Player1) {
            await this.awardTournamentPoints(
              match.team1Player1,
              loserGames,
              `Tournament doubles - ${tournament.name} (${match.round}) - Played`,
              tournamentId,
              matchIndex,
              false
            );
          }
          if (match.team1Player2) {
            await this.awardTournamentPoints(
              match.team1Player2,
              loserGames,
              `Tournament doubles - ${tournament.name} (${match.round}) - Played`,
              tournamentId,
              matchIndex,
              false
            );
          }
        }
      } else {
        // Singles match - award points to 2 players
        const winnerId = match.winner;
        const loserId = match.player1 === winnerId ? match.player2 : match.player1;

        if (winnerId) {
          await this.awardTournamentPoints(
            winnerId,
            winnerGames,
            `Tournament singles - ${tournament.name} (${match.round}) - Won`,
            tournamentId,
            matchIndex,
            true
          );
        }

        if (loserId) {
          await this.awardTournamentPoints(
            loserId,
            loserGames,
            `Tournament singles - ${tournament.name} (${match.round}) - Played`,
            tournamentId,
            matchIndex,
            false
          );
        }
      }

      // Mark match as processed
      match.pointsProcessed = true;
      await tournament.save();

      console.log(`✅ Match ${matchIndex + 1} processed successfully`);

    } catch (error) {
      console.error(`Error processing tournament match:`, error);
      throw error;
    }
  }

  /**
   * Reverse/undo all points for a tournament
   * Used when deleting tournaments with processed points
   */
  static async reverseTournamentPoints(tournamentId: string): Promise<{ reversed: number; errors: number }> {
    let reversed = 0;
    let errors = 0;

    try {
      console.log(`♻️ Reversing points for tournament: ${tournamentId}`);

      // Find all seeding points for this tournament
      const seedingPoints = await SeedingPoint.find({ tournamentId });

      for (const point of seedingPoints) {
        try {
          const user = await User.findById(point.userId);
          if (!user) {
            console.warn(`⚠️ User ${point.userId} not found, skipping point reversal`);
            errors++;
            continue;
          }

          // Reverse the points
          await User.findByIdAndUpdate(
            point.userId,
            {
              $inc: {
                seedPoints: -point.points,
                matchesPlayed: -1,
                matchesWon: point.isWinner ? -1 : 0
              }
            }
          );

          // Delete the seeding point record
          await SeedingPoint.deleteOne({ _id: point._id });

          console.log(`♻️ Reversed ${point.points} points from ${user.fullName || user.username}`);
          reversed++;
        } catch (error) {
          console.error(`Error reversing point:`, error);
          errors++;
        }
      }

      console.log(`✅ Reversed ${reversed} point records with ${errors} errors`);
      return { reversed, errors };
    } catch (error) {
      console.error(`Error reversing tournament points:`, error);
      throw error;
    }
  }

  /**
   * Award tournament-based points to a player
   */
  static async awardTournamentPoints(
    userId: string,
    points: number,
    description: string,
    tournamentId: string,
    matchIndex: number,
    isWinner: boolean
  ): Promise<void> {
    try {
      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Create SeedingPoint record
      const seedingPoint = new SeedingPoint({
        userId: userId,
        points: points,
        description: description,
        source: 'tournament',
        tournamentId: tournamentId,
        matchIndex: matchIndex,
        isWinner: isWinner
      });

      await seedingPoint.save();

      // Update user stats
      await User.findByIdAndUpdate(
        userId,
        {
          $inc: {
            seedPoints: points,
            matchesWon: isWinner ? 1 : 0,
            matchesPlayed: 1
          }
        }
      );

      console.log(`📊 Awarded ${points} points to ${user.fullName || user.username} (${isWinner ? 'Winner' : 'Loser'})`);

    } catch (error) {
      console.error('Error awarding tournament points:', error);
      throw error;
    }
  }
}

export default SeedingService;