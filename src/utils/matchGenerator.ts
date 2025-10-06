// Match generation utilities for tournaments
import type { Tournament, Match, Team, MatchSettings } from '../types';
import { TournamentFormat, MatchStatus } from '../types/enums';
import { DEFAULT_MATCH_SETTINGS } from '../types/constants';

export interface MatchGenerationOptions {
  generateAllMatches?: boolean;
  startFirstMatch?: boolean;
  customSettings?: Partial<MatchSettings>;
}

// Generate matches for a tournament based on format
export function generateTournamentMatches(
  tournament: Tournament,
  options: MatchGenerationOptions = {}
): Match[] {
  const { generateAllMatches = true, startFirstMatch = false, customSettings = {} } = options;
  
  switch (tournament.format) {
    case TournamentFormat.SINGLE_ELIMINATION:
      return generateSingleEliminationMatches(tournament, options);
    case TournamentFormat.DOUBLE_ELIMINATION:
      return generateDoubleEliminationMatches(tournament, options);
    case TournamentFormat.ROUND_ROBIN:
      return generateRoundRobinMatches(tournament, options);
    default:
      throw new Error(`Unsupported tournament format: ${tournament.format}`);
  }
}

// Generate single elimination bracket matches
function generateSingleEliminationMatches(
  tournament: Tournament,
  options: MatchGenerationOptions
): Match[] {
  const { teams } = tournament;
  const matches: Match[] = [];
  
  if (teams.length < 2) {
    return matches;
  }
  
  // For single elimination, we need to pair teams
  // If odd number of teams, one gets a bye
  const pairedTeams = pairTeamsForElimination(teams);
  
  // Generate first round matches
  pairedTeams.forEach((pair, index) => {
    if (pair.length === 2) {
      const match = createMatch(
        tournament.id,
        pair[0],
        pair[1],
        `R1-M${index + 1}`,
        options.customSettings
      );
      
      // Start first match if requested
      if (index === 0 && options.startFirstMatch) {
        match.status = MatchStatus.ACTIVE;
      }
      
      matches.push(match);
    }
  });
  
  // Generate subsequent rounds if requested
  if (options.generateAllMatches) {
    let currentRound = matches;
    let roundNumber = 2;
    
    while (currentRound.length > 1) {
      const nextRound: Match[] = [];
      
      for (let i = 0; i < currentRound.length; i += 2) {
        if (i + 1 < currentRound.length) {
          const match = createPlaceholderMatch(
            tournament.id,
            `R${roundNumber}-M${Math.floor(i / 2) + 1}`,
            options.customSettings
          );
          nextRound.push(match);
        }
      }
      
      matches.push(...nextRound);
      currentRound = nextRound;
      roundNumber++;
    }
  }
  
  return matches;
}

// Generate double elimination bracket matches
function generateDoubleEliminationMatches(
  tournament: Tournament,
  options: MatchGenerationOptions
): Match[] {
  const { teams } = tournament;
  const matches: Match[] = [];
  
  if (teams.length < 2) {
    return matches;
  }
  
  // Winner's bracket (same as single elimination)
  const winnersMatches = generateSingleEliminationMatches(tournament, {
    ...options,
    generateAllMatches: true
  });
  
  // Add winner's bracket prefix
  winnersMatches.forEach(match => {
    match.id = `W-${match.id}`;
  });
  
  matches.push(...winnersMatches);
  
  // Loser's bracket (more complex, simplified for now)
  if (options.generateAllMatches) {
    const losersMatches = generateLosersBracket(teams.length, tournament.id, options.customSettings);
    matches.push(...losersMatches);
    
    // Grand final
    const grandFinal = createPlaceholderMatch(
      tournament.id,
      'GRAND-FINAL',
      options.customSettings
    );
    matches.push(grandFinal);
  }
  
  return matches;
}

// Generate round robin matches
function generateRoundRobinMatches(
  tournament: Tournament,
  options: MatchGenerationOptions
): Match[] {
  const { teams } = tournament;
  const matches: Match[] = [];
  
  if (teams.length < 2) {
    return matches;
  }
  
  // Generate all possible pairings
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const match = createMatch(
        tournament.id,
        teams[i],
        teams[j],
        `RR-${i + 1}v${j + 1}`,
        options.customSettings
      );
      
      // Start first match if requested
      if (matches.length === 0 && options.startFirstMatch) {
        match.status = MatchStatus.ACTIVE;
      }
      
      matches.push(match);
    }
  }
  
  return matches;
}

// Helper function to pair teams for elimination
function pairTeamsForElimination(teams: Team[]): Team[][] {
  const pairs: Team[][] = [];
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5); // Simple shuffle
  
  for (let i = 0; i < shuffledTeams.length; i += 2) {
    if (i + 1 < shuffledTeams.length) {
      pairs.push([shuffledTeams[i], shuffledTeams[i + 1]]);
    } else {
      // Bye for odd number of teams
      pairs.push([shuffledTeams[i]]);
    }
  }
  
  return pairs;
}

