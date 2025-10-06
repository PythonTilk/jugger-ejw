// LocalStorage fallback for when IndexedDB is not available
import type { Tournament, Match, Team, GameEvent } from '../types';

// Storage keys
const STORAGE_KEYS = {
  TOURNAMENTS: 'jugger-tournaments',
  MATCHES: 'jugger-matches',
  TEAMS: 'jugger-teams',
  EVENTS: 'jugger-events',
  SETTINGS: 'jugger-settings',
} as const;

// Storage interface for fallback operations
export interface LocalStorageData {
  tournaments: Tournament[];
  matches: Match[];
  teams: Team[];
  events: GameEvent[];
  lastUpdated: Date;
}

// LocalStorage service class
export class LocalStorageService {
  // Check if localStorage is available
  static isAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  // Get data from localStorage with error handling
  private static getData<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      
      const parsed = JSON.parse(item);
      
      // Convert date strings back to Date objects
      if (Array.isArray(parsed)) {
        return parsed.map(item => ({
          ...item,
          createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
          timestamp: item.timestamp ? new Date(item.timestamp) : undefined,
        })) as T;
      }
      
      return parsed;
    } catch (error) {
      console.error(`Error reading from localStorage key ${key}:`, error);
      return defaultValue;
    }
  }

  // Set data to localStorage with error handling
  private static setData<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error writing to localStorage key ${key}:`, error);
      
      // Try to free up space by clearing old data
      this.clearOldData();
      
      // Retry once
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (retryError) {
        console.error(`Failed to write to localStorage after cleanup:`, retryError);
        throw new Error('LocalStorage is full or unavailable');
      }
    }
  }

  // Tournament operations
  static getTournaments(): Tournament[] {
    return this.getData(STORAGE_KEYS.TOURNAMENTS, []);
  }

  static setTournaments(tournaments: Tournament[]): void {
    this.setData(STORAGE_KEYS.TOURNAMENTS, tournaments);
  }

  static addTournament(tournament: Tournament): void {
    const tournaments = this.getTournaments();
    tournaments.push(tournament);
    this.setTournaments(tournaments);
  }

  static updateTournament(id: string, updates: Partial<Tournament>): void {
    const tournaments = this.getTournaments();
    const index = tournaments.findIndex(t => t.id === id);
    if (index !== -1) {
      tournaments[index] = { ...tournaments[index], ...updates, updatedAt: new Date() };
      this.setTournaments(tournaments);
    }
  }

  static deleteTournament(id: string): void {
    const tournaments = this.getTournaments().filter(t => t.id !== id);
    this.setTournaments(tournaments);
    
    // Also delete related matches and events
    const matches = this.getMatches().filter(m => m.tournamentId !== id);
    this.setMatches(matches);
    
    const matchIds = this.getMatches()
      .filter(m => m.tournamentId === id)
      .map(m => m.id);
    
    const events = this.getEvents().filter(e => !matchIds.includes(e.matchId));
    this.setEvents(events);
  }

  // Match operations
  static getMatches(): Match[] {
    return this.getData(STORAGE_KEYS.MATCHES, []);
  }

  static setMatches(matches: Match[]): void {
    this.setData(STORAGE_KEYS.MATCHES, matches);
  }

  static addMatch(match: Match): void {
    const matches = this.getMatches();
    matches.push(match);
    this.setMatches(matches);
  }

  static updateMatch(id: string, updates: Partial<Match>): void {
    const matches = this.getMatches();
    const index = matches.findIndex(m => m.id === id);
    if (index !== -1) {
      matches[index] = { ...matches[index], ...updates, updatedAt: new Date() };
      this.setMatches(matches);
    }
  }

  static deleteMatch(id: string): void {
    const matches = this.getMatches().filter(m => m.id !== id);
    this.setMatches(matches);
    
    // Also delete related events
    const events = this.getEvents().filter(e => e.matchId !== id);
    this.setEvents(events);
  }

  static getMatchesByTournament(tournamentId: string): Match[] {
    return this.getMatches().filter(m => m.tournamentId === tournamentId);
  }

  static getActiveMatches(): Match[] {
    return this.getMatches().filter(m => m.status === 'active');
  }

  // Team operations
  static getTeams(): Team[] {
    return this.getData(STORAGE_KEYS.TEAMS, []);
  }

  static setTeams(teams: Team[]): void {
    this.setData(STORAGE_KEYS.TEAMS, teams);
  }

  static addTeam(team: Team): void {
    const teams = this.getTeams();
    teams.push(team);
    this.setTeams(teams);
  }

  static updateTeam(id: string, updates: Partial<Team>): void {
    const teams = this.getTeams();
    const index = teams.findIndex(t => t.id === id);
    if (index !== -1) {
      teams[index] = { ...teams[index], ...updates };
      this.setTeams(teams);
    }
  }

  static deleteTeam(id: string): void {
    const teams = this.getTeams().filter(t => t.id !== id);
    this.setTeams(teams);
  }

  // Event operations
  static getEvents(): GameEvent[] {
    return this.getData(STORAGE_KEYS.EVENTS, []);
  }

  static setEvents(events: GameEvent[]): void {
    this.setData(STORAGE_KEYS.EVENTS, events);
  }

  static addEvent(event: GameEvent): void {
    const events = this.getEvents();
    events.push(event);
    this.setEvents(events);
  }

  static deleteEvent(id: string): void {
    const events = this.getEvents().filter(e => e.id !== id);
    this.setEvents(events);
  }

  static getEventsByMatch(matchId: string): GameEvent[] {
    return this.getEvents()
      .filter(e => e.matchId === matchId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Utility operations
  static getAllData(): LocalStorageData {
    return {
      tournaments: this.getTournaments(),
      matches: this.getMatches(),
      teams: this.getTeams(),
      events: this.getEvents(),
      lastUpdated: new Date(),
    };
  }

  static setAllData(data: Partial<LocalStorageData>): void {
    if (data.tournaments) this.setTournaments(data.tournaments);
    if (data.matches) this.setMatches(data.matches);
    if (data.teams) this.setTeams(data.teams);
    if (data.events) this.setEvents(data.events);
  }

  static clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`Error clearing localStorage key ${key}:`, error);
      }
    });
  }

  static clearOldData(daysOld: number = 30): void {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Clear old tournaments
      const tournaments = this.getTournaments().filter(t => 
        t.updatedAt && t.updatedAt > cutoffDate
      );
      this.setTournaments(tournaments);

      // Clear old matches
      const validTournamentIds = tournaments.map(t => t.id);
      const matches = this.getMatches().filter(m => 
        validTournamentIds.includes(m.tournamentId) &&
        m.updatedAt && m.updatedAt > cutoffDate
      );
      this.setMatches(matches);

      // Clear old events
      const validMatchIds = matches.map(m => m.id);
      const events = this.getEvents().filter(e => 
        validMatchIds.includes(e.matchId) &&
        e.timestamp && e.timestamp > cutoffDate
      );
      this.setEvents(events);

    } catch (error) {
      console.error('Error clearing old data:', error);
    }
  }

  static getStorageStats(): {
    tournaments: number;
    matches: number;
    teams: number;
    events: number;
    totalSize: number;
    available: boolean;
  } {
    if (!this.isAvailable()) {
      return { tournaments: 0, matches: 0, teams: 0, events: 0, totalSize: 0, available: false };
    }

    try {
      const tournaments = this.getTournaments().length;
      const matches = this.getMatches().length;
      const teams = this.getTeams().length;
      const events = this.getEvents().length;

      // Estimate total size
      let totalSize = 0;
      Object.values(STORAGE_KEYS).forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          totalSize += item.length;
        }
      });

      return { tournaments, matches, teams, events, totalSize, available: true };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { tournaments: 0, matches: 0, teams: 0, events: 0, totalSize: 0, available: false };
    }
  }

  // Export/Import functionality
  static exportData(): string {
    const data = this.getAllData();
    return JSON.stringify(data, null, 2);
  }

  static importData(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData) as LocalStorageData;
      this.setAllData(data);
    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error('Invalid data format');
    }
  }
}

// Fallback service that uses localStorage when IndexedDB fails
export class FallbackStorageService {
  private static useLocalStorage = false;

  static async initialize(): Promise<void> {
    // Try to use IndexedDB first, fall back to localStorage if it fails
    try {
      // Test IndexedDB availability
      if (!window.indexedDB) {
        throw new Error('IndexedDB not available');
      }
      
      // Test if we can actually use IndexedDB
      const testDB = indexedDB.open('test-db', 1);
      await new Promise((resolve, reject) => {
        testDB.onsuccess = () => {
          testDB.result.close();
          resolve(true);
        };
        testDB.onerror = () => reject(testDB.error);
        testDB.onblocked = () => reject(new Error('IndexedDB blocked'));
      });
      
      console.log('Using IndexedDB for storage');
    } catch (error) {
      console.warn('IndexedDB not available, falling back to localStorage:', error);
      this.useLocalStorage = true;
      
      if (!LocalStorageService.isAvailable()) {
        throw new Error('No storage mechanism available');
      }
    }
  }

  static isUsingLocalStorage(): boolean {
    return this.useLocalStorage;
  }

  // Unified interface that delegates to appropriate storage mechanism
  static async getTournaments(): Promise<Tournament[]> {
    if (this.useLocalStorage) {
      return LocalStorageService.getTournaments();
    }
    // Would delegate to DatabaseService in real implementation
    return [];
  }

  static async getMatches(tournamentId?: string): Promise<Match[]> {
    if (this.useLocalStorage) {
      return tournamentId 
        ? LocalStorageService.getMatchesByTournament(tournamentId)
        : LocalStorageService.getActiveMatches();
    }
    // Would delegate to DatabaseService in real implementation
    return [];
  }

  static async getTeams(): Promise<Team[]> {
    if (this.useLocalStorage) {
      return LocalStorageService.getTeams();
    }
    // Would delegate to DatabaseService in real implementation
    return [];
  }
}