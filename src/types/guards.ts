// Type guard functions for runtime type checking

import type { 
  Tournament, 
  Match, 
  Team, 
  Player, 
  GameEvent, 
  JuggerTimer,
  MatchStatus,
  GameEventType,
  TeamSide,
  TournamentFormat 
} from './index';

// Tournament type guards
export const isTournament = (obj: any): obj is Tournament => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    ['single-elimination', 'double-elimination', 'round-robin'].includes(obj.format) &&
    Array.isArray(obj.teams) &&
    Array.isArray(obj.matches) &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date
  );
};

// Match type guards
export const isMatch = (obj: any): obj is Match => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.tournamentId === 'string' &&
    isTeam(obj.homeTeam) &&
    isTeam(obj.awayTeam) &&
    typeof obj.score?.home === 'number' &&
    typeof obj.score?.away === 'number' &&
    ['pending', 'active', 'paused', 'completed', 'cancelled'].includes(obj.status) &&
    isJuggerTimer(obj.timer) &&
    Array.isArray(obj.events) &&
    obj.createdAt instanceof Date &&
    obj.updatedAt instanceof Date
  );
};

// Team type guards
export const isTeam = (obj: any): obj is Team => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.shortName === 'string' &&
    typeof obj.color === 'string' &&
    Array.isArray(obj.players) &&
    obj.stats &&
    typeof obj.stats.matchesPlayed === 'number'
  );
};

// Player type guards
export const isPlayer = (obj: any): obj is Player => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.isActive === 'boolean'
  );
};

// Game event type guards
export const isGameEvent = (obj: any): obj is GameEvent => {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.matchId === 'string' &&
    ['score', 'stone', 'qwik', 'timeout', 'penalty', 'match-start', 'match-end', 'match-pause', 'match-resume'].includes(obj.type) &&
    obj.timestamp instanceof Date &&
    typeof obj.stoneCount === 'number'
  );
};

// Jugger timer type guards
export const isJuggerTimer = (obj: any): obj is JuggerTimer => {
  return (
    obj &&
    typeof obj.stones === 'number' &&
    typeof obj.seconds === 'number' &&
    typeof obj.totalSeconds === 'number' &&
    typeof obj.isRunning === 'boolean' &&
    typeof obj.isPaused === 'boolean' &&
    obj.config &&
    typeof obj.config.maxStones === 'number' &&
    typeof obj.config.stoneIntervalMs === 'number'
  );
};

// Enum type guards
export const isMatchStatus = (value: any): value is MatchStatus => {
  return ['pending', 'active', 'paused', 'completed', 'cancelled'].includes(value);
};

export const isGameEventType = (value: any): value is GameEventType => {
  return ['score', 'stone', 'qwik', 'timeout', 'penalty', 'match-start', 'match-end', 'match-pause', 'match-resume'].includes(value);
};

export const isTeamSide = (value: any): value is TeamSide => {
  return ['home', 'away'].includes(value);
};

export const isTournamentFormat = (value: any): value is TournamentFormat => {
  return ['single-elimination', 'double-elimination', 'round-robin'].includes(value);
};

// Utility type guards for common checks
export const isValidId = (id: any): id is string => {
  return typeof id === 'string' && id.length > 0;
};

export const isValidScore = (score: any): score is number => {
  return typeof score === 'number' && score >= 0 && Number.isInteger(score);
};

export const isValidStoneCount = (stones: any): stones is number => {
  return typeof stones === 'number' && stones >= 0 && stones <= 100 && Number.isInteger(stones);
};

export const isValidHexColor = (color: any): color is string => {
  return typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color);
};