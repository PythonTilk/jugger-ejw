// WebRTC connection management for peer-to-peer synchronization
import { DeviceType, ConnectionStatus } from '../../types/enums';

export interface P2PDevice {
  id: string;
  name: string;
  type: DeviceType;
  isHost: boolean;
  connectionStatus: ConnectionStatus;
  lastSeen: Date;
}

export interface P2PMessage {
  id: string;
  type: 'sync' | 'heartbeat' | 'join' | 'leave' | 'signal';
  senderId: string;
  targetId?: string; // for direct messages
  timestamp: Date;
  data: any;
}

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  connectionTimeout: number;
  heartbeatInterval: number;
  maxRetries: number;
  retryDelay: number;
}

const defaultWebRTCConfig: WebRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  connectionTimeout: 30000, // 30 seconds
  heartbeatInterval: 5000, // 5 seconds
  maxRetries: 3,
  retryDelay: 2000 // 2 seconds
};

export class WebRTCManager {
  private config: WebRTCConfig;
  private localDevice: P2PDevice;
  private connections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private connectedDevices: Map<string, P2PDevice> = new Map();
  private messageHandlers: Map<string, (message: P2PMessage) => void> = new Map();
  private connectionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private retryAttempts: Map<string, number> = new Map();

  constructor(
    localDevice: Omit<P2PDevice, 'connectionStatus' | 'lastSeen'>,
    config: Partial<WebRTCConfig> = {}
  ) {
    this.config = { ...defaultWebRTCConfig, ...config };
    this.localDevice = {
      ...localDevice,
      connectionStatus: ConnectionStatus.DISCONNECTED,
      lastSeen: new Date()
    };

    this.startHeartbeat();
  }

  // Initialize as host (creates room)
  public async initializeAsHost(): Promise<string> {
    this.localDevice.isHost = true;
    this.localDevice.connectionStatus = ConnectionStatus.CONNECTED;
    
    // Generate room ID
    const roomId = this.generateRoomId();
    
    console.log(`Initialized as host with room ID: ${roomId}`);
    return roomId;
  }

  // Join existing room
  public async joinRoom(roomId: string, hostDeviceId: string): Promise<void> {
    this.localDevice.isHost = false;
    this.localDevice.connectionStatus = ConnectionStatus.CONNECTING;
    
    try {
      await this.connectToPeer(hostDeviceId);
      console.log(`Joined room: ${roomId}`);
    } catch (error) {
      this.localDevice.connectionStatus = ConnectionStatus.ERROR;
      throw new Error(`Failed to join room: ${error}`);
    }
  }

