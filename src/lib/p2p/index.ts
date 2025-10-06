// P2P module exports
export { WebRTCManager, type P2PDevice, type P2PMessage, type WebRTCConfig } from './webrtc';
export { SignalingManager, type SignalingMessage, type SignalingConfig, type Room } from './signaling';
export { 
  P2PConnectionManager, 
  type P2PConnectionConfig, 
  type ConnectionManagerEvents 
} from './connection-manager';
export { P2PSyncManager, type SyncMessage, type SyncConfig } from './sync-manager';
export { 
  OfflineManager, 
  type OfflineOperation, 
  type ReconnectionConfig, 
  type OfflineConfig 
} from './offline-manager';
export { 
  P2PStoreIntegration, 
  type P2PStoreConfig,
  getP2PIntegration,
  initializeP2P,
  shutdownP2P
} from './store-integration';

// Re-export relevant enums
export { DeviceType, ConnectionStatus } from '../../types/enums';