// Generate simplified loser's bracket
function generateLosersBracket(
  teamCount: number,
  tournamentId: string,
  customSettings?: Partial<MatchSettings>
): Match[] {
  const matches: Match[] = [];
  
  // Simplified loser's bracket - just create placeholder matches
  const loserRounds = Math.ceil(Math.log2(teamCount)) * 2 - 1;
  
  for (let round = 1; round <= loserRounds; round++) {
    const matchesInRound = Math.max(1, Math.floor(teamCount / Math.pow(2, round)));
    
    for (let match = 1; match <= matchesInRound; match++) {
      const loserMatch = createPlaceholderMatch(
        tournamentId,
        `L-R${round}-M${match}`,
        customSettings
      );
      matches.push(loserMatch);
    }
  }
  
  return matches;
}

// Create a match with two teams
function createMatch(
  tournamentId: string,
  homeTeam: Team,
  awayTeam: Team,
  matchCode: string,
  customSettings?: Partial<MatchSettings>
): Match {
  const matchId = `match-${tournamentId}-${matchCode}-${Date.now()}`;
  
  return {
    id: matchId,
    tournamentId,
    homeTeam,
    awayTeam,
    score: { home: 0, away: 0 },
    timer: {
      stones: 0,
      seconds: 0,
      totalSeconds: 0,
      isRunning: false,
      isPaused: false,
      startedAt: undefined,
      pausedAt: undefined,
      config: {
        maxStones: 100,
        stoneIntervalMs: 2100,
        allowQwik: true,
        autoAdvanceStones: true,
      },
    },
    status: MatchStatus.PENDING,
    events: [],
    settings: { ...DEFAULT_MATCH_SETTINGS, ...customSettings },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Create a placeholder match (for future rounds)
function createPlaceholderMatch(
  tournamentId: string,
  matchCode: string,
  customSettings?: Partial<MatchSettings>
): Match {
  const matchId = `match-${tournamentId}-${matchCode}-${Date.now()}`;
  
  // Create placeholder teams
  const placeholderHome: Team = {
    id: `placeholder-home-${matchId}`,
    name: 'TBD',
    shortName: 'TBD',
    color: '#cccccc',
    players: [],
    stats: {
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      totalStones: 0,
      averageStones: 0,
      winRate: 0,
    },
  };
  
  const placeholderAway: Team = {
    id: `placeholder-away-${matchId}`,
    name: 'TBD',
    shortName: 'TBD',
    color: '#cccccc',
    players: [],
    stats: {
      matchesPlayed: 0,
      matchesWon: 0,
      matchesLost: 0,
      totalStones: 0,
      averageStones: 0,
      winRate: 0,
    },
  };
  
  return createMatch(tournamentId, placeholderHome, placeholderAway, matchCode, customSettings);
}

// Update match with actual teams (for advancing through bracket)
export function updateMatchTeams(match: Match, homeTeam: Team, awayTeam: Team): Match {
  return {
    ...match,
    homeTeam,
    awayTeam,
    updatedAt: new Date(),
  };
}

// Advance winner to next match in bracket
export function advanceWinner(
  matches: Match[],
  completedMatch: Match,
  winner: Team
): Match[] {
  // This is a simplified implementation
  // In a real tournament system, you'd need more complex bracket logic
  
  return matches.map(match => {
    // Find matches that reference this completed match
    if (match.homeTeam.name === 'TBD' || match.awayTeam.name === 'TBD') {
      // Logic to determine if this match should receive the winner
      // This would depend on the specific bracket structure
      
      if (match.homeTeam.name === 'TBD') {
        return updateMatchTeams(match, winner, match.awayTeam);
      } else if (match.awayTeam.name === 'TBD') {
        return updateMatchTeams(match, match.homeTeam, winner);
      }
    }
    
    return match;
  });
}

// Get next match for a team
export function getNextMatch(matches: Match[], team: Team): Match | null {
  return matches.find(match => 
    (match.homeTeam.id === team.id || match.awayTeam.id === team.id) &&
    match.status === MatchStatus.PENDING
  ) || null;
}

// Get matches for a specific round
export function getMatchesForRound(matches: Match[], round: number): Match[] {
  // This would need more sophisticated logic based on match naming/structure
  return matches.filter(match => match.id.includes(`R${round}`));
}

// Calculate tournament progress
export function calculateTournamentProgress(matches: Match[]): {
  totalMatches: number;
  completedMatches: number;
  activeMatches: number;
  pendingMatches: number;
  progressPercentage: number;
} {
  const totalMatches = matches.length;
  const completedMatches = matches.filter(m => m.status === MatchStatus.COMPLETED).length;
  const activeMatches = matches.filter(m => m.status === MatchStatus.ACTIVE).length;
  const pendingMatches = matches.filter(m => m.status === MatchStatus.PENDING).length;
  
  const progressPercentage = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;
  
  return {
    totalMatches,
    completedMatches,
    activeMatches,
    pendingMatches,
    progressPercentage,
  };
}