// React hook for P2P functionality
import { useState, useEffect, useCallback, useRef } from 'react';
import { getP2PIntegration, P2PStoreIntegration, P2PStoreConfig } from '../lib/p2p';
import { DeviceType } from '../types/enums';

export interface P2PStatus {
  isInitialized: boolean;
  isConnected: boolean;
  isHost: boolean;
  isOffline: boolean;
  connectedDevices: number;
  roomId: string | null;
  queueSize: number;
  isReconnecting: boolean;
  reconnectionAttempts: number;
}

export interface P2PHookConfig extends Partial<P2PStoreConfig> {
  autoInitialize?: boolean;
}

export function useP2P(config?: P2PHookConfig) {
  const [status, setStatus] = useState<P2PStatus>({
    isInitialized: false,
    isConnected: false,
    isHost: false,
    isOffline: false,
    connectedDevices: 0,
    roomId: null,
    queueSize: 0,
    isReconnecting: false,
    reconnectionAttempts: 0
  });

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const p2pRef = useRef<P2PStoreIntegration | null>(null);

  // Default configuration
  const defaultConfig: P2PStoreConfig = {
    deviceName: `Device-${Date.now()}`,
    deviceType: DeviceType.SPECTATOR,
    enableAutoSync: true,
    syncDebugMode: false,
    ...config
  };

  // Initialize P2P integration
  const initialize = useCallback(async (initConfig?: Partial<P2PStoreConfig>) => {
    if (status.isInitialized) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const finalConfig = { ...defaultConfig, ...initConfig };
      p2pRef.current = getP2PIntegration(finalConfig);
      
      // Setup event listeners
      setupEventListeners(p2pRef.current);
      
      // Initialize the integration
      await p2pRef.current.initialize();
      
      setStatus(prev => ({ ...prev, isInitialized: true }));
      updateStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize P2P';
      setError(errorMessage);
      console.error('P2P initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [status.isInitialized]);

  // Setup event listeners
  const setupEventListeners = useCallback((p2p: P2PStoreIntegration) => {
    // Connection events
    p2p.onDeviceJoined(() => updateStatus());
    p2p.onDeviceLeft(() => updateStatus());
    p2p.onConnectionError((error) => {
      setError(error.message);
      updateStatus();
    });

    // Room events
    p2p.onRoomCreated((roomId) => {
      setStatus(prev => ({ ...prev, roomId, isHost: true }));
    });
    p2p.onRoomJoined(() => {
      updateStatus();
    });

    // Offline events
    p2p.onWentOffline(() => {
      setStatus(prev => ({ ...prev, isOffline: true }));
    });
    p2p.onBackOnline(() => {
      setStatus(prev => ({ ...prev, isOffline: false }));
      updateStatus();
    });

    // Reconnection events
    p2p.onReconnectionStarted(() => {
      setStatus(prev => ({ ...prev, isReconnecting: true }));
    });
    p2p.onReconnectionFailed(() => {
      setStatus(prev => ({ ...prev, isReconnecting: false }));
      updateStatus();
    });

    // Queue events
    p2p.onOperationQueued(() => updateStatus());
    p2p.onOperationProcessed(() => updateStatus());
  }, []);

  // Update status from P2P integration
  const updateStatus = useCallback(() => {
    if (!p2pRef.current) return;

    const connectionStats = p2pRef.current.getConnectionStats();
    const offlineStats = p2pRef.current.getOfflineStats();
    const reconnectionStatus = p2pRef.current.getReconnectionStatus();

    setStatus(prev => ({
      ...prev,
      isConnected: p2pRef.current!.isConnected(),
      isHost: p2pRef.current!.isHost(),
      isOffline: p2pRef.current!.isOffline(),
      connectedDevices: connectionStats.connectedDevices,
      roomId: connectionStats.roomId,
      queueSize: offlineStats.queueSize,
      isReconnecting: reconnectionStatus.isReconnecting,
      reconnectionAttempts: reconnectionStatus.attempts
    }));
  }, []);

  // Create room
  const createRoom = useCallback(async () => {
    if (!p2pRef.current) {
      throw new Error('P2P not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const roomId = await p2pRef.current.createRoom();
      setStatus(prev => ({ ...prev, roomId, isHost: true }));
      return roomId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create room';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Join room
  const joinRoom = useCallback(async (roomId: string) => {
    if (!p2pRef.current) {
      throw new Error('P2P not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      await p2pRef.current.joinRoom(roomId);
      setStatus(prev => ({ ...prev, roomId, isHost: false }));
      updateStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join room';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [updateStatus]);

  // Leave room
  const leaveRoom = useCallback(async () => {
    if (!p2pRef.current) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await p2pRef.current.leaveRoom();
      setStatus(prev => ({ 
        ...prev, 
        roomId: null, 
        isHost: false, 
        isConnected: false,
        connectedDevices: 0
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave room';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Manual sync
  const manualSync = useCallback(async () => {
    if (!p2pRef.current) {
      throw new Error('P2P not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      await p2pRef.current.manualSync();
      updateStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Manual sync failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [updateStatus]);

  // Force reconnect
  const forceReconnect = useCallback(async () => {
    if (!p2pRef.current) {
      throw new Error('P2P not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      await p2pRef.current.forceReconnect();
      updateStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Force reconnect failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [updateStatus]);

  // Clear offline queue
  const clearOfflineQueue = useCallback(() => {
    if (!p2pRef.current) {
      return;
    }

    p2pRef.current.clearOfflineQueue();
    updateStatus();
  }, [updateStatus]);

  // Get connected devices
  const getConnectedDevices = useCallback(() => {
    if (!p2pRef.current) {
      return [];
    }

    return p2pRef.current.getConnectedDevices();
  }, []);

  // Sync specific match data
  const syncMatch = useCallback(async () => {
    if (!p2pRef.current) {
      throw new Error('P2P not initialized');
    }

    await p2pRef.current.syncCurrentMatch();
  }, []);

  // Sync tournament data
  const syncTournament = useCallback(async () => {
    if (!p2pRef.current) {
      throw new Error('P2P not initialized');
    }

    await p2pRef.current.syncCurrentTournament();
  }, []);

  // Auto-initialize if configured
  useEffect(() => {
    if (config?.autoInitialize && !status.isInitialized && !isLoading) {
      initialize();
    }
  }, [config?.autoInitialize, status.isInitialized, isLoading, initialize]);

  // Periodic status updates
  useEffect(() => {
    if (!status.isInitialized) return;

    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [status.isInitialized, updateStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (p2pRef.current) {
        p2pRef.current.shutdown().catch(console.error);
      }
    };
  }, []);

  return {
    // Status
    status,
    error,
    isLoading,

    // Actions
    initialize,
    createRoom,
    joinRoom,
    leaveRoom,
    manualSync,
    forceReconnect,
    clearOfflineQueue,
    syncMatch,
    syncTournament,

    // Data
    getConnectedDevices,

    // Utilities
    clearError: () => setError(null)
  };
}