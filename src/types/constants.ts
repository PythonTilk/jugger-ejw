// Constants and default values for Jugger Tournament App

import type { 
  TournamentSettings, 
  MatchSettings, 
  JuggerTimerConfig, 
  JuggerScoringRules,
  JuggerMatchRules 
} from './index';
import { JuggerPenaltyType } from './jugger';

// Default tournament settings
export const DEFAULT_TOURNAMENT_SETTINGS: TournamentSettings = {
  maxTeams: 16,
  matchDuration: 100, // stones
  stoneInterval: 2.1, // seconds
  allowQwik: true,
  timeoutDuration: 60, // seconds
  maxTimeouts: 2
};

// Default match settings
export const DEFAULT_MATCH_SETTINGS: MatchSettings = {
  maxStones: 100,
  stoneInterval: 2.1, // seconds
  allowQwik: true,
  enableTimeouts: true,
  maxTimeouts: 2,
  timeoutDuration: 60 // seconds
};

// Default Jugger timer configuration
export const DEFAULT_JUGGER_TIMER_CONFIG: JuggerTimerConfig = {
  maxStones: 100,
  stoneIntervalMs: 2100, // 2.1 seconds in milliseconds
  allowQwik: true,
  autoAdvanceStones: false
};

// Default Jugger scoring rules
export const DEFAULT_JUGGER_SCORING_RULES: JuggerScoringRules = {
  pointsPerStone: 1,
  suddenDeath: false
};

// Default Jugger match rules
export const DEFAULT_JUGGER_MATCH_RULES: JuggerMatchRules = {
  timer: DEFAULT_JUGGER_TIMER_CONFIG,
  scoring: DEFAULT_JUGGER_SCORING_RULES,
  timeouts: {
    enabled: true,
    maxPerTeam: 2,
    durationSeconds: 60
  },
  penalties: {
    enabled: true,
    types: [
      JuggerPenaltyType.EARLY_START, 
      JuggerPenaltyType.WEAPON_CONTACT, 
      JuggerPenaltyType.EXCESSIVE_FORCE, 
      JuggerPenaltyType.UNSPORTSMANLIKE, 
      JuggerPenaltyType.EQUIPMENT_VIOLATION
    ]
  }
};

// Jugger sport constants
export const JUGGER_SPORT_CONSTANTS = {
  // Standard timing
  STANDARD_STONES: 100,
  STONE_INTERVAL_SECONDS: 2.1,
  STONE_INTERVAL_MS: 2100,
  QWIK_INTERVAL_MS: 500,
  
  // Match duration calculations
  STANDARD_MATCH_DURATION_SECONDS: 210, // 100 stones * 2.1 seconds
  STANDARD_MATCH_DURATION_MINUTES: 3.5,
  
  // Team and player limits
  MAX_PLAYERS_PER_TEAM: 8,
  MIN_PLAYERS_PER_TEAM: 5,
  ACTIVE_PLAYERS_ON_FIELD: 5,
  
  // Scoring
  DEFAULT_POINTS_PER_STONE: 1,
  MAX_REASONABLE_SCORE: 50,
  
  // UI constants
  MIN_TEAM_NAME_LENGTH: 2,
  MAX_TEAM_NAME_LENGTH: 30,
  MAX_SHORT_NAME_LENGTH: 5,
  
  // Colors for default themes
  DEFAULT_TEAM_COLORS: [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F'  // Light Yellow
  ]
} as const;

// Default team colors rotation
export const getDefaultTeamColor = (index: number): string => {
  return JUGGER_SPORT_CONSTANTS.DEFAULT_TEAM_COLORS[
    index % JUGGER_SPORT_CONSTANTS.DEFAULT_TEAM_COLORS.length
  ];
};

// Validation limits
export const VALIDATION_LIMITS = {
  TOURNAMENT_NAME_MIN: 3,
  TOURNAMENT_NAME_MAX: 50,
  TEAM_NAME_MIN: 2,
  TEAM_NAME_MAX: 30,
  PLAYER_NAME_MIN: 2,
  PLAYER_NAME_MAX: 25,
  DESCRIPTION_MAX: 500,
  MAX_TOURNAMENTS: 100,
  MAX_MATCHES_PER_TOURNAMENT: 1000,
  MAX_EVENTS_PER_MATCH: 500
} as const;