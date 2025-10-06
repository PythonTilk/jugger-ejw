// Bracket generation utilities for tournament management

import type { Team } from '../types/tournament';
import type { Match } from '../types/match';
import type { Bracket, BracketNode, BracketRound, BracketGenerationOptions } from '../types/bracket';
import { TournamentFormat, MatchStatus } from '../types/enums';

export class BracketGenerator {
  /**
   * Generate a tournament bracket based on format and teams
   */
  static generateBracket(options: BracketGenerationOptions): Bracket {
    const { format, teams, seedingMethod, includeThirdPlace = false } = options;
    
    if (teams.length < 2) {
      throw new Error('At least 2 teams are required to generate a bracket');
    }

    const seededTeams = this.seedTeams(teams, seedingMethod);
    
    switch (format) {
      case TournamentFormat.SINGLE_ELIMINATION:
        return this.generateSingleElimination(seededTeams, includeThirdPlace);
      case TournamentFormat.DOUBLE_ELIMINATION:
        return this.generateDoubleElimination(seededTeams);
      case TournamentFormat.ROUND_ROBIN:
        return this.generateRoundRobin(seededTeams);
      default:
        throw new Error(`Unsupported tournament format: ${format}`);
    }
  }

  /**
   * Seed teams based on the specified method
   */
  private static seedTeams(teams: Team[], method: 'random' | 'manual' | 'ranking'): Team[] {
    switch (method) {
      case 'random':
        return [...teams].sort(() => Math.random() - 0.5);
      case 'ranking':
        // Sort by win rate, then by stone difference
        return [...teams].sort((a, b) => {
          if (a.stats.winRate !== b.stats.winRate) {
            return b.stats.winRate - a.stats.winRate;
          }
          return (b.stats.totalStones - a.stats.totalStones);
        });
      case 'manual':
      default:
        return [...teams];
    }
  }

  /**
   * Generate single elimination bracket
   */
  private static generateSingleElimination(teams: Team[], includeThirdPlace: boolean): Bracket {
    const bracketId = `bracket-${Date.now()}`;
    const tournamentId = `tournament-${Date.now()}`;
    
    // Calculate number of rounds needed
    const numTeams = teams.length;
    const numRounds = Math.ceil(Math.log2(numTeams));
    const bracketSize = Math.pow(2, numRounds);
    
    // Create bracket structure
    const rounds: BracketRound[] = [];
    
    // Generate first round
    const firstRoundMatches = this.createFirstRoundMatches(teams, bracketSize);
    rounds.push({
      round: 1,
      name: numRounds === 1 ? 'Final' : `Round 1`,
      matches: firstRoundMatches
    });
    
    // Generate subsequent rounds
    for (let round = 2; round <= numRounds; round++) {
      const roundName = this.getRoundName(round, numRounds);
      const roundMatches = this.createSubsequentRoundMatches(round, rounds[round - 2].matches);
      rounds.push({
        round,
        name: roundName,
        matches: roundMatches
      });
    }
    
    const bracket: Bracket = {
      id: bracketId,
      tournamentId,
      format: TournamentFormat.SINGLE_ELIMINATION,
      rounds,
      finalMatch: rounds[rounds.length - 1]?.matches[0]
    };
    
    // Add third place match if requested
    if (includeThirdPlace && numRounds > 1) {
      const semifinalRound = rounds[rounds.length - 2];
      if (semifinalRound && semifinalRound.matches.length >= 2) {
        bracket.thirdPlaceMatch = this.createThirdPlaceMatch(semifinalRound.matches);
      }
    }
    
    return bracket;
  }

  /**
   * Generate double elimination bracket
   */
  private static generateDoubleElimination(teams: Team[]): Bracket {
    // Simplified double elimination - would need more complex logic for full implementation
    const bracket = this.generateSingleElimination(teams, false);
    bracket.format = TournamentFormat.DOUBLE_ELIMINATION;
    
    // TODO: Implement full double elimination logic with winners and losers brackets
    
    return bracket;
  }