  // Create peer connection
  private async connectToPeer(peerId: string): Promise<void> {
    if (this.connections.has(peerId)) {
      console.log(`Already connected to peer: ${peerId}`);
      return;
    }

    const peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers
    });

    this.connections.set(peerId, peerConnection);
    this.setConnectionTimeout(peerId);

    // Set up event handlers
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage(peerId, {
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log(`Connection state changed for ${peerId}: ${state}`);
      
      if (state === 'connected') {
        this.handlePeerConnected(peerId);
      } else if (state === 'disconnected' || state === 'failed') {
        this.handlePeerDisconnected(peerId);
      }
    };

    peerConnection.ondatachannel = (event) => {
      this.setupDataChannel(peerId, event.channel);
    };

    // Create data channel if we're the initiator
    if (this.localDevice.isHost) {
      const dataChannel = peerConnection.createDataChannel('jugger-sync', {
        ordered: true
      });
      this.setupDataChannel(peerId, dataChannel);
    }

    // Create and send offer if we're the host
    if (this.localDevice.isHost) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      this.sendSignalingMessage(peerId, {
        type: 'offer',
        offer: offer
      });
    }
  }

  // Set up data channel for messaging
  private setupDataChannel(peerId: string, dataChannel: RTCDataChannel): void {
    this.dataChannels.set(peerId, dataChannel);

    dataChannel.onopen = () => {
      console.log(`Data channel opened for peer: ${peerId}`);
      this.clearConnectionTimeout(peerId);
      
      // Send join message
      this.sendMessage({
        id: this.generateMessageId(),
        type: 'join',
        senderId: this.localDevice.id,
        timestamp: new Date(),
        data: {
          device: this.localDevice
        }
      }, peerId);
    };

    dataChannel.onmessage = (event) => {
      try {
        const message: P2PMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    dataChannel.onclose = () => {
      console.log(`Data channel closed for peer: ${peerId}`);
      this.handlePeerDisconnected(peerId);
    };

    dataChannel.onerror = (error) => {
      console.error(`Data channel error for peer ${peerId}:`, error);
      this.handlePeerDisconnected(peerId);
    };
  }

  // Handle signaling messages (would typically go through a signaling server)
  // For now, this is a placeholder for the signaling mechanism
  private sendSignalingMessage(peerId: string, message: any): void {
    // In a real implementation, this would send through a signaling server
    // For local network discovery, we might use WebSocket or other mechanism
    console.log(`Signaling message to ${peerId}:`, message);
    
    // Emit event for external signaling handling
    this.emit('signaling-message', { peerId, message });
  }

  // Handle incoming signaling messages
  public async handleSignalingMessage(peerId: string, message: any): Promise<void> {
    const peerConnection = this.connections.get(peerId);
    if (!peerConnection) {
      console.error(`No peer connection found for: ${peerId}`);
      return;
    }

    try {
      switch (message.type) {
        case 'offer':
          await peerConnection.setRemoteDescription(message.offer);
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          
          this.sendSignalingMessage(peerId, {
            type: 'answer',
            answer: answer
          });
          break;

        case 'answer':
          await peerConnection.setRemoteDescription(message.answer);
          break;

        case 'ice-candidate':
          await peerConnection.addIceCandidate(message.candidate);
          break;

        default:
          console.warn(`Unknown signaling message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error handling signaling message:`, error);
      this.handleConnectionError(peerId, error);
    }
  }

  // Send message to specific peer or broadcast
  public sendMessage(message: P2PMessage, targetPeerId?: string): void {
    if (targetPeerId) {
      // Send to specific peer
      const dataChannel = this.dataChannels.get(targetPeerId);
      if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify(message));
      } else {
        console.warn(`Cannot send message to ${targetPeerId}: channel not ready`);
      }
    } else {
      // Broadcast to all connected peers
      this.dataChannels.forEach((dataChannel, peerId) => {
        if (dataChannel.readyState === 'open') {
          dataChannel.send(JSON.stringify(message));
        }
      });
    }
  }

  // Handle incoming messages
  private handleMessage(message: P2PMessage): void {
    // Update last seen for sender
    const device = this.connectedDevices.get(message.senderId);
    if (device) {
      device.lastSeen = new Date();
    }

    // Handle different message types
    switch (message.type) {
      case 'join':
        this.handleDeviceJoin(message);
        break;
      case 'leave':
        this.handleDeviceLeave(message);
        break;
      case 'heartbeat':
        this.handleHeartbeat(message);
        break;
      case 'sync':
        this.handleSyncMessage(message);
        break;
      default:
        // Forward to registered handlers
        const handler = this.messageHandlers.get(message.type);
        if (handler) {
          handler(message);
        }
    }
  }

  // Handle device join
  private handleDeviceJoin(message: P2PMessage): void {
    const device: P2PDevice = message.data.device;
    device.connectionStatus = ConnectionStatus.CONNECTED;
    device.lastSeen = new Date();
    
    this.connectedDevices.set(device.id, device);
    console.log(`Device joined: ${device.name} (${device.type})`);
    
    this.emit('device-joined', device);
  }

  // Handle device leave
  private handleDeviceLeave(message: P2PMessage): void {
    const deviceId = message.senderId;
    const device = this.connectedDevices.get(deviceId);
    
    if (device) {
      this.connectedDevices.delete(deviceId);
      console.log(`Device left: ${device.name}`);
      this.emit('device-left', device);
    }
    
    this.disconnectFromPeer(deviceId);
  }

  // Handle heartbeat messages
  private handleHeartbeat(message: P2PMessage): void {
    const device = this.connectedDevices.get(message.senderId);
    if (device) {
      device.lastSeen = new Date();
    }
  }

  // Handle sync messages (to be implemented in sync manager)
  private handleSyncMessage(message: P2PMessage): void {
    this.emit('sync-message', message);
  }

  // Handle peer connected
  private handlePeerConnected(peerId: string): void {
    this.clearConnectionTimeout(peerId);
    this.retryAttempts.delete(peerId);
    
    const device = this.connectedDevices.get(peerId);
    if (device) {
      device.connectionStatus = ConnectionStatus.CONNECTED;
      this.emit('peer-connected', device);
    }
  }

  // Handle peer disconnected
  private handlePeerDisconnected(peerId: string): void {
    const device = this.connectedDevices.get(peerId);
    if (device) {
      device.connectionStatus = ConnectionStatus.DISCONNECTED;
      this.emit('peer-disconnected', device);
    }

    // Attempt reconnection if not at max retries
    const retries = this.retryAttempts.get(peerId) || 0;
    if (retries < this.config.maxRetries) {
      this.scheduleReconnection(peerId);
    } else {
      console.log(`Max retries reached for peer: ${peerId}`);
      this.cleanupPeerConnection(peerId);
    }
  }

  // Handle connection errors
  private handleConnectionError(peerId: string, error: any): void {
    console.error(`Connection error for peer ${peerId}:`, error);
    
    const device = this.connectedDevices.get(peerId);
    if (device) {
      device.connectionStatus = ConnectionStatus.ERROR;
      this.emit('connection-error', { device, error });
    }
    
    this.handlePeerDisconnected(peerId);
  }

  // Schedule reconnection attempt
  private scheduleReconnection(peerId: string): void {
    const retries = this.retryAttempts.get(peerId) || 0;
    this.retryAttempts.set(peerId, retries + 1);
    
    const device = this.connectedDevices.get(peerId);
    if (device) {
      device.connectionStatus = ConnectionStatus.RECONNECTING;
    }
    
    setTimeout(() => {
      console.log(`Attempting reconnection to ${peerId} (attempt ${retries + 1})`);
      this.connectToPeer(peerId);
    }, this.config.retryDelay * (retries + 1)); // Exponential backoff
  }

  // Connection timeout management
  private setConnectionTimeout(peerId: string): void {
    const timeout = setTimeout(() => {
      console.log(`Connection timeout for peer: ${peerId}`);
      this.handleConnectionError(peerId, new Error('Connection timeout'));
    }, this.config.connectionTimeout);
    
    this.connectionTimeouts.set(peerId, timeout);
  }

  private clearConnectionTimeout(peerId: string): void {
    const timeout = this.connectionTimeouts.get(peerId);
    if (timeout) {
      clearTimeout(timeout);
      this.connectionTimeouts.delete(peerId);
    }
  }

  // Heartbeat system
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const heartbeatMessage: P2PMessage = {
        id: this.generateMessageId(),
        type: 'heartbeat',
        senderId: this.localDevice.id,
        timestamp: new Date(),
        data: {}
      };
      
      this.sendMessage(heartbeatMessage);
      this.checkDeviceTimeouts();
    }, this.config.heartbeatInterval);
  }

  private checkDeviceTimeouts(): void {
    const now = new Date();
    const timeoutThreshold = this.config.heartbeatInterval * 3; // 3 missed heartbeats
    
    this.connectedDevices.forEach((device, deviceId) => {
      const timeSinceLastSeen = now.getTime() - device.lastSeen.getTime();
      
      if (timeSinceLastSeen > timeoutThreshold) {
        console.log(`Device timeout detected: ${device.name}`);
        this.handlePeerDisconnected(deviceId);
      }
    });
  }

  // Cleanup peer connection
  private cleanupPeerConnection(peerId: string): void {
    // Close data channel
    const dataChannel = this.dataChannels.get(peerId);
    if (dataChannel) {
      dataChannel.close();
      this.dataChannels.delete(peerId);
    }
    
    // Close peer connection
    const peerConnection = this.connections.get(peerId);
    if (peerConnection) {
      peerConnection.close();
      this.connections.delete(peerId);
    }
    
    // Clear timeouts
    this.clearConnectionTimeout(peerId);
    
    // Remove from connected devices
    this.connectedDevices.delete(peerId);
    this.retryAttempts.delete(peerId);
  }

  // Disconnect from specific peer
  public disconnectFromPeer(peerId: string): void {
    // Send leave message
    const leaveMessage: P2PMessage = {
      id: this.generateMessageId(),
      type: 'leave',
      senderId: this.localDevice.id,
      timestamp: new Date(),
      data: {}
    };
    
    this.sendMessage(leaveMessage, peerId);
    this.cleanupPeerConnection(peerId);
  }

  // Disconnect from all peers
  public disconnectAll(): void {
    this.connectedDevices.forEach((_, peerId) => {
      this.disconnectFromPeer(peerId);
    });
    
    this.localDevice.connectionStatus = ConnectionStatus.DISCONNECTED;
  }

  // Register message handler
  public onMessage(messageType: string, handler: (message: P2PMessage) => void): void {
    this.messageHandlers.set(messageType, handler);
  }

  // Remove message handler
  public offMessage(messageType: string): void {
    this.messageHandlers.delete(messageType);
  }

  // Get connected devices
  public getConnectedDevices(): P2PDevice[] {
    return Array.from(this.connectedDevices.values());
  }

  // Get local device info
  public getLocalDevice(): P2PDevice {
    return { ...this.localDevice };
  }

  // Check if connected to any peers
  public isConnected(): boolean {
    return this.connectedDevices.size > 0;
  }

  // Utility methods
  private generateRoomId(): string {
    return `jugger-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Event emitter functionality
  private eventListeners: Map<string, Function[]> = new Map();

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => listener(data));
  }

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

  // Cleanup
  public destroy(): void {
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Disconnect all peers
    this.disconnectAll();
    
    // Clear all timeouts
    this.connectionTimeouts.forEach(timeout => clearTimeout(timeout));
    this.connectionTimeouts.clear();
    
    // Clear event listeners
    this.eventListeners.clear();
    this.messageHandlers.clear();
  }
}