// Tournament-related type definitions for Jugger Tournament App

import type { JuggerPosition, TournamentFormat } from './enums';
import type { Match } from './match';

// TournamentFormat is imported from './enums'

export interface TournamentSettings {
  maxTeams: number;
  matchDuration: number; // in stones (default: 100)
  stoneInterval: number; // in seconds (default: 2.1)
  allowQwik: boolean;
  timeoutDuration: number; // in seconds
  maxTimeouts: number;
}

export interface Tournament {
  id: string;
  name: string;
  description?: string;
  format: TournamentFormat;
  teams: Team[];
  matches: Match[];
  settings: TournamentSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  logo?: string;
  players: Player[];
  stats: TeamStats;
}

export interface Player {
  id: string;
  name: string;
  position?: JuggerPosition;
  isActive: boolean;
}

export interface TeamStats {
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  totalStones: number;
  averageStones: number;
  winRate: number;
}

// JuggerPosition is imported from './enums'