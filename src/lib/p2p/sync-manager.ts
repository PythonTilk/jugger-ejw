// Real-time state synchronization manager for P2P connections
import { P2PConnectionManager } from './connection-manager';
import { P2PMessage, P2PDevice } from './webrtc';
import { DeviceType, ConnectionStatus } from '../../types/enums';
import type { Tournament, Match, Team, GameEvent } from '../../types';

export interface SyncMessage {
  type: 'state-update' | 'state-request' | 'state-response' | 'conflict-resolution';
  entity: 'tournament' | 'match' | 'team' | 'event' | 'full-state';
  operation: 'create' | 'update' | 'delete' | 'sync';
  data: any;
  timestamp: Date;
  version: number;
  deviceId: string;
  priority: number; // Higher priority for referee devices
}

export interface SyncState {
  tournaments: Record<string, { data: Tournament; version: number; lastUpdated: Date }>;
  matches: Record<string, { data: Match; version: number; lastUpdated: Date }>;
  teams: Record<string, { data: Team; version: number; lastUpdated: Date }>;
  events: Record<string, { data: GameEvent; version: number; lastUpdated: Date }>;
}

export interface ConflictResolution {
  strategy: 'referee-priority' | 'timestamp' | 'version' | 'manual';
  resolvedBy: string;
  resolvedAt: Date;
  originalData: any;
  resolvedData: any;
}

export interface SyncConfig {
  syncInterval: number;
  conflictResolutionStrategy: 'referee-priority' | 'timestamp' | 'version';
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  compressionEnabled: boolean;
  debugMode: boolean;
}

const defaultSyncConfig: SyncConfig = {
  syncInterval: 2000, // 2 seconds as per requirements
  conflictResolutionStrategy: 'referee-priority',
  maxRetries: 3,
  retryDelay: 1000,
  batchSize: 10,
  compressionEnabled: true,
  debugMode: false
};

export class P2PSyncManager {
  private connectionManager: P2PConnectionManager;
  private config: SyncConfig;
  private syncState: SyncState;
  private pendingUpdates: Map<string, SyncMessage> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private stateVersion = 0;
  private lastSyncTime = new Date();
  private conflictQueue: Map<string, SyncMessage[]> = new Map();
  private syncListeners: Map<string, Function[]> = new Map();

  constructor(connectionManager: P2PConnectionManager, config: Partial<SyncConfig> = {}) {
    this.connectionManager = connectionManager;
    this.config = { ...defaultSyncConfig, ...config };
    this.syncState = {
      tournaments: {},
      matches: {},
      teams: {},
      events: {}
    };

    this.setupConnectionHandlers();
    this.startSyncInterval();
  }

  // Setup connection event handlers
  private setupConnectionHandlers(): void {
    // Handle incoming sync messages
    this.connectionManager.onMessage('sync', (message: P2PMessage) => {
      this.handleSyncMessage(message.data as SyncMessage);
    });

    // Handle device connections
    this.connectionManager.on('device-joined', (device: P2PDevice) => {
      this.log(`Device joined: ${device.name}, sending full state`);
      this.sendFullState(device.id);
    });

    // Handle device disconnections
    this.connectionManager.on('device-left', (device: P2PDevice) => {
      this.log(`Device left: ${device.name}`);
      this.cleanupDeviceData(device.id);
    });

    // Handle connection errors
    this.connectionManager.on('error', (error: Error) => {
      console.error('P2P connection error:', error);
    });
  }

  // Start periodic sync interval
  private startSyncInterval(): void {
    this.syncInterval = setInterval(() => {
      this.processPendingUpdates();
      this.sendHeartbeat();
    }, this.config.syncInterval);
  }

  // Stop sync interval
  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Sync tournament data
  public syncTournament(operation: 'create' | 'update' | 'delete', tournament: Tournament): void {
    const message: SyncMessage = {
      type: 'state-update',
      entity: 'tournament',
      operation,
      data: tournament,
      timestamp: new Date(),
      version: this.incrementVersion(),
      deviceId: this.connectionManager.getLocalDevice().id,
      priority: this.getDevicePriority()
    };

    this.updateLocalState('tournaments', tournament.id, tournament, message.version);
    this.broadcastSyncMessage(message);
  }

  // Sync match data
  public syncMatch(operation: 'create' | 'update' | 'delete', match: Match): void {
    const message: SyncMessage = {
      type: 'state-update',
      entity: 'match',
      operation,
      data: match,
      timestamp: new Date(),
      version: this.incrementVersion(),
      deviceId: this.connectionManager.getLocalDevice().id,
      priority: this.getDevicePriority()
    };

    this.updateLocalState('matches', match.id, match, message.version);
    this.broadcastSyncMessage(message);
  }

  // Sync team data
  public syncTeam(operation: 'create' | 'update' | 'delete', team: Team): void {
    const message: SyncMessage = {
      type: 'state-update',
      entity: 'team',
      operation,
      data: team,
      timestamp: new Date(),
      version: this.incrementVersion(),
      deviceId: this.connectionManager.getLocalDevice().id,
      priority: this.getDevicePriority()
    };

    this.updateLocalState('teams', team.id, team, message.version);
    this.broadcastSyncMessage(message);
  }

  // Sync game event
  public syncEvent(operation: 'create' | 'delete', event: GameEvent): void {
    const message: SyncMessage = {
      type: 'state-update',
      entity: 'event',
      operation,
      data: event,
      timestamp: new Date(),
      version: this.incrementVersion(),
      deviceId: this.connectionManager.getLocalDevice().id,
      priority: this.getDevicePriority()
    };

    this.updateLocalState('events', event.id, event, message.version);
    this.broadcastSyncMessage(message);
  }

  // Handle incoming sync messages
  private handleSyncMessage(message: SyncMessage): void {
    this.log(`Received sync message: ${message.type} ${message.entity} ${message.operation}`);

    switch (message.type) {
      case 'state-update':
        this.handleStateUpdate(message);
        break;
      case 'state-request':
        this.handleStateRequest(message);
        break;
      case 'state-response':
        this.handleStateResponse(message);
        break;
      case 'conflict-resolution':
        this.handleConflictResolution(message);
        break;
    }
  }

  // Handle state update messages
  private handleStateUpdate(message: SyncMessage): void {
    const { entity, operation, data } = message;

    // Check for conflicts
    const conflict = this.detectConflict(message);
    if (conflict) {
      this.handleConflict(message, conflict);
      return;
    }

    // Apply the update
    switch (entity) {
      case 'tournament':
        this.applyTournamentUpdate(operation, data, message.version);
        break;
      case 'match':
        this.applyMatchUpdate(operation, data, message.version);
        break;
      case 'team':
        this.applyTeamUpdate(operation, data, message.version);
        break;
      case 'event':
        this.applyEventUpdate(operation, data, message.version);
        break;
      case 'full-state':
        this.applyFullStateUpdate(data);
        break;
    }

    this.lastSyncTime = new Date();
    this.notifyListeners(entity, operation, data);
  }

  // Handle state request messages
  private handleStateRequest(message: SyncMessage): void {
    const { entity, deviceId } = message;
    
    if (entity === 'full-state') {
      this.sendFullState(deviceId);
    } else {
      this.sendEntityState(entity, deviceId);
    }
  }

  // Handle state response messages
  private handleStateResponse(message: SyncMessage): void {
    const { entity, data } = message;
    
    if (entity === 'full-state') {
      this.mergeFullState(data);
    } else {
      this.mergeEntityState(entity, data);
    }
  }

  // Handle conflict resolution messages
  private handleConflictResolution(message: SyncMessage): void {
    const { data } = message;
    const resolution: ConflictResolution = data;
    
    this.log(`Applying conflict resolution for ${message.entity}`);
    this.applyConflictResolution(resolution);
  }

  // Detect conflicts between local and incoming state
  private detectConflict(message: SyncMessage): SyncMessage | null {
    const { entity, data } = message;
    const entityId = data.id;
    
    const localState = this.getLocalEntityState(entity, entityId);
    if (!localState) {
      return null; // No conflict if local state doesn't exist
    }

    // Check if versions conflict
    if (localState.version > message.version) {
      return message; // Incoming message is older
    }

    // Check if timestamps are very close (simultaneous updates)
    const timeDiff = Math.abs(localState.lastUpdated.getTime() - message.timestamp.getTime());
    if (timeDiff < 1000 && localState.version === message.version) {
      return message; // Potential conflict
    }

    return null;
  }

  // Handle conflicts using configured strategy
  private handleConflict(incomingMessage: SyncMessage, conflictingMessage: SyncMessage): void {
    this.log(`Conflict detected for ${incomingMessage.entity} ${incomingMessage.data.id}`);
    
    // Add to conflict queue
    const key = `${incomingMessage.entity}-${incomingMessage.data.id}`;
    const conflicts = this.conflictQueue.get(key) || [];
    conflicts.push(incomingMessage);
    this.conflictQueue.set(key, conflicts);

    // Resolve conflict based on strategy
    const resolution = this.resolveConflict(incomingMessage, conflictingMessage);
    if (resolution) {
      this.applyConflictResolution(resolution);
      this.broadcastConflictResolution(resolution);
    }
  }

  // Resolve conflicts based on configured strategy
  private resolveConflict(incoming: SyncMessage, existing: SyncMessage): ConflictResolution | null {
    const { conflictResolutionStrategy } = this.config;
    
    switch (conflictResolutionStrategy) {
      case 'referee-priority':
        return this.resolveByReferee(incoming, existing);
      case 'timestamp':
        return this.resolveByTimestamp(incoming, existing);
      case 'version':
        return this.resolveByVersion(incoming, existing);
      default:
        return null;
    }
  }

  // Resolve conflict by referee priority
  private resolveByReferee(incoming: SyncMessage, existing: SyncMessage): ConflictResolution {
    const incomingDevice = this.connectionManager.getConnectedDevices()
      .find(d => d.id === incoming.deviceId);
    const localDevice = this.connectionManager.getLocalDevice();
    
    // Referee devices have highest priority
    const incomingIsReferee = incomingDevice?.type === DeviceType.REFEREE;
    const localIsReferee = localDevice.type === DeviceType.REFEREE;
    
    let resolvedData: any;
    let resolvedBy: string;
    
    if (incomingIsReferee && !localIsReferee) {
      resolvedData = incoming.data;
      resolvedBy = incoming.deviceId;
    } else if (localIsReferee && !incomingIsReferee) {
      resolvedData = existing.data;
      resolvedBy = localDevice.id;
    } else {
      // Both or neither are referees, fall back to timestamp
      return this.resolveByTimestamp(incoming, existing);
    }
    
    return {
      strategy: 'referee-priority',
      resolvedBy,
      resolvedAt: new Date(),
      originalData: existing.data,
      resolvedData
    };
  }

  // Resolve conflict by timestamp (latest wins)
  private resolveByTimestamp(incoming: SyncMessage, existing: SyncMessage): ConflictResolution {
    const incomingTime = incoming.timestamp.getTime();
    const existingTime = existing.timestamp.getTime();
    
    const resolvedData = incomingTime > existingTime ? incoming.data : existing.data;
    const resolvedBy = incomingTime > existingTime ? incoming.deviceId : existing.deviceId;
    
    return {
      strategy: 'timestamp',
      resolvedBy,
      resolvedAt: new Date(),
      originalData: existing.data,
      resolvedData
    };
  }

  // Resolve conflict by version (higher version wins)
  private resolveByVersion(incoming: SyncMessage, existing: SyncMessage): ConflictResolution {
    const resolvedData = incoming.version > existing.version ? incoming.data : existing.data;
    const resolvedBy = incoming.version > existing.version ? incoming.deviceId : existing.deviceId;
    
    return {
      strategy: 'version',
      resolvedBy,
      resolvedAt: new Date(),
      originalData: existing.data,
      resolvedData
    };
  }

  // Apply conflict resolution
  private applyConflictResolution(resolution: ConflictResolution): void {
    // Update local state with resolved data
    // This would integrate with the actual store updates
    this.log(`Applied conflict resolution: ${resolution.strategy}`);
  }

  // Broadcast conflict resolution to all devices
  private broadcastConflictResolution(resolution: ConflictResolution): void {
    const message: SyncMessage = {
      type: 'conflict-resolution',
      entity: 'tournament', // This would be dynamic based on the conflict
      operation: 'sync',
      data: resolution,
      timestamp: new Date(),
      version: this.incrementVersion(),
      deviceId: this.connectionManager.getLocalDevice().id,
      priority: this.getDevicePriority()
    };
    
    this.broadcastSyncMessage(message);
  }

  // Send full state to a specific device
  private sendFullState(deviceId: string): void {
    const message: SyncMessage = {
      type: 'state-response',
      entity: 'full-state',
      operation: 'sync',
      data: this.syncState,
      timestamp: new Date(),
      version: this.stateVersion,
      deviceId: this.connectionManager.getLocalDevice().id,
      priority: this.getDevicePriority()
    };

    this.connectionManager.sendMessageToDevice(deviceId, {
      type: 'sync',
      data: message
    });
  }

  // Send entity state to a specific device
  private sendEntityState(entity: string, deviceId: string): void {
    const entityData = this.syncState[entity as keyof SyncState];
    
    const message: SyncMessage = {
      type: 'state-response',
      entity: entity as any,
      operation: 'sync',
      data: entityData,
      timestamp: new Date(),
      version: this.stateVersion,
      deviceId: this.connectionManager.getLocalDevice().id,
      priority: this.getDevicePriority()
    };

    this.connectionManager.sendMessageToDevice(deviceId, {
      type: 'sync',
      data: message
    });
  }

  // Broadcast sync message to all connected devices
  private broadcastSyncMessage(message: SyncMessage): void {
    // Add to pending updates for retry logic
    const messageId = `${message.entity}-${message.data.id}-${message.version}`;
    this.pendingUpdates.set(messageId, message);

    // Send immediately
    this.connectionManager.sendMessage({
      type: 'sync',
      data: message
    });

    this.log(`Broadcasted sync message: ${message.entity} ${message.operation}`);
  }

  // Process pending updates (retry mechanism)
  private processPendingUpdates(): void {
    if (this.pendingUpdates.size === 0) return;

    const now = new Date();
    const retryThreshold = this.config.retryDelay;

    this.pendingUpdates.forEach((message, messageId) => {
      const timeSinceUpdate = now.getTime() - message.timestamp.getTime();
      
      if (timeSinceUpdate > retryThreshold) {
        // Retry the message
        this.connectionManager.sendMessage({
          type: 'sync',
          data: message
        });
        
        this.log(`Retried sync message: ${messageId}`);
      }
    });

    // Clean up old pending updates
    this.cleanupPendingUpdates();
  }

  // Clean up old pending updates
  private cleanupPendingUpdates(): void {
    const now = new Date();
    const maxAge = this.config.retryDelay * this.config.maxRetries;

    this.pendingUpdates.forEach((message, messageId) => {
      const age = now.getTime() - message.timestamp.getTime();
      if (age > maxAge) {
        this.pendingUpdates.delete(messageId);
      }
    });
  }

  // Send heartbeat to maintain connection
  private sendHeartbeat(): void {
    const heartbeat: SyncMessage = {
      type: 'state-update',
      entity: 'tournament', // Placeholder
      operation: 'sync',
      data: { heartbeat: true, timestamp: new Date() },
      timestamp: new Date(),
      version: this.stateVersion,
      deviceId: this.connectionManager.getLocalDevice().id,
      priority: this.getDevicePriority()
    };

    this.connectionManager.sendMessage({
      type: 'heartbeat',
      data: heartbeat
    });
  }

  // Update local state
  private updateLocalState(
    entity: keyof SyncState, 
    id: string, 
    data: any, 
    version: number
  ): void {
    this.syncState[entity][id] = {
      data,
      version,
      lastUpdated: new Date()
    };
  }

  // Get local entity state
  private getLocalEntityState(entity: string, id: string): any {
    return this.syncState[entity as keyof SyncState]?.[id];
  }

  // Apply tournament update
  private applyTournamentUpdate(operation: string, tournament: Tournament, version: number): void {
    this.updateLocalState('tournaments', tournament.id, tournament, version);
    this.notifyListeners('tournament', operation, tournament);
  }

  // Apply match update
  private applyMatchUpdate(operation: string, match: Match, version: number): void {
    this.updateLocalState('matches', match.id, match, version);
    this.notifyListeners('match', operation, match);
  }

  // Apply team update
  private applyTeamUpdate(operation: string, team: Team, version: number): void {
    this.updateLocalState('teams', team.id, team, version);
    this.notifyListeners('team', operation, team);
  }

  // Apply event update
  private applyEventUpdate(operation: string, event: GameEvent, version: number): void {
    this.updateLocalState('events', event.id, event, version);
    this.notifyListeners('event', operation, event);
  }

  // Apply full state update
  private applyFullStateUpdate(fullState: SyncState): void {
    this.syncState = { ...fullState };
    this.notifyListeners('full-state', 'sync', fullState);
  }

  // Merge full state
  private mergeFullState(incomingState: SyncState): void {
    // Merge incoming state with local state, keeping newer versions
    Object.keys(incomingState).forEach(entityType => {
      const entity = entityType as keyof SyncState;
      const incomingEntities = incomingState[entity];
      
      Object.keys(incomingEntities).forEach(id => {
        const incomingItem = incomingEntities[id];
        const localItem = this.syncState[entity][id];
        
        if (!localItem || incomingItem.version > localItem.version) {
          this.syncState[entity][id] = incomingItem;
        }
      });
    });
  }

  // Merge entity state
  private mergeEntityState(entity: string, incomingData: any): void {
    const entityKey = entity as keyof SyncState;
    
    Object.keys(incomingData).forEach(id => {
      const incomingItem = incomingData[id];
      const localItem = this.syncState[entityKey][id];
      
      if (!localItem || incomingItem.version > localItem.version) {
        this.syncState[entityKey][id] = incomingItem;
      }
    });
  }

  // Get device priority based on type
  private getDevicePriority(): number {
    const device = this.connectionManager.getLocalDevice();
    switch (device.type) {
      case DeviceType.REFEREE:
        return 100;
      case DeviceType.ORGANIZER:
        return 50;
      case DeviceType.SPECTATOR:
        return 10;
      default:
        return 1;
    }
  }

  // Increment version counter
  private incrementVersion(): number {
    return ++this.stateVersion;
  }

  // Clean up device-specific data
  private cleanupDeviceData(deviceId: string): void {
    // Remove pending updates from this device
    this.pendingUpdates.forEach((message, messageId) => {
      if (message.deviceId === deviceId) {
        this.pendingUpdates.delete(messageId);
      }
    });

    // Clear conflicts from this device
    this.conflictQueue.forEach((conflicts, key) => {
      const filteredConflicts = conflicts.filter(c => c.deviceId !== deviceId);
      if (filteredConflicts.length === 0) {
        this.conflictQueue.delete(key);
      } else {
        this.conflictQueue.set(key, filteredConflicts);
      }
    });
  }

  // Event listener management
  public onSync(entity: string, listener: (operation: string, data: any) => void): void {
    const listeners = this.syncListeners.get(entity) || [];
    listeners.push(listener);
    this.syncListeners.set(entity, listeners);
  }

  public offSync(entity: string, listener: Function): void {
    const listeners = this.syncListeners.get(entity) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.syncListeners.set(entity, listeners);
    }
  }

  private notifyListeners(entity: string, operation: string, data: any): void {
    const listeners = this.syncListeners.get(entity) || [];
    listeners.forEach(listener => listener(operation, data));
  }

  // Get sync statistics
  public getSyncStats(): {
    connectedDevices: number;
    pendingUpdates: number;
    conflicts: number;
    lastSyncTime: Date;
    stateVersion: number;
  } {
    return {
      connectedDevices: this.connectionManager.getConnectedDevices().length,
      pendingUpdates: this.pendingUpdates.size,
      conflicts: Array.from(this.conflictQueue.values()).reduce((sum, conflicts) => sum + conflicts.length, 0),
      lastSyncTime: this.lastSyncTime,
      stateVersion: this.stateVersion
    };
  }

  // Request full state from all devices
  public requestFullState(): void {
    const message: SyncMessage = {
      type: 'state-request',
      entity: 'full-state',
      operation: 'sync',
      data: {},
      timestamp: new Date(),
      version: this.stateVersion,
      deviceId: this.connectionManager.getLocalDevice().id,
      priority: this.getDevicePriority()
    };

    this.broadcastSyncMessage(message);
  }

  // Force sync of specific entity
  public forceSyncEntity(entity: string, id: string): void {
    const entityData = this.getLocalEntityState(entity, id);
    if (entityData) {
      const message: SyncMessage = {
        type: 'state-update',
        entity: entity as any,
        operation: 'update',
        data: entityData.data,
        timestamp: new Date(),
        version: this.incrementVersion(),
        deviceId: this.connectionManager.getLocalDevice().id,
        priority: this.getDevicePriority()
      };

      this.broadcastSyncMessage(message);
    }
  }

  // Logging utility
  private log(message: string): void {
    if (this.config.debugMode) {
      console.log(`[P2P Sync] ${message}`);
    }
  }

  // Cleanup and shutdown
  public shutdown(): void {
    this.stopSyncInterval();
    this.pendingUpdates.clear();
    this.conflictQueue.clear();
    this.syncListeners.clear();
    this.log('P2P Sync Manager shutdown complete');
  }
}