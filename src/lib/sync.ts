// Data synchronization layer between Zustand stores and IndexedDB
import { DatabaseService } from './database';
import type { Tournament, Match, Team, GameEvent } from '../types';

// Sync configuration
export interface SyncConfig {
  autoSync: boolean;
  syncInterval: number; // in milliseconds
  batchSize: number;
  retryAttempts: number;
  retryDelay: number;
}

const defaultSyncConfig: SyncConfig = {
  autoSync: true,
  syncInterval: 5000, // 5 seconds
  batchSize: 50,
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

// Sync status tracking
export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingOperations: number;
  syncInProgress: boolean;
  error: string | null;
}

// Pending operation types for offline queue
export interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'tournament' | 'match' | 'team' | 'event';
  data: any;
  timestamp: Date;
  retryCount: number;
}

// Sync manager class
export class SyncManager {
  private config: SyncConfig;
  private status: SyncStatus;
  private pendingOperations: PendingOperation[] = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: ((status: SyncStatus) => void)[] = [];

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...defaultSyncConfig, ...config };
    this.status = {
      isOnline: navigator.onLine,
      lastSync: null,
      pendingOperations: 0,
      syncInProgress: false,
      error: null,
    };

    this.setupEventListeners();
    this.loadPendingOperations();
    
    if (this.config.autoSync) {
      this.startAutoSync();
    }
  }

  // Event listeners for online/offline status
  private setupEventListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.status.isOnline = true;
        this.notifyListeners();
        this.processPendingOperations();
      });

      window.addEventListener('offline', () => {
        this.status.isOnline = false;
        this.notifyListeners();
      });
    }
  }

  // Load pending operations from localStorage
  private loadPendingOperations(): void {
    try {
      const stored = localStorage.getItem('jugger-pending-operations');
      if (stored) {
        this.pendingOperations = JSON.parse(stored).map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp),
        }));
        this.status.pendingOperations = this.pendingOperations.length;
      }
    } catch (error) {
      console.error('Error loading pending operations:', error);
    }
  }

  // Save pending operations to localStorage
  private savePendingOperations(): void {
    try {
      localStorage.setItem('jugger-pending-operations', JSON.stringify(this.pendingOperations));
      this.status.pendingOperations = this.pendingOperations.length;
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving pending operations:', error);
    }
  }

  // Add operation to pending queue
  private addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): void {
    const pendingOp: PendingOperation = {
      ...operation,
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      retryCount: 0,
    };

    this.pendingOperations.push(pendingOp);
    this.savePendingOperations();

    // Try to process immediately if online
    if (this.status.isOnline) {
      this.processPendingOperations();
    }
  }

  // Process pending operations
  private async processPendingOperations(): Promise<void> {
    if (!this.status.isOnline || this.status.syncInProgress || this.pendingOperations.length === 0) {
      return;
    }

    this.status.syncInProgress = true;
    this.notifyListeners();

    const batch = this.pendingOperations.slice(0, this.config.batchSize);
    const processedIds: string[] = [];

    for (const operation of batch) {
      try {
        await this.executeOperation(operation);
        processedIds.push(operation.id);
      } catch (error) {
        console.error('Error processing operation:', error);
        
        // Increment retry count
        operation.retryCount++;
        
        // Remove operation if max retries exceeded
        if (operation.retryCount >= this.config.retryAttempts) {
          processedIds.push(operation.id);
          this.status.error = `Failed to sync operation after ${this.config.retryAttempts} attempts`;
        }
      }
    }

    // Remove processed operations
    this.pendingOperations = this.pendingOperations.filter(op => !processedIds.includes(op.id));
    this.savePendingOperations();

    this.status.syncInProgress = false;
    this.status.lastSync = new Date();
    this.notifyListeners();

    // Continue processing if there are more operations
    if (this.pendingOperations.length > 0) {
      setTimeout(() => this.processPendingOperations(), this.config.retryDelay);
    }
  }

  // Execute a single operation
  private async executeOperation(operation: PendingOperation): Promise<void> {
    const { type, entity, data } = operation;

    switch (entity) {
      case 'tournament':
        await this.executeTournamentOperation(type, data);
        break;
      case 'match':
        await this.executeMatchOperation(type, data);
        break;
      case 'team':
        await this.executeTeamOperation(type, data);
        break;
      case 'event':
        await this.executeEventOperation(type, data);
        break;
      default:
        throw new Error(`Unknown entity type: ${entity}`);
    }
  }

  // Tournament operations
  private async executeTournamentOperation(type: string, data: any): Promise<void> {
    switch (type) {
      case 'create':
        await DatabaseService.createTournament(data);
        break;
      case 'update':
        await DatabaseService.updateTournament(data.id, data.updates);
        break;
      case 'delete':
        await DatabaseService.deleteTournament(data.id);
        break;
    }
  }

  // Match operations
  private async executeMatchOperation(type: string, data: any): Promise<void> {
    switch (type) {
      case 'create':
        await DatabaseService.createMatch(data);
        break;
      case 'update':
        await DatabaseService.updateMatch(data.id, data.updates);
        break;
      case 'delete':
        await DatabaseService.deleteMatch(data.id);
        break;
    }
  }

  // Team operations
  private async executeTeamOperation(type: string, data: any): Promise<void> {
    switch (type) {
      case 'create':
        await DatabaseService.createTeam(data);
        break;
      case 'update':
        await DatabaseService.updateTeam(data.id, data.updates);
        break;
      case 'delete':
        await DatabaseService.deleteTeam(data.id);
        break;
    }
  }

  // Event operations
  private async executeEventOperation(type: string, data: any): Promise<void> {
    switch (type) {
      case 'create':
        await DatabaseService.createEvent(data);
        break;
      case 'delete':
        await DatabaseService.deleteEvent(data.id);
        break;
    }
  }

  // Public API methods
  public async syncTournament(type: 'create' | 'update' | 'delete', data: any): Promise<void> {
    if (this.status.isOnline) {
      try {
        await this.executeTournamentOperation(type, data);
        this.status.lastSync = new Date();
        this.status.error = null;
        this.notifyListeners();
      } catch (error) {
        this.addPendingOperation({ type, entity: 'tournament', data });
        throw error;
      }
    } else {
      this.addPendingOperation({ type, entity: 'tournament', data });
    }
  }

  public async syncMatch(type: 'create' | 'update' | 'delete', data: any): Promise<void> {
    if (this.status.isOnline) {
      try {
        await this.executeMatchOperation(type, data);
        this.status.lastSync = new Date();
        this.status.error = null;
        this.notifyListeners();
      } catch (error) {
        this.addPendingOperation({ type, entity: 'match', data });
        throw error;
      }
    } else {
      this.addPendingOperation({ type, entity: 'match', data });
    }
  }

  public async syncTeam(type: 'create' | 'update' | 'delete', data: any): Promise<void> {
    if (this.status.isOnline) {
      try {
        await this.executeTeamOperation(type, data);
        this.status.lastSync = new Date();
        this.status.error = null;
        this.notifyListeners();
      } catch (error) {
        this.addPendingOperation({ type, entity: 'team', data });
        throw error;
      }
    } else {
      this.addPendingOperation({ type, entity: 'team', data });
    }
  }

  public async syncEvent(type: 'create' | 'delete', data: any): Promise<void> {
    if (this.status.isOnline) {
      try {
        await this.executeEventOperation(type, data);
        this.status.lastSync = new Date();
        this.status.error = null;
        this.notifyListeners();
      } catch (error) {
        this.addPendingOperation({ type, entity: 'event', data });
        throw error;
      }
    } else {
      this.addPendingOperation({ type, entity: 'event', data });
    }
  }

  // Load data from database
  public async loadTournaments(): Promise<Tournament[]> {
    try {
      return await DatabaseService.getAllTournaments();
    } catch (error) {
      console.error('Error loading tournaments:', error);
      return [];
    }
  }

  public async loadMatches(tournamentId?: string): Promise<Match[]> {
    try {
      if (tournamentId) {
        return await DatabaseService.getMatchesByTournament(tournamentId);
      } else {
        return await DatabaseService.getActiveMatches();
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      return [];
    }
  }

  public async loadTeams(): Promise<Team[]> {
    try {
      return await DatabaseService.getAllTeams();
    } catch (error) {
      console.error('Error loading teams:', error);
      return [];
    }
  }

  // Sync control
  public startAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.processPendingOperations();
    }, this.config.syncInterval);
  }

  public stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  public async forcSync(): Promise<void> {
    await this.processPendingOperations();
  }

  // Status management
  public getStatus(): SyncStatus {
    return { ...this.status };
  }

  public addStatusListener(listener: (status: SyncStatus) => void): void {
    this.listeners.push(listener);
  }

  public removeStatusListener(listener: (status: SyncStatus) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.status }));
  }

  // Cleanup
  public destroy(): void {
    this.stopAutoSync();
    this.listeners = [];
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', () => {});
      window.removeEventListener('offline', () => {});
    }
  }
}

// Global sync manager instance
export const syncManager = new SyncManager();