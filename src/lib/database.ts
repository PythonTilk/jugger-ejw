// IndexedDB database setup using Dexie.js
import Dexie, { Table } from 'dexie';
import type { Tournament, Match, Team, GameEvent } from '../types';

// Database schema interface
export interface JuggerDatabase extends Dexie {
  tournaments: Table<Tournament>;
  matches: Table<Match>;
  teams: Table<Team>;
  events: Table<GameEvent>;
}

// Create the database instance
export const db = new Dexie('JuggerTournamentDB') as JuggerDatabase;

// Define database schema
db.version(1).stores({
  tournaments: '++id, name, format, createdAt, updatedAt',
  matches: '++id, tournamentId, status, createdAt, updatedAt',
  teams: '++id, name, shortName',
  events: '++id, matchId, type, timestamp, stoneCount'
});

// Database hooks for automatic timestamps
db.tournaments.hook('creating', function (primKey, obj, trans) {
  (obj as any).createdAt = new Date();
  (obj as any).updatedAt = new Date();
});

db.tournaments.hook('updating', function (modifications, primKey, obj, trans) {
  (modifications as any).updatedAt = new Date();
});

db.matches.hook('creating', function (primKey, obj, trans) {
  (obj as any).createdAt = new Date();
  (obj as any).updatedAt = new Date();
});

db.matches.hook('updating', function (modifications, primKey, obj, trans) {
  (modifications as any).updatedAt = new Date();
});

// Database utility functions
export class DatabaseService {
  // Tournament operations
  static async createTournament(tournament: Tournament): Promise<string> {
    try {
      const id = await db.tournaments.add(tournament);
      return id.toString();
    } catch (error) {
      console.error('Error creating tournament:', error);
      throw new Error('Failed to create tournament');
    }
  }

  static async getTournament(id: string): Promise<Tournament | undefined> {
    try {
      return await db.tournaments.get(id);
    } catch (error) {
      console.error('Error getting tournament:', error);
      return undefined;
    }
  }

  static async getAllTournaments(): Promise<Tournament[]> {
    try {
      return await db.tournaments.orderBy('updatedAt').reverse().toArray();
    } catch (error) {
      console.error('Error getting tournaments:', error);
      return [];
    }
  }

  static async updateTournament(id: string, updates: Partial<Tournament>): Promise<void> {
    try {
      await db.tournaments.update(id, updates);
    } catch (error) {
      console.error('Error updating tournament:', error);
      throw new Error('Failed to update tournament');
    }
  }

  static async deleteTournament(id: string): Promise<void> {
    try {
      await db.transaction('rw', db.tournaments, db.matches, db.events, async () => {
        // Delete related matches and events
        const matches = await db.matches.where('tournamentId').equals(id).toArray();
        const matchIds = matches.map(m => m.id);
        
        await db.events.where('matchId').anyOf(matchIds).delete();
        await db.matches.where('tournamentId').equals(id).delete();
        await db.tournaments.delete(id);
      });
    } catch (error) {
      console.error('Error deleting tournament:', error);
      throw new Error('Failed to delete tournament');
    }
  }

  // Match operations
  static async createMatch(match: Match): Promise<string> {
    try {
      const id = await db.matches.add(match);
      return id.toString();
    } catch (error) {
      console.error('Error creating match:', error);
      throw new Error('Failed to create match');
    }
  }

  static async getMatch(id: string): Promise<Match | undefined> {
    try {
      return await db.matches.get(id);
    } catch (error) {
      console.error('Error getting match:', error);
      return undefined;
    }
  }

  static async getMatchesByTournament(tournamentId: string): Promise<Match[]> {
    try {
      return await db.matches.where('tournamentId').equals(tournamentId).toArray();
    } catch (error) {
      console.error('Error getting matches by tournament:', error);
      return [];
    }
  }

  static async getActiveMatches(): Promise<Match[]> {
    try {
      return await db.matches.where('status').equals('active').toArray();
    } catch (error) {
      console.error('Error getting active matches:', error);
      return [];
    }
  }

  static async updateMatch(id: string, updates: Partial<Match>): Promise<void> {
    try {
      await db.matches.update(id, updates);
    } catch (error) {
      console.error('Error updating match:', error);
      throw new Error('Failed to update match');
    }
  }

  static async deleteMatch(id: string): Promise<void> {
    try {
      await db.transaction('rw', db.matches, db.events, async () => {
        await db.events.where('matchId').equals(id).delete();
        await db.matches.delete(id);
      });
    } catch (error) {
      console.error('Error deleting match:', error);
      throw new Error('Failed to delete match');
    }
  }

