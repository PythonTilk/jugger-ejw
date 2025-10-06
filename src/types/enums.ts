// Enum definitions for Jugger Tournament App

// Tournament format options
export enum TournamentFormat {
  SINGLE_ELIMINATION = 'single-elimination',
  DOUBLE_ELIMINATION = 'double-elimination',
  ROUND_ROBIN = 'round-robin'
}

// Match status states
export enum MatchStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Game event types for match tracking
export enum GameEventType {
  SCORE = 'score',
  STONE = 'stone',
  QWIK = 'qwik',
  TIMEOUT = 'timeout',
  PENALTY = 'penalty',
  MATCH_START = 'match-start',
  MATCH_END = 'match-end',
  MATCH_PAUSE = 'match-pause',
  MATCH_RESUME = 'match-resume'
}

// Team sides in a match
export enum TeamSide {
  HOME = 'home',
  AWAY = 'away'
}

// Jugger player positions
export enum JuggerPosition {
  QWIK = 'qwik',
  CHAIN = 'chain',
  SHORT_SWORD = 'short-sword',
  LONG_SWORD = 'long-sword',
  STAFF = 'staff',
  SHIELD = 'shield'
}

// Language options for internationalization
export enum Language {
  GERMAN = 'de',
  ENGLISH = 'en'
}

// Theme options for UI customization
export enum Theme {
  DEFAULT = 'default',
  DARK = 'dark',
  JUGGER_CLASSIC = 'jugger-classic',
  MODERN = 'modern'
}

// Device types for P2P synchronization
export enum DeviceType {
  REFEREE = 'referee',
  SPECTATOR = 'spectator',
  ORGANIZER = 'organizer'
}

// Connection status for P2P networking
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}