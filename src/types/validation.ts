// Validation schemas and utility functions for data integrity

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidationSchema<T> {
  validate: (data: T) => ValidationResult;
}

// Tournament validation
export const validateTournament = (tournament: any): ValidationResult => {
  const errors: string[] = [];

  if (!tournament.id || typeof tournament.id !== 'string') {
    errors.push('Tournament ID is required and must be a string');
  }

  if (!tournament.name || typeof tournament.name !== 'string' || tournament.name.trim().length === 0) {
    errors.push('Tournament name is required and cannot be empty');
  }

  if (!tournament.format || !['single-elimination', 'double-elimination', 'round-robin'].includes(tournament.format)) {
    errors.push('Tournament format must be single-elimination, double-elimination, or round-robin');
  }

  if (!Array.isArray(tournament.teams)) {
    errors.push('Tournament teams must be an array');
  }

  if (!Array.isArray(tournament.matches)) {
    errors.push('Tournament matches must be an array');
  }

  if (!tournament.createdAt || !(tournament.createdAt instanceof Date)) {
    errors.push('Tournament createdAt must be a valid Date');
  }

  if (!tournament.updatedAt || !(tournament.updatedAt instanceof Date)) {
    errors.push('Tournament updatedAt must be a valid Date');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Team validation
export const validateTeam = (team: any): ValidationResult => {
  const errors: string[] = [];

  if (!team.id || typeof team.id !== 'string') {
    errors.push('Team ID is required and must be a string');
  }

  if (!team.name || typeof team.name !== 'string' || team.name.trim().length === 0) {
    errors.push('Team name is required and cannot be empty');
  }

  if (!team.shortName || typeof team.shortName !== 'string' || team.shortName.trim().length === 0) {
    errors.push('Team short name is required and cannot be empty');
  }

  if (team.shortName && team.shortName.length > 5) {
    errors.push('Team short name must be 5 characters or less');
  }

  if (!team.color || typeof team.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(team.color)) {
    errors.push('Team color must be a valid hex color code');
  }

  if (!Array.isArray(team.players)) {
    errors.push('Team players must be an array');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Match validation
export const validateMatch = (match: any): ValidationResult => {
  const errors: string[] = [];

  if (!match.id || typeof match.id !== 'string') {
    errors.push('Match ID is required and must be a string');
  }

  if (!match.tournamentId || typeof match.tournamentId !== 'string') {
    errors.push('Match tournament ID is required and must be a string');
  }

  if (!match.homeTeam || !match.awayTeam) {
    errors.push('Match must have both home and away teams');
  }

  if (!match.status || !['pending', 'active', 'paused', 'completed', 'cancelled'].includes(match.status)) {
    errors.push('Match status must be pending, active, paused, completed, or cancelled');
  }

  if (!match.score || typeof match.score.home !== 'number' || typeof match.score.away !== 'number') {
    errors.push('Match score must have numeric home and away values');
  }

  if (match.score.home < 0 || match.score.away < 0) {
    errors.push('Match scores cannot be negative');
  }

  if (!match.timer || typeof match.timer.stones !== 'number' || typeof match.timer.seconds !== 'number') {
    errors.push('Match timer must have numeric stones and seconds values');
  }

  if (match.timer.stones < 0 || match.timer.stones > 100) {
    errors.push('Match timer stones must be between 0 and 100');
  }

  if (match.timer.seconds < 0) {
    errors.push('Match timer seconds cannot be negative');
  }

  if (!Array.isArray(match.events)) {
    errors.push('Match events must be an array');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Game event validation
export const validateGameEvent = (event: any): ValidationResult => {
  const errors: string[] = [];

  if (!event.id || typeof event.id !== 'string') {
    errors.push('Game event ID is required and must be a string');
  }

  if (!event.matchId || typeof event.matchId !== 'string') {
    errors.push('Game event match ID is required and must be a string');
  }

  if (!event.type || !['score', 'stone', 'qwik', 'timeout', 'penalty', 'match-start', 'match-end', 'match-pause', 'match-resume'].includes(event.type)) {
    errors.push('Game event type must be a valid event type');
  }

  if (event.team && !['home', 'away'].includes(event.team)) {
    errors.push('Game event team must be home or away if specified');
  }

  if (!event.timestamp || !(event.timestamp instanceof Date)) {
    errors.push('Game event timestamp must be a valid Date');
  }

  if (typeof event.stoneCount !== 'number' || event.stoneCount < 0 || event.stoneCount > 100) {
    errors.push('Game event stone count must be a number between 0 and 100');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Player validation
export const validatePlayer = (player: any): ValidationResult => {
  const errors: string[] = [];

  if (!player.id || typeof player.id !== 'string') {
    errors.push('Player ID is required and must be a string');
  }

  if (!player.name || typeof player.name !== 'string' || player.name.trim().length === 0) {
    errors.push('Player name is required and cannot be empty');
  }

  if (player.position && !['qwik', 'chain', 'short-sword', 'long-sword', 'staff', 'shield'].includes(player.position)) {
    errors.push('Player position must be a valid Jugger position if specified');
  }

  if (typeof player.isActive !== 'boolean') {
    errors.push('Player isActive must be a boolean');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};