  /**
   * Generate round robin bracket
   */
  private static generateRoundRobin(teams: Team[]): Bracket {
    const bracketId = `bracket-${Date.now()}`;
    const tournamentId = `tournament-${Date.now()}`;
    const numTeams = teams.length;
    const numRounds = numTeams - 1;
    
    const rounds: BracketRound[] = [];
    
    // Generate round robin schedule
    for (let round = 1; round <= numRounds; round++) {
      const matches: BracketNode[] = [];
      
      for (let i = 0; i < Math.floor(numTeams / 2); i++) {
        const team1Index = i;
        const team2Index = numTeams - 1 - i;
        
        // Rotate teams (except first team stays fixed)
        const rotatedTeam1Index = team1Index === 0 ? 0 : (team1Index + round - 1) % (numTeams - 1) + 1;
        const rotatedTeam2Index = team2Index === 0 ? 0 : (team2Index + round - 1) % (numTeams - 1) + 1;
        
        if (rotatedTeam1Index < teams.length && rotatedTeam2Index < teams.length) {
          matches.push({
            id: `match-r${round}-${i}`,
            round,
            position: i,
            team1: teams[rotatedTeam1Index],
            team2: teams[rotatedTeam2Index]
          });
        }
      }
      
      rounds.push({
        round,
        name: `Round ${round}`,
        matches
      });
    }
    
    return {
      id: bracketId,
      tournamentId,
      format: TournamentFormat.ROUND_ROBIN,
      rounds
    };
  }

  /**
   * Create first round matches with proper seeding
   */
  private static createFirstRoundMatches(teams: Team[], bracketSize: number): BracketNode[] {
    const matches: BracketNode[] = [];
    const paddedTeams = [...teams];
    
    // Add byes if needed
    while (paddedTeams.length < bracketSize) {
      paddedTeams.push(null as any); // Bye
    }
    
    // Create matches with proper seeding
    for (let i = 0; i < bracketSize / 2; i++) {
      const team1 = paddedTeams[i];
      const team2 = paddedTeams[bracketSize - 1 - i];
      
      matches.push({
        id: `match-r1-${i}`,
        round: 1,
        position: i,
        team1: team1 || undefined,
        team2: team2 || undefined,
        winner: !team2 ? team1 : undefined // Auto-advance if bye
      });
    }
    
    return matches;
  }

  /**
   * Create matches for subsequent rounds
   */
  private static createSubsequentRoundMatches(round: number, previousMatches: BracketNode[]): BracketNode[] {
    const matches: BracketNode[] = [];
    
    for (let i = 0; i < previousMatches.length / 2; i++) {
      const match1 = previousMatches[i * 2];
      const match2 = previousMatches[i * 2 + 1];
      
      matches.push({
        id: `match-r${round}-${i}`,
        round,
        position: i,
        previousMatch1Id: match1.id,
        previousMatch2Id: match2.id,
        team1: match1.winner,
        team2: match2.winner
      });
    }
    
    return matches;
  }

  /**
   * Create third place match
   */
  private static createThirdPlaceMatch(semifinalMatches: BracketNode[]): BracketNode {
    return {
      id: 'third-place-match',
      round: -1, // Special round for third place
      position: 0,
      previousMatch1Id: semifinalMatches[0]?.id,
      previousMatch2Id: semifinalMatches[1]?.id
      // Teams will be the losers of semifinal matches
    };
  }

  /**
   * Get round name based on position
   */
  private static getRoundName(round: number, totalRounds: number): string {
    const roundsFromEnd = totalRounds - round + 1;
    
    switch (roundsFromEnd) {
      case 1:
        return 'Final';
      case 2:
        return 'Semifinal';
      case 3:
        return 'Quarterfinal';
      case 4:
        return 'Round of 16';
      case 5:
        return 'Round of 32';
      default:
        return `Round ${round}`;
    }
  }

  /**
   * Update bracket with match results
   */
  static updateBracketWithResult(bracket: Bracket, matchId: string, winner: Team): Bracket {
    const updatedBracket = { ...bracket };
    
    // Find and update the match
    for (const round of updatedBracket.rounds) {
      const match = round.matches.find(m => m.match?.id === matchId);
      if (match) {
        match.winner = winner;
        
        // Advance winner to next round
        this.advanceWinner(updatedBracket, match, winner);
        break;
      }
    }
    
    return updatedBracket;
  }

  /**
   * Advance winner to next round
   */
  private static advanceWinner(bracket: Bracket, completedMatch: BracketNode, winner: Team): void {
    if (!completedMatch.nextMatchId) return;
    
    // Find next match and set the winner as a participant
    for (const round of bracket.rounds) {
      const nextMatch = round.matches.find(m => m.id === completedMatch.nextMatchId);
      if (nextMatch) {
        if (nextMatch.previousMatch1Id === completedMatch.id) {
          nextMatch.team1 = winner;
        } else if (nextMatch.previousMatch2Id === completedMatch.id) {
          nextMatch.team2 = winner;
        }
        break;
      }
    }
  }
}