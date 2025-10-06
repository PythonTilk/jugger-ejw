// Bracket-related type definitions for tournament progression

import type { Match } from './match';
import type { Team } from './tournament';
import type { TournamentFormat } from './enums';

export interface BracketNode {
  id: string;
  round: number;
  position: number;
  match?: Match;
  team1?: Team;
  team2?: Team;
  winner?: Team;
  nextMatchId?: string;
  previousMatch1Id?: string;
  previousMatch2Id?: string;
}

export interface BracketRound {
  round: number;
  name: string;
  matches: BracketNode[];
}

export interface Bracket {
  id: string;
  tournamentId: string;
  format: TournamentFormat;
  rounds: BracketRound[];
  finalMatch?: BracketNode;
  thirdPlaceMatch?: BracketNode; // For double elimination
  winner?: Team;
  runnerUp?: Team;
  thirdPlace?: Team;
}

export interface TournamentStandings {
  position: number;
  team: Team;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  stonesFor: number;
  stonesAgainst: number;
  stoneDifference: number;
  winPercentage: number;
  points: number; // Tournament points (3 for win, 1 for draw, 0 for loss)
}

export interface BracketGenerationOptions {
  format: TournamentFormat;
  teams: Team[];
  seedingMethod: 'random' | 'manual' | 'ranking';
  includeThirdPlace?: boolean;
}