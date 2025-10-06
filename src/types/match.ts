// Match-related type definitions for Jugger Tournament App

import type { JuggerTimer } from './jugger';
import type { GameEventType, MatchStatus, TeamSide } from './enums';

// MatchStatus is imported from './enums'

// GameEventType is imported from './enums'

// TeamSide is imported from './enums'

export interface MatchSettings {
  maxStones: number; // default: 100
  stoneInterval: number; // in seconds, default: 2.1
  allowQwik: boolean;
  enableTimeouts: boolean;
  maxTimeouts: number;
  timeoutDuration: number; // in seconds
}

// JuggerTimer is imported from './jugger'

export interface MatchScore {
  home: number;
  away: number;
}

export interface Match {
  id: string;
  tournamentId: string;
  homeTeam: Team;
  awayTeam: Team;
  score: MatchScore;
  timer: JuggerTimer;
  status: MatchStatus;
  events: GameEvent[];
  settings: MatchSettings;
  referee?: string; // referee device/user ID
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface GameEvent {
  id: string;
  matchId: string;
  type: GameEventType;
  team?: TeamSide;
  timestamp: Date;
  stoneCount: number; // stone count when event occurred
  data: Record<string, any>;
  description?: string;
}

// Import Team interface from tournament types
import type { Team } from './tournament';