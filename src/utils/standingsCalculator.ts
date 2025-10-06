// Tournament standings calculation utilities

import type { Team } from '../types/tournament';
import type { Match } from '../types/match';
import type { TournamentStandings } from '../types/bracket';
import { MatchStatus } from '../types/enums';

export class StandingsCalculator {
  /**
   * Calculate tournament standings from completed matches
   */
  static calculateStandings(teams: Team[], matches: Match[]): TournamentStandings[] {
    const completedMatches = matches.filter(match => match.status === MatchStatus.COMPLETED);
    
    // Initialize standings for each team
    const standingsMap = new Map<string, TournamentStandings>();
    
    teams.forEach((team, index) => {
      standingsMap.set(team.id, {
        position: index + 1, // Will be recalculated
        team,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        stonesFor: 0,
        stonesAgainst: 0,
        stoneDifference: 0,
        winPercentage: 0,
        points: 0
      });
    });

    // Process completed matches
    completedMatches.forEach(match => {
      const homeTeamStanding = standingsMap.get(match.homeTeam.id);
      const awayTeamStanding = standingsMap.get(match.awayTeam.id);
      
      if (!homeTeamStanding || !awayTeamStanding) return;

      // Update matches played
      homeTeamStanding.matchesPlayed++;
      awayTeamStanding.matchesPlayed++;

      // Update stones for/against
      homeTeamStanding.stonesFor += match.score.home;
      homeTeamStanding.stonesAgainst += match.score.away;
      awayTeamStanding.stonesFor += match.score.away;
      awayTeamStanding.stonesAgainst += match.score.home;

      // Determine winner and update records
      if (match.score.home > match.score.away) {
        // Home team wins
        homeTeamStanding.matchesWon++;
        homeTeamStanding.points += 3; // 3 points for a win
        awayTeamStanding.matchesLost++;
      } else if (match.score.away > match.score.home) {
        // Away team wins
        awayTeamStanding.matchesWon++;
        awayTeamStanding.points += 3; // 3 points for a win
        homeTeamStanding.matchesLost++;
      } else {
        // Draw (if applicable in Jugger rules)
        homeTeamStanding.points += 1; // 1 point for a draw
        awayTeamStanding.points += 1; // 1 point for a draw
      }
    });

    // Calculate derived statistics
    const standings = Array.from(standingsMap.values()).map(standing => ({
      ...standing,
      stoneDifference: standing.stonesFor - standing.stonesAgainst,
      winPercentage: standing.matchesPlayed > 0 
        ? standing.matchesWon / standing.matchesPlayed 
        : 0
    }));

    // Sort standings by points, then by stone difference, then by stones for
    standings.sort((a, b) => {
      if (a.points !== b.points) {
        return b.points - a.points; // Higher points first
      }
      if (a.stoneDifference !== b.stoneDifference) {
        return b.stoneDifference - a.stoneDifference; // Better stone difference first
      }
      return b.stonesFor - a.stonesFor; // More stones scored first
    });

    // Update positions
    standings.forEach((standing, index) => {
      standing.position = index + 1;
    });

    return standings;
  }

  /**
   * Calculate head-to-head record between two teams
   */
  static calculateHeadToHead(team1: Team, team2: Team, matches: Match[]): {
    team1Wins: number;
    team2Wins: number;
    draws: number;
    team1StonesFor: number;
    team1StonesAgainst: number;
    team2StonesFor: number;
    team2StonesAgainst: number;
  } {
    const headToHeadMatches = matches.filter(match => 
      match.status === MatchStatus.COMPLETED &&
      ((match.homeTeam.id === team1.id && match.awayTeam.id === team2.id) ||
       (match.homeTeam.id === team2.id && match.awayTeam.id === team1.id))
    );

    let team1Wins = 0;
    let team2Wins = 0;
    let draws = 0;
    let team1StonesFor = 0;
    let team1StonesAgainst = 0;
    let team2StonesFor = 0;
    let team2StonesAgainst = 0;

    headToHeadMatches.forEach(match => {
      const isTeam1Home = match.homeTeam.id === team1.id;
      const team1Score = isTeam1Home ? match.score.home : match.score.away;
      const team2Score = isTeam1Home ? match.score.away : match.score.home;

      team1StonesFor += team1Score;
      team1StonesAgainst += team2Score;
      team2StonesFor += team2Score;
      team2StonesAgainst += team1Score;

      if (team1Score > team2Score) {
        team1Wins++;
      } else if (team2Score > team1Score) {
        team2Wins++;
      } else {
        draws++;
      }
    });

    return {
      team1Wins,
      team2Wins,
      draws,
      team1StonesFor,
      team1StonesAgainst,
      team2StonesFor,
      team2StonesAgainst
    };
  }

  /**
   * Get team's form (last N matches)
   */
  static getTeamForm(team: Team, matches: Match[], lastN: number = 5): ('W' | 'L' | 'D')[] {
    const teamMatches = matches
      .filter(match => 
        match.status === MatchStatus.COMPLETED &&
        (match.homeTeam.id === team.id || match.awayTeam.id === team.id)
      )
      .sort((a, b) => new Date(b.completedAt || b.updatedAt).getTime() - 
                     new Date(a.completedAt || a.updatedAt).getTime())
      .slice(0, lastN);

    return teamMatches.map(match => {
      const isHome = match.homeTeam.id === team.id;
      const teamScore = isHome ? match.score.home : match.score.away;
      const opponentScore = isHome ? match.score.away : match.score.home;

      if (teamScore > opponentScore) return 'W';
      if (teamScore < opponentScore) return 'L';
      return 'D';
    });
  }

  /**
   * Calculate tournament statistics
   */
  static calculateTournamentStats(matches: Match[]): {
    totalMatches: number;
    completedMatches: number;
    totalStones: number;
    averageStonesPerMatch: number;
    highestScoringMatch: Match | null;
    mostLopsidedMatch: Match | null;
  } {
    const completedMatches = matches.filter(match => match.status === MatchStatus.COMPLETED);
    const totalMatches = matches.length;
    
    let totalStones = 0;
    let highestScoringMatch: Match | null = null;
    let mostLopsidedMatch: Match | null = null;
    let highestTotalScore = 0;
    let largestMargin = 0;

    completedMatches.forEach(match => {
      const matchTotal = match.score.home + match.score.away;
      const margin = Math.abs(match.score.home - match.score.away);
      
      totalStones += matchTotal;
      
      if (matchTotal > highestTotalScore) {
        highestTotalScore = matchTotal;
        highestScoringMatch = match;
      }
      
      if (margin > largestMargin) {
        largestMargin = margin;
        mostLopsidedMatch = match;
      }
    });

    return {
      totalMatches,
      completedMatches: completedMatches.length,
      totalStones,
      averageStonesPerMatch: completedMatches.length > 0 ? totalStones / completedMatches.length : 0,
      highestScoringMatch,
      mostLopsidedMatch
    };
  }
}