  // Team operations
  static async createTeam(team: Team): Promise<string> {
    try {
      const id = await db.teams.add(team);
      return id.toString();
    } catch (error) {
      console.error('Error creating team:', error);
      throw new Error('Failed to create team');
    }
  }

  static async getTeam(id: string): Promise<Team | undefined> {
    try {
      return await db.teams.get(id);
    } catch (error) {
      console.error('Error getting team:', error);
      return undefined;
    }
  }

  static async getAllTeams(): Promise<Team[]> {
    try {
      return await db.teams.orderBy('name').toArray();
    } catch (error) {
      console.error('Error getting teams:', error);
      return [];
    }
  }

  static async updateTeam(id: string, updates: Partial<Team>): Promise<void> {
    try {
      await db.teams.update(id, updates);
    } catch (error) {
      console.error('Error updating team:', error);
      throw new Error('Failed to update team');
    }
  }

  static async deleteTeam(id: string): Promise<void> {
    try {
      await db.teams.delete(id);
    } catch (error) {
      console.error('Error deleting team:', error);
      throw new Error('Failed to delete team');
    }
  }

  // Event operations
  static async createEvent(event: GameEvent): Promise<string> {
    try {
      const id = await db.events.add(event);
      return id.toString();
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event');
    }
  }

  static async getEventsByMatch(matchId: string): Promise<GameEvent[]> {
    try {
      const events = await db.events.where('matchId').equals(matchId).toArray();
      return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      console.error('Error getting events by match:', error);
      return [];
    }
  }

  static async deleteEvent(id: string): Promise<void> {
    try {
      await db.events.delete(id);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error('Failed to delete event');
    }
  }

  // Utility operations
  static async clearAllData(): Promise<void> {
    try {
      await db.transaction('rw', db.tournaments, db.matches, db.teams, db.events, async () => {
        await db.events.clear();
        await db.matches.clear();
        await db.teams.clear();
        await db.tournaments.clear();
      });
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw new Error('Failed to clear data');
    }
  }

  static async exportData(): Promise<{
    tournaments: Tournament[];
    matches: Match[];
    teams: Team[];
    events: GameEvent[];
  }> {
    try {
      const [tournaments, matches, teams, events] = await Promise.all([
        db.tournaments.toArray(),
        db.matches.toArray(),
        db.teams.toArray(),
        db.events.toArray(),
      ]);

      return { tournaments, matches, teams, events };
    } catch (error) {
      console.error('Error exporting data:', error);
      throw new Error('Failed to export data');
    }
  }

  static async importData(data: {
    tournaments?: Tournament[];
    matches?: Match[];
    teams?: Team[];
    events?: GameEvent[];
  }): Promise<void> {
    try {
      await db.transaction('rw', db.tournaments, db.matches, db.teams, db.events, async () => {
        if (data.tournaments) {
          await db.tournaments.bulkAdd(data.tournaments);
        }
        if (data.matches) {
          await db.matches.bulkAdd(data.matches);
        }
        if (data.teams) {
          await db.teams.bulkAdd(data.teams);
        }
        if (data.events) {
          await db.events.bulkAdd(data.events);
        }
      });
    } catch (error) {
      console.error('Error importing data:', error);
      throw new Error('Failed to import data');
    }
  }

  // Database health and maintenance
  static async getDatabaseStats(): Promise<{
    tournaments: number;
    matches: number;
    teams: number;
    events: number;
    totalSize: number;
  }> {
    try {
      const [tournaments, matches, teams, events] = await Promise.all([
        db.tournaments.count(),
        db.matches.count(),
        db.teams.count(),
        db.events.count(),
      ]);

      // Estimate total size (rough calculation)
      const totalSize = tournaments * 1000 + matches * 2000 + teams * 500 + events * 200;

      return { tournaments, matches, teams, events, totalSize };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return { tournaments: 0, matches: 0, teams: 0, events: 0, totalSize: 0 };
    }
  }

  static async cleanupOldData(daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      await db.transaction('rw', db.tournaments, db.matches, db.events, async () => {
        // Delete old completed tournaments
        const oldTournaments = await db.tournaments
          .where('updatedAt')
          .below(cutoffDate)
          .toArray();

        for (const tournament of oldTournaments) {
          await DatabaseService.deleteTournament(tournament.id);
        }
      });
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      throw new Error('Failed to cleanup old data');
    }
  }
}

// Initialize database
export const initializeDatabase = async (): Promise<void> => {
  try {
    await db.open();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error('Database initialization failed');
  }
};