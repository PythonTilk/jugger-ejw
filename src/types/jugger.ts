// Jugger-specific timer and scoring type definitions

export interface JuggerTimerConfig {
  maxStones: number; // Standard: 100 stones
  stoneIntervalMs: number; // Standard: 2100ms (2.1 seconds)
  allowQwik: boolean; // Allow quick stones
  autoAdvanceStones: boolean; // Auto-advance stone count
}

export interface JuggerTimer {
  stones: number; // Current stone count (0-100)
  seconds: number; // Seconds elapsed in current stone
  totalSeconds: number; // Total match time in seconds
  isRunning: boolean;
  isPaused: boolean;
  startedAt?: Date;
  pausedAt?: Date;
  completedAt?: Date;
  config: JuggerTimerConfig;
}

export interface JuggerScoringRules {
  pointsPerStone: number; // Standard: 1 point per stone run
  maxScore?: number; // Optional score limit
  suddenDeath: boolean; // Sudden death overtime rules
  overtimeStones?: number; // Additional stones for overtime
}

export interface JuggerMatchRules {
  timer: JuggerTimerConfig;
  scoring: JuggerScoringRules;
  timeouts: {
    enabled: boolean;
    maxPerTeam: number;
    durationSeconds: number;
  };
  penalties: {
    enabled: boolean;
    types: JuggerPenaltyType[];
  };
}

export enum JuggerPenaltyType {
  EARLY_START = 'early-start',
  WEAPON_CONTACT = 'weapon-contact',
  EXCESSIVE_FORCE = 'excessive-force',
  UNSPORTSMANLIKE = 'unsportsmanlike',
  EQUIPMENT_VIOLATION = 'equipment-violation'
}

export interface JuggerPenalty {
  id: string;
  type: JuggerPenaltyType;
  team: 'home' | 'away';
  player?: string;
  description: string;
  timestamp: Date;
  stoneCount: number;
}

// Standard Jugger timer constants
export const JUGGER_CONSTANTS = {
  STANDARD_STONES: 100,
  STONE_INTERVAL_MS: 2100, // 2.1 seconds
  STONE_INTERVAL_SECONDS: 2.1,
  MATCH_DURATION_MINUTES: 3.5, // Approximately 3.5 minutes
  QWIK_INTERVAL_MS: 500, // Quick stone interval
} as const;

// Utility functions for Jugger timing calculations
export const calculateMatchDuration = (stones: number, intervalMs: number): number => {
  return (stones * intervalMs) / 1000; // Return duration in seconds
};

export const calculateStonesFromTime = (seconds: number, intervalMs: number): number => {
  return Math.floor((seconds * 1000) / intervalMs);
};

export const formatStoneTime = (stones: number, seconds: number): string => {
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${stones} stones, ${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const isMatchComplete = (timer: JuggerTimer): boolean => {
  return timer.stones >= timer.config.maxStones || timer.completedAt !== undefined;
};

export const getTimeRemaining = (timer: JuggerTimer): { stones: number; seconds: number } => {
  const remainingStones = Math.max(0, timer.config.maxStones - timer.stones);
  const remainingSeconds = Math.max(0, timer.config.stoneIntervalMs / 1000 - timer.seconds);
  
  return {
    stones: remainingStones,
    seconds: remainingSeconds
  };
};