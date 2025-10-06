// Export all types from this directory

// Tournament and team types
export * from './tournament';

// Match and game event types
export * from './match';

// Jugger-specific timer and scoring types
export * from './jugger';

// Bracket and standings types
export * from './bracket';

// Enum definitions
export * from './enums';

// Validation schemas and utilities
export * from './validation';

// Type guard functions
export * from './guards';

// Constants and default values
export * from './constants';

// Additional UI and system types
export interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
}

export interface Device {
  id: string;
  name: string;
  type: 'referee' | 'spectator' | 'organizer';
  isConnected: boolean;
  lastSeen: Date;
}