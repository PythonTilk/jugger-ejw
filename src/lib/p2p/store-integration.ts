// Integration layer between P2P sync and Zustand stores
import { P2PSyncManager } from './sync-manager';
import { P2PConnectionManager } from './connection-manager';
import { OfflineManager } from './offline-manager';
import { useAppStore } from '../../store/appStore';
import { useMatchStore } from '../../store/matchStore';
import { useTournamentStore } from '../../store/tournamentStore';
import type { Tournament, Match, Team, GameEvent } from '../../types';
import { DeviceType } from '../../types/enums';

export interface P2PStoreConfig {
  deviceName: string;
  deviceType: DeviceType;
  enableAutoSync: boolean;
  syncDebugMode: boolean;
}

export class P2PStoreIntegration {
  private connectionManager: P2PConnectionManager;
  private syncManager: P2PSyncManager;
  private offlineManager: OfflineManager;
  private config: P2PStoreConfig;
  private isInitialized = false;
  private storeUnsubscribers: (() => void)[] = [];

  constructor(config: P2PStoreConfig) {
    this.config = config;
    
    // Initialize connection manager
    this.connectionManager = new P2PConnectionManager({
      deviceInfo: {
        name: config.deviceName,
        type: config.deviceType
      },
      webrtc: {
        connectionTimeout: 30000,
        heartbeatInterval: 5000,
        maxRetries: 3
      },
      signaling: {
        fallbackToLocalStorage: true,
        roomTimeout: 300000
      }
    });

    // Initialize sync manager
    this.syncManager = new P2PSyncManager(this.connectionManager, {
      syncInterval: 2000, // 2 seconds as per requirements
      conflictResolutionStrategy: 'referee-priority',
      debugMode: config.syncDebugMode
    });

    // Initialize offline manager
    this.offlineManager = new OfflineManager(
      this.connectionManager,
      this.syncManager,
      {
        maxReconnectAttempts: 10,
        baseReconnectDelay: 2000,
        exponentialBackoff: true,
        heartbeatInterval: 5000,
        offlineDetectionTimeout: 15000
      },
      {
        maxQueueSize: 1000,
        persistQueue: true,
        queueCleanupInterval: 60000,
        operationTimeout: 300000,
        priorityThreshold: 50
      }
    );
  }

  // Initialize P2P integration
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize connection manager
      await this.connectionManager.initialize();
      
      // Setup store synchronization
      this.setupStoreSync();
      
      // Setup sync event handlers
      this.setupSyncHandlers();
      
      this.isInitialized = true;
      console.log('P2P Store Integration initialized');
    } catch (error) {
      console.error('Failed to initialize P2P Store Integration:', error);
      throw error;
    }
  }

  // Setup bidirectional synchronization between stores and P2P
  private setupStoreSync(): void {
    if (!this.config.enableAutoSync) {
      return;
    }

    // Track previous state for comparison
    let previousAppState = useAppStore.getState();
    let previousMatchState = useMatchStore.getState();
    let previousTournamentState = useTournamentStore.getState();

    // Subscribe to app store changes
    const appStoreUnsubscribe = useAppStore.subscribe((state) => {
      if (state.tournaments !== previousAppState.tournaments) {
        this.handleTournamentStoreChange(state.tournaments, previousAppState.tournaments);
      }
      previousAppState = state;
    });
    this.storeUnsubscribers.push(appStoreUnsubscribe);

    // Subscribe to match store changes
    const matchStoreUnsubscribe = useMatchStore.subscribe((state) => {
      if (state.currentMatch !== previousMatchState.currentMatch) {
        this.handleMatchStoreChange(state.currentMatch, previousMatchState.currentMatch);
      }
      previousMatchState = state;
    });
    this.storeUnsubscribers.push(matchStoreUnsubscribe);

    // Subscribe to tournament store changes
    const tournamentStoreUnsubscribe = useTournamentStore.subscribe((state) => {
      if (state.currentTournament !== previousTournamentState.currentTournament) {
        this.handleTournamentChange(state.currentTournament, previousTournamentState.currentTournament);
      }
      if (state.teams !== previousTournamentState.teams) {
        this.handleTeamStoreChange(state.teams, previousTournamentState.teams);
      }
      previousTournamentState = state;
    });
    this.storeUnsubscribers.push(tournamentStoreUnsubscribe);
  }

  // Setup sync event handlers
  private setupSyncHandlers(): void {
    // Handle incoming tournament sync
    this.syncManager.onSync('tournament', (operation: string, tournament: Tournament) => {
      this.applyTournamentSync(operation, tournament);
    });

    // Handle incoming match sync
    this.syncManager.onSync('match', (operation: string, match: Match) => {
      this.applyMatchSync(operation, match);
    });

    // Handle incoming team sync
    this.syncManager.onSync('team', (operation: string, team: Team) => {
      this.applyTeamSync(operation, team);
    });

    // Handle incoming event sync
    this.syncManager.onSync('event', (operation: string, event: GameEvent) => {
      this.applyEventSync(operation, event);
    });

    // Handle full state sync
    this.syncManager.onSync('full-state', (operation: string, fullState: any) => {
      this.applyFullStateSync(fullState);
    });
  }

  // Handle tournament store changes
  private handleTournamentStoreChange(tournaments: Tournament[], previousTournaments: Tournament[]): void {
    // Find new tournaments
    const newTournaments = tournaments.filter(t => 
      !previousTournaments.find(pt => pt.id === t.id)
    );
    newTournaments.forEach(tournament => {
      if (this.connectionManager.isConnected()) {
        this.syncManager.syncTournament('create', tournament);
      } else {
        this.offlineManager.queueOperation('sync', 'create', {
          entity: 'tournament',
          operation: 'create',
          data: tournament
        }, 80); // High priority for tournament creation
      }
    });

    // Find updated tournaments
    tournaments.forEach(tournament => {
      const previous = previousTournaments.find(pt => pt.id === tournament.id);
      if (previous && previous.updatedAt < tournament.updatedAt) {
        if (this.connectionManager.isConnected()) {
          this.syncManager.syncTournament('update', tournament);
        } else {
          this.offlineManager.queueOperation('sync', 'update', {
            entity: 'tournament',
            operation: 'update',
            data: tournament
          }, 70); // High priority for tournament updates
        }
      }
    });

    // Find deleted tournaments
    const deletedTournaments = previousTournaments.filter(pt => 
      !tournaments.find(t => t.id === pt.id)
    );
    deletedTournaments.forEach(tournament => {
      if (this.connectionManager.isConnected()) {
        this.syncManager.syncTournament('delete', tournament);
      } else {
        this.offlineManager.queueOperation('sync', 'delete', {
          entity: 'tournament',
          operation: 'delete',
          data: tournament
        }, 60); // Medium priority for tournament deletion
      }
    });
  }

  // Handle match store changes
  private handleMatchStoreChange(currentMatch: Match | null, previousMatch: Match | null): void {
    if (!currentMatch) {
      return;
    }

    if (!previousMatch || previousMatch.id !== currentMatch.id) {
      // New match selected
      if (this.connectionManager.isConnected()) {
        this.syncManager.syncMatch('update', currentMatch);
      } else {
        this.offlineManager.queueOperation('sync', 'update', {
          entity: 'match',
          operation: 'update',
          data: currentMatch
        }, 90); // Very high priority for match updates
      }
    } else if (previousMatch.updatedAt < currentMatch.updatedAt) {
      // Match updated
      if (this.connectionManager.isConnected()) {
        this.syncManager.syncMatch('update', currentMatch);
      } else {
        this.offlineManager.queueOperation('sync', 'update', {
          entity: 'match',
          operation: 'update',
          data: currentMatch
        }, 90); // Very high priority for match updates
      }
    }
  }

  // Handle tournament changes
  private handleTournamentChange(currentTournament: Tournament | null, previousTournament: Tournament | null): void {
    if (!currentTournament) {
      return;
    }

    if (!previousTournament || previousTournament.id !== currentTournament.id) {
      // New tournament selected
      this.syncManager.syncTournament('update', currentTournament);
    } else if (previousTournament.updatedAt < currentTournament.updatedAt) {
      // Tournament updated
      this.syncManager.syncTournament('update', currentTournament);
    }
  }

  // Handle team store changes
  private handleTeamStoreChange(teams: Team[], previousTeams: Team[]): void {
    // Find new teams
    const newTeams = teams.filter(t => 
      !previousTeams.find(pt => pt.id === t.id)
    );
    newTeams.forEach(team => {
      this.syncManager.syncTeam('create', team);
    });

    // Find updated teams
    teams.forEach(team => {
      const previous = previousTeams.find(pt => pt.id === team.id);
      if (previous && JSON.stringify(previous) !== JSON.stringify(team)) {
        this.syncManager.syncTeam('update', team);
      }
    });

    // Find deleted teams
    const deletedTeams = previousTeams.filter(pt => 
      !teams.find(t => t.id === pt.id)
    );
    deletedTeams.forEach(team => {
      this.syncManager.syncTeam('delete', team);
    });
  }

  // Apply incoming tournament sync to store
  private applyTournamentSync(operation: string, tournament: Tournament): void {
    const appStore = useAppStore.getState();
    
    switch (operation) {
      case 'create':
        appStore.addTournament(tournament);
        break;
      case 'update':
        appStore.updateTournament(tournament.id, tournament);
        break;
      case 'delete':
        appStore.deleteTournament(tournament.id);
        break;
    }
  }

  // Apply incoming match sync to store
  private applyMatchSync(operation: string, match: Match): void {
    const appStore = useAppStore.getState();
    const matchStore = useMatchStore.getState();
    
    switch (operation) {
      case 'create':
        appStore.addMatch(match);
        break;
      case 'update':
        appStore.updateMatch(match.id, match);
        // Update current match if it's the same match
        if (matchStore.currentMatch?.id === match.id) {
          matchStore.setCurrentMatch(match);
        }
        break;
      case 'delete':
        // Remove from active matches
        const activeMatches = appStore.activeMatches.filter((m: Match) => m.id !== match.id);
        appStore.setActiveMatches(activeMatches);
        // Clear current match if it's the deleted match
        if (matchStore.currentMatch?.id === match.id) {
          matchStore.setCurrentMatch(null);
        }
        break;
    }
  }

  // Apply incoming team sync to store
  private applyTeamSync(operation: string, team: Team): void {
    const tournamentStore = useTournamentStore.getState();
    
    switch (operation) {
      case 'create':
        tournamentStore.addTeam(team);
        break;
      case 'update':
        tournamentStore.updateTeam(team.id, team);
        break;
      case 'delete':
        tournamentStore.removeTeam(team.id);
        break;
    }
  }

  // Apply incoming event sync to store
  private applyEventSync(operation: string, event: GameEvent): void {
    const matchStore = useMatchStore.getState();
    
    switch (operation) {
      case 'create':
        matchStore.addEvent(event);
        break;
      case 'delete':
        matchStore.removeEvent(event.id);
        break;
    }
  }

  // Apply full state sync
  private applyFullStateSync(fullState: any): void {
    const appStore = useAppStore.getState();
    const matchStore = useMatchStore.getState();
    const tournamentStore = useTournamentStore.getState();

    // Apply tournaments
    if (fullState.tournaments) {
      const tournaments = Object.values(fullState.tournaments).map((item: any) => item.data);
      appStore.setTournaments(tournaments);
    }

    // Apply matches
    if (fullState.matches) {
      const matches = Object.values(fullState.matches).map((item: any) => item.data);
      appStore.setActiveMatches(matches);
    }

    // Apply teams
    if (fullState.teams) {
      const teams = Object.values(fullState.teams).map((item: any) => item.data);
      tournamentStore.setTeams(teams);
    }
  }

  // Manual sync methods for specific operations
  public async syncCurrentMatch(): Promise<void> {
    const matchStore = useMatchStore.getState();
    if (matchStore.currentMatch) {
      this.syncManager.syncMatch('update', matchStore.currentMatch);
    }
  }

  public async syncCurrentTournament(): Promise<void> {
    const tournamentStore = useTournamentStore.getState();
    if (tournamentStore.currentTournament) {
      this.syncManager.syncTournament('update', tournamentStore.currentTournament);
    }
  }

  public async syncScore(matchId: string, homeScore: number, awayScore: number): Promise<void> {
    const appStore = useAppStore.getState();
    const match = appStore.activeMatches.find((m: Match) => m.id === matchId);
    
    if (match) {
      const updatedMatch = {
        ...match,
        score: { home: homeScore, away: awayScore },
        updatedAt: new Date()
      };
      
      this.syncManager.syncMatch('update', updatedMatch);
    }
  }

  public async syncTimerState(matchId: string, timerState: any): Promise<void> {
    const appStore = useAppStore.getState();
    const match = appStore.activeMatches.find((m: Match) => m.id === matchId);
    
    if (match) {
      const updatedMatch = {
        ...match,
        timer: timerState,
        updatedAt: new Date()
      };
      
      this.syncManager.syncMatch('update', updatedMatch);
    }
  }

  public async syncGameEvent(event: GameEvent): Promise<void> {
    this.syncManager.syncEvent('create', event);
  }

  // Connection management
  public async createRoom(): Promise<string> {
    return this.connectionManager.createRoom();
  }

  public async joinRoom(roomId: string): Promise<void> {
    await this.connectionManager.joinRoom(roomId);
    // Request full state after joining
    this.syncManager.requestFullState();
  }

  public async leaveRoom(): Promise<void> {
    await this.connectionManager.leaveRoom();
  }

  public getConnectedDevices() {
    return this.connectionManager.getConnectedDevices();
  }

  public getConnectionStats() {
    return {
      ...this.connectionManager.getConnectionStats(),
      ...this.syncManager.getSyncStats()
    };
  }

  public isConnected(): boolean {
    return this.connectionManager.isConnected();
  }

  public isHost(): boolean {
    return this.connectionManager.isHost();
  }

  // Event handlers for UI integration
  public onDeviceJoined(callback: (device: any) => void): void {
    this.connectionManager.on('device-joined', callback);
  }

  public onDeviceLeft(callback: (device: any) => void): void {
    this.connectionManager.on('device-left', callback);
  }

  public onConnectionError(callback: (error: Error) => void): void {
    this.connectionManager.on('error', callback);
  }

  public onRoomCreated(callback: (roomId: string) => void): void {
    this.connectionManager.on('room-created', callback);
  }

  public onRoomJoined(callback: (room: any) => void): void {
    this.connectionManager.on('room-joined', callback);
  }

  // Offline management methods
  public async manualSync(): Promise<void> {
    await this.offlineManager.manualSync();
  }

  public async forceReconnect(): Promise<void> {
    await this.offlineManager.forceReconnect();
  }

  public clearOfflineQueue(): void {
    this.offlineManager.clearOfflineQueue();
  }

  public isOffline(): boolean {
    return this.offlineManager.isOffline();
  }

  public getOfflineQueueSize(): number {
    return this.offlineManager.getQueueSize();
  }

  public getOfflineStats() {
    return this.offlineManager.getOfflineStats();
  }

  public getReconnectionStatus() {
    return this.offlineManager.getReconnectionStatus();
  }

  // Offline event handlers
  public onWentOffline(callback: (data: any) => void): void {
    this.offlineManager.on('went-offline', callback);
  }

  public onBackOnline(callback: (data: any) => void): void {
    this.offlineManager.on('back-online', callback);
  }

  public onReconnectionStarted(callback: () => void): void {
    this.offlineManager.on('reconnection-started', callback);
  }

  public onReconnectionFailed(callback: (data: any) => void): void {
    this.offlineManager.on('reconnection-failed', callback);
  }

  public onOperationQueued(callback: (operation: any) => void): void {
    this.offlineManager.on('operation-queued', callback);
  }

  public onOperationProcessed(callback: (operation: any) => void): void {
    this.offlineManager.on('operation-processed', callback);
  }

  // Cleanup and shutdown
  public async shutdown(): Promise<void> {
    // Unsubscribe from store changes
    this.storeUnsubscribers.forEach(unsubscribe => unsubscribe());
    this.storeUnsubscribers = [];

    // Shutdown managers
    this.offlineManager.shutdown();
    this.syncManager.shutdown();
    await this.connectionManager.shutdown();

    this.isInitialized = false;
    console.log('P2P Store Integration shutdown complete');
  }
}

// Global P2P integration instance
let p2pIntegration: P2PStoreIntegration | null = null;

// Factory function to create/get P2P integration
export function getP2PIntegration(config?: P2PStoreConfig): P2PStoreIntegration {
  if (!p2pIntegration && config) {
    p2pIntegration = new P2PStoreIntegration(config);
  }
  
  if (!p2pIntegration) {
    throw new Error('P2P Integration not initialized. Provide config on first call.');
  }
  
  return p2pIntegration;
}

// Initialize P2P integration with default config
export async function initializeP2P(config: P2PStoreConfig): Promise<P2PStoreIntegration> {
  const integration = getP2PIntegration(config);
  await integration.initialize();
  return integration;
}

// Cleanup P2P integration
export async function shutdownP2P(): Promise<void> {
  if (p2pIntegration) {
    await p2pIntegration.shutdown();
    p2pIntegration = null;
  }
}