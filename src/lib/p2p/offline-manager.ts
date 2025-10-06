// Offline queue and reconnection management for P2P synchronization
import { P2PConnectionManager } from './connection-manager';
import { P2PSyncManager, SyncMessage } from './sync-manager';
import { ConnectionStatus } from '../../types/enums';

export interface OfflineOperation {
  id: string;
  type: 'sync' | 'connection' | 'manual';
  operation: string;
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  priority: number;
  deviceId?: string;
}

export interface ReconnectionConfig {
  maxReconnectAttempts: number;
  baseReconnectDelay: number;
  maxReconnectDelay: number;
  exponentialBackoff: boolean;
  heartbeatInterval: number;
  offlineDetectionTimeout: number;
}

export interface OfflineConfig {
  maxQueueSize: number;
  persistQueue: boolean;
  queueCleanupInterval: number;
  operationTimeout: number;
  priorityThreshold: number;
}

const defaultReconnectionConfig: ReconnectionConfig = {
  maxReconnectAttempts: 10,
  baseReconnectDelay: 2000, // 2 seconds
  maxReconnectDelay: 30000, // 30 seconds
  exponentialBackoff: true,
  heartbeatInterval: 5000, // 5 seconds
  offlineDetectionTimeout: 15000 // 15 seconds
};

const defaultOfflineConfig: OfflineConfig = {
  maxQueueSize: 1000,
  persistQueue: true,
  queueCleanupInterval: 60000, // 1 minute
  operationTimeout: 300000, // 5 minutes
  priorityThreshold: 50
};

export class OfflineManager {
  private connectionManager: P2PConnectionManager;
  private syncManager: P2PSyncManager;
  private reconnectionConfig: ReconnectionConfig;
  private offlineConfig: OfflineConfig;
  
  private offlineQueue: Map<string, OfflineOperation> = new Map();
  private reconnectionAttempts = 0;
  private reconnectionTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private queueCleanupTimer: NodeJS.Timeout | null = null;
  private offlineDetectionTimer: NodeJS.Timeout | null = null;
  
  private isOnline = true;
  private isReconnecting = false;
  private lastHeartbeat = new Date();
  private connectionLostTime: Date | null = null;
  
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(
    connectionManager: P2PConnectionManager,
    syncManager: P2PSyncManager,
    reconnectionConfig: Partial<ReconnectionConfig> = {},
    offlineConfig: Partial<OfflineConfig> = {}
  ) {
    this.connectionManager = connectionManager;
    this.syncManager = syncManager;
    this.reconnectionConfig = { ...defaultReconnectionConfig, ...reconnectionConfig };
    this.offlineConfig = { ...defaultOfflineConfig, ...offlineConfig };

    this.setupEventHandlers();
    this.startHeartbeat();
    this.startQueueCleanup();
    this.loadPersistedQueue();
  }

  // Setup event handlers
  private setupEventHandlers(): void {
    // Handle connection events
    this.connectionManager.on('connection-established', (device) => {
      this.handleConnectionEstablished(device);
    });

    this.connectionManager.on('connection-lost', (device) => {
      this.handleConnectionLost(device);
    });

    this.connectionManager.on('device-joined', (device) => {
      this.handleDeviceJoined(device);
    });

    this.connectionManager.on('device-left', (device) => {
      this.handleDeviceLeft(device);
    });

    this.connectionManager.on('error', (error) => {
      this.handleConnectionError(error);
    });

    // Handle browser online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.handleBrowserOnline();
      });

      window.addEventListener('offline', () => {
        this.handleBrowserOffline();
      });

      // Handle page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.handlePageVisible();
        } else {
          this.handlePageHidden();
        }
      });
    }
  }

  // Queue operation for offline processing
  public queueOperation(
    type: 'sync' | 'connection' | 'manual',
    operation: string,
    data: any,
    priority: number = 10,
    maxRetries: number = 3,
    deviceId?: string
  ): string {
    const operationId = this.generateOperationId();
    
    const offlineOperation: OfflineOperation = {
      id: operationId,
      type,
      operation,
      data,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries,
      priority,
      deviceId
    };

    // Check queue size limit
    if (this.offlineQueue.size >= this.offlineConfig.maxQueueSize) {
      this.cleanupLowPriorityOperations();
    }

    this.offlineQueue.set(operationId, offlineOperation);
    this.persistQueue();

    this.log(`Queued operation: ${type} ${operation} (priority: ${priority})`);
    this.emit('operation-queued', offlineOperation);

    // Try to process immediately if online
    if (this.isOnline && this.connectionManager.isConnected()) {
      this.processQueuedOperations();
    }

    return operationId;
  }

  // Process queued operations
  public async processQueuedOperations(): Promise<void> {
    if (this.offlineQueue.size === 0) {
      return;
    }

    this.log(`Processing ${this.offlineQueue.size} queued operations`);

    // Sort operations by priority and timestamp
    const sortedOperations = Array.from(this.offlineQueue.values())
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.timestamp.getTime() - b.timestamp.getTime(); // Older first
      });

    const processedIds: string[] = [];
    const failedIds: string[] = [];

    for (const operation of sortedOperations) {
      try {
        await this.processOperation(operation);
        processedIds.push(operation.id);
        this.emit('operation-processed', operation);
      } catch (error) {
        console.error(`Failed to process operation ${operation.id}:`, error);
        
        operation.retryCount++;
        
        if (operation.retryCount >= operation.maxRetries) {
          failedIds.push(operation.id);
          this.emit('operation-failed', { operation, error });
        } else {
          this.emit('operation-retry', { operation, error });
        }
      }
    }

    // Remove processed and failed operations
    [...processedIds, ...failedIds].forEach(id => {
      this.offlineQueue.delete(id);
    });

    this.persistQueue();

    if (processedIds.length > 0) {
      this.log(`Processed ${processedIds.length} operations successfully`);
    }

    if (failedIds.length > 0) {
      this.log(`Failed to process ${failedIds.length} operations after max retries`);
    }
  }

  // Process individual operation
  private async processOperation(operation: OfflineOperation): Promise<void> {
    switch (operation.type) {
      case 'sync':
        await this.processSyncOperation(operation);
        break;
      case 'connection':
        await this.processConnectionOperation(operation);
        break;
      case 'manual':
        await this.processManualOperation(operation);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  // Process sync operation
  private async processSyncOperation(operation: OfflineOperation): Promise<void> {
    const syncMessage: SyncMessage = operation.data;
    
    switch (syncMessage.entity) {
      case 'tournament':
        this.syncManager.syncTournament(syncMessage.operation as any, syncMessage.data);
        break;
      case 'match':
        this.syncManager.syncMatch(syncMessage.operation as any, syncMessage.data);
        break;
      case 'team':
        this.syncManager.syncTeam(syncMessage.operation as any, syncMessage.data);
        break;
      case 'event':
        this.syncManager.syncEvent(syncMessage.operation as any, syncMessage.data);
        break;
      default:
        throw new Error(`Unknown sync entity: ${syncMessage.entity}`);
    }
  }

  // Process connection operation
  private async processConnectionOperation(operation: OfflineOperation): Promise<void> {
    switch (operation.operation) {
      case 'reconnect':
        if (operation.deviceId) {
          await this.connectionManager.retryConnection(operation.deviceId);
        } else {
          await this.connectionManager.reconnectAll();
        }
        break;
      case 'join-room':
        await this.connectionManager.joinRoom(operation.data.roomId);
        break;
      default:
        throw new Error(`Unknown connection operation: ${operation.operation}`);
    }
  }

  // Process manual operation
  private async processManualOperation(operation: OfflineOperation): Promise<void> {
    // Manual operations are custom operations defined by the application
    this.emit('manual-operation', operation);
  }

  // Handle connection established
  private handleConnectionEstablished(device: any): void {
    this.log(`Connection established with ${device.name}`);
    
    if (!this.isOnline) {
      this.isOnline = true;
      this.isReconnecting = false;
      this.reconnectionAttempts = 0;
      this.connectionLostTime = null;
      
      this.clearReconnectionTimer();
      this.emit('back-online', { device, queueSize: this.offlineQueue.size });
      
      // Process queued operations
      this.processQueuedOperations();
    }
    
    this.updateHeartbeat();
  }

  // Handle connection lost
  private handleConnectionLost(device: any): void {
    this.log(`Connection lost with ${device.name}`);
    
    if (this.isOnline) {
      this.isOnline = false;
      this.connectionLostTime = new Date();
      this.emit('went-offline', { device, timestamp: this.connectionLostTime });
    }
    
    // Start reconnection attempts
    this.startReconnection();
  }

  // Handle device joined
  private handleDeviceJoined(device: any): void {
    this.log(`Device joined: ${device.name}`);
    this.updateHeartbeat();
    
    // If we were offline, we might be back online now
    if (!this.isOnline && this.connectionManager.isConnected()) {
      this.handleConnectionEstablished(device);
    }
  }

  // Handle device left
  private handleDeviceLeft(device: any): void {
    this.log(`Device left: ${device.name}`);
    
    // Check if we still have connections
    if (this.connectionManager.getConnectedDevices().length === 0) {
      this.handleConnectionLost(device);
    }
  }

  // Handle connection error
  private handleConnectionError(error: Error): void {
    console.error('Connection error:', error);
    this.emit('connection-error', error);
    
    // If we're not already offline, consider going offline
    if (this.isOnline && !this.connectionManager.isConnected()) {
      this.handleConnectionLost({ name: 'unknown', error });
    }
  }

  // Handle browser online event
  private handleBrowserOnline(): void {
    this.log('Browser detected online');
    
    if (!this.isOnline) {
      // Try to reconnect
      this.startReconnection();
    }
  }

  // Handle browser offline event
  private handleBrowserOffline(): void {
    this.log('Browser detected offline');
    
    if (this.isOnline) {
      this.isOnline = false;
      this.connectionLostTime = new Date();
      this.emit('browser-offline', { timestamp: this.connectionLostTime });
    }
  }

  // Handle page visible
  private handlePageVisible(): void {
    this.log('Page became visible');
    
    // Check connection status and try to reconnect if needed
    if (!this.isOnline || !this.connectionManager.isConnected()) {
      this.startReconnection();
    }
    
    // Resume heartbeat
    this.startHeartbeat();
  }

  // Handle page hidden
  private handlePageHidden(): void {
    this.log('Page became hidden');
    
    // Reduce heartbeat frequency or stop it
    this.stopHeartbeat();
  }

  // Start reconnection attempts
  private startReconnection(): void {
    if (this.isReconnecting) {
      return;
    }
    
    this.isReconnecting = true;
    this.reconnectionAttempts = 0;
    
    this.log('Starting reconnection attempts');
    this.emit('reconnection-started', {});
    
    this.attemptReconnection();
  }

  // Attempt reconnection
  private async attemptReconnection(): Promise<void> {
    if (this.reconnectionAttempts >= this.reconnectionConfig.maxReconnectAttempts) {
      this.log('Max reconnection attempts reached');
      this.isReconnecting = false;
      this.emit('reconnection-failed', { attempts: this.reconnectionAttempts });
      return;
    }

    this.reconnectionAttempts++;
    
    try {
      this.log(`Reconnection attempt ${this.reconnectionAttempts}`);
      this.emit('reconnection-attempt', { attempt: this.reconnectionAttempts });
      
      // Try to reconnect to all known devices
      await this.connectionManager.reconnectAll();
      
      // If successful, the connection-established handler will handle the rest
      
    } catch (error) {
      console.error(`Reconnection attempt ${this.reconnectionAttempts} failed:`, error);
      
      // Schedule next attempt
      const delay = this.calculateReconnectionDelay();
      this.reconnectionTimer = setTimeout(() => {
        this.attemptReconnection();
      }, delay);
      
      this.emit('reconnection-attempt-failed', { 
        attempt: this.reconnectionAttempts, 
        error, 
        nextAttemptIn: delay 
      });
    }
  }

  // Calculate reconnection delay with exponential backoff
  private calculateReconnectionDelay(): number {
    if (!this.reconnectionConfig.exponentialBackoff) {
      return this.reconnectionConfig.baseReconnectDelay;
    }
    
    const delay = this.reconnectionConfig.baseReconnectDelay * 
                  Math.pow(2, this.reconnectionAttempts - 1);
    
    return Math.min(delay, this.reconnectionConfig.maxReconnectDelay);
  }

  // Clear reconnection timer
  private clearReconnectionTimer(): void {
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }
  }

  // Start heartbeat monitoring
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      this.checkHeartbeat();
    }, this.reconnectionConfig.heartbeatInterval);
    
    this.updateHeartbeat();
  }

  // Stop heartbeat monitoring
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Update heartbeat timestamp
  private updateHeartbeat(): void {
    this.lastHeartbeat = new Date();
  }

  // Check heartbeat for offline detection
  private checkHeartbeat(): void {
    const now = new Date();
    const timeSinceLastHeartbeat = now.getTime() - this.lastHeartbeat.getTime();
    
    if (timeSinceLastHeartbeat > this.reconnectionConfig.offlineDetectionTimeout) {
      this.log('Heartbeat timeout detected');
      
      if (this.isOnline) {
        this.handleConnectionLost({ name: 'heartbeat-timeout' });
      }
    }
  }

  // Start queue cleanup
  private startQueueCleanup(): void {
    this.queueCleanupTimer = setInterval(() => {
      this.cleanupExpiredOperations();
    }, this.offlineConfig.queueCleanupInterval);
  }

  // Stop queue cleanup
  private stopQueueCleanup(): void {
    if (this.queueCleanupTimer) {
      clearInterval(this.queueCleanupTimer);
      this.queueCleanupTimer = null;
    }
  }

  // Clean up expired operations
  private cleanupExpiredOperations(): void {
    const now = new Date();
    const expiredIds: string[] = [];
    
    this.offlineQueue.forEach((operation, id) => {
      const age = now.getTime() - operation.timestamp.getTime();
      if (age > this.offlineConfig.operationTimeout) {
        expiredIds.push(id);
      }
    });
    
    expiredIds.forEach(id => {
      const operation = this.offlineQueue.get(id);
      this.offlineQueue.delete(id);
      if (operation) {
        this.emit('operation-expired', operation);
      }
    });
    
    if (expiredIds.length > 0) {
      this.log(`Cleaned up ${expiredIds.length} expired operations`);
      this.persistQueue();
    }
  }

  // Clean up low priority operations when queue is full
  private cleanupLowPriorityOperations(): void {
    const operations = Array.from(this.offlineQueue.values())
      .filter(op => op.priority < this.offlineConfig.priorityThreshold)
      .sort((a, b) => a.priority - b.priority); // Lowest priority first
    
    const toRemove = Math.ceil(operations.length * 0.1); // Remove 10% of low priority operations
    
    for (let i = 0; i < toRemove && i < operations.length; i++) {
      this.offlineQueue.delete(operations[i].id);
      this.emit('operation-removed', operations[i]);
    }
    
    if (toRemove > 0) {
      this.log(`Removed ${toRemove} low priority operations to make space`);
    }
  }

  // Persist queue to localStorage
  private persistQueue(): void {
    if (!this.offlineConfig.persistQueue) {
      return;
    }
    
    try {
      const queueData = Array.from(this.offlineQueue.entries()).map(([id, operation]) => ({
        ...operation,
        id,
        timestamp: operation.timestamp.toISOString()
      }));
      
      localStorage.setItem('jugger-offline-queue', JSON.stringify(queueData));
    } catch (error) {
      console.error('Failed to persist offline queue:', error);
    }
  }

  // Load persisted queue from localStorage
  private loadPersistedQueue(): void {
    if (!this.offlineConfig.persistQueue) {
      return;
    }
    
    try {
      const stored = localStorage.getItem('jugger-offline-queue');
      if (stored) {
        const queueData = JSON.parse(stored);
        
        queueData.forEach((item: any) => {
          const operation: OfflineOperation = {
            ...item,
            timestamp: new Date(item.timestamp)
          };
          
          this.offlineQueue.set(operation.id, operation);
        });
        
        this.log(`Loaded ${this.offlineQueue.size} operations from persisted queue`);
      }
    } catch (error) {
      console.error('Failed to load persisted offline queue:', error);
    }
  }

  // Manual sync options
  public async manualSync(): Promise<void> {
    this.log('Manual sync requested');
    
    // Request full state sync
    this.syncManager.requestFullState();
    
    // Process any queued operations
    await this.processQueuedOperations();
    
    this.emit('manual-sync-completed', {});
  }

  public async forceReconnect(): Promise<void> {
    this.log('Force reconnect requested');
    
    // Reset reconnection state
    this.isReconnecting = false;
    this.reconnectionAttempts = 0;
    this.clearReconnectionTimer();
    
    // Start fresh reconnection
    this.startReconnection();
  }

  public clearOfflineQueue(): void {
    this.log('Clearing offline queue');
    
    const clearedCount = this.offlineQueue.size;
    this.offlineQueue.clear();
    this.persistQueue();
    
    this.emit('queue-cleared', { clearedCount });
  }

  // Status getters
  public isOffline(): boolean {
    return !this.isOnline;
  }

  public getQueueSize(): number {
    return this.offlineQueue.size;
  }

  public getReconnectionStatus(): {
    isReconnecting: boolean;
    attempts: number;
    maxAttempts: number;
    connectionLostTime: Date | null;
  } {
    return {
      isReconnecting: this.isReconnecting,
      attempts: this.reconnectionAttempts,
      maxAttempts: this.reconnectionConfig.maxReconnectAttempts,
      connectionLostTime: this.connectionLostTime
    };
  }

  public getOfflineStats(): {
    queueSize: number;
    isOnline: boolean;
    isReconnecting: boolean;
    lastHeartbeat: Date;
    connectionLostTime: Date | null;
    reconnectionAttempts: number;
  } {
    return {
      queueSize: this.offlineQueue.size,
      isOnline: this.isOnline,
      isReconnecting: this.isReconnecting,
      lastHeartbeat: this.lastHeartbeat,
      connectionLostTime: this.connectionLostTime,
      reconnectionAttempts: this.reconnectionAttempts
    };
  }

  // Event emitter functionality
  public on(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  public off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(event, listeners);
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => listener(data));
  }

  // Utility methods
  private generateOperationId(): string {
    return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(message: string): void {
    console.log(`[Offline Manager] ${message}`);
  }

  // Cleanup and shutdown
  public shutdown(): void {
    this.stopHeartbeat();
    this.stopQueueCleanup();
    this.clearReconnectionTimer();
    
    // Persist final queue state
    this.persistQueue();
    
    // Clear event listeners
    this.eventListeners.clear();
    
    this.log('Offline Manager shutdown complete');
  }
}