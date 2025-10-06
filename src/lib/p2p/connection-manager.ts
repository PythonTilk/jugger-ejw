// P2P Connection Manager - Integrates WebRTC and Signaling
import { WebRTCManager, P2PDevice, P2PMessage, WebRTCConfig } from './webrtc';
import { SignalingManager, SignalingMessage, SignalingConfig, Room } from './signaling';
import { DeviceType, ConnectionStatus } from '../../types/enums';

export interface P2PConnectionConfig {
  webrtc: Partial<WebRTCConfig>;
  signaling: Partial<SignalingConfig>;
  deviceInfo: {
    name: string;
    type: DeviceType;
  };
}

export interface ConnectionManagerEvents {
  'connection-established': (device: P2PDevice) => void;
  'connection-lost': (device: P2PDevice) => void;
  'device-joined': (device: P2PDevice) => void;
  'device-left': (device: P2PDevice) => void;
  'room-created': (roomId: string) => void;
  'room-joined': (room: Room) => void;
  'message-received': (message: P2PMessage) => void;
  'error': (error: Error) => void;
}

export class P2PConnectionManager {
  private webrtcManager: WebRTCManager;
  private signalingManager: SignalingManager;
  private localDevice: P2PDevice;
  private currentRoom: Room | null = null;
  private isInitialized = false;
  private eventListeners: Map<keyof ConnectionManagerEvents, Function[]> = new Map();

  constructor(config: P2PConnectionConfig) {
    // Create local device
    this.localDevice = {
      id: this.generateDeviceId(),
      name: config.deviceInfo.name,
      type: config.deviceInfo.type,
      isHost: false,
      connectionStatus: ConnectionStatus.DISCONNECTED,
      lastSeen: new Date()
    };

    // Initialize managers
    this.webrtcManager = new WebRTCManager(this.localDevice, config.webrtc);
    this.signalingManager = new SignalingManager(this.localDevice, config.signaling);

    this.setupEventHandlers();
  }

  // Initialize the connection manager
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Connect to signaling server/mechanism
      await this.signalingManager.connect();
      
      this.isInitialized = true;
      console.log('P2P Connection Manager initialized');
    } catch (error) {
      console.error('Failed to initialize P2P Connection Manager:', error);
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.emit('error', errorObj);
      throw errorObj;
    }
  }

  // Create a new room and become host
  public async createRoom(): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Initialize as WebRTC host
      const roomId = await this.webrtcManager.initializeAsHost();
      
      // Create room in signaling
      await this.signalingManager.createRoom();
      
      this.localDevice.isHost = true;
      this.localDevice.connectionStatus = ConnectionStatus.CONNECTED;
      
      // Create room object
      this.currentRoom = {
        id: roomId,
        hostId: this.localDevice.id,
        devices: [this.localDevice],
        createdAt: new Date(),
        lastActivity: new Date()
      };

      console.log(`Created room: ${roomId}`);
      this.emit('room-created', roomId);
      
      return roomId;
    } catch (error) {
      console.error('Failed to create room:', error);
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.emit('error', errorObj);
      throw errorObj;
    }
  }

  // Join an existing room
  public async joinRoom(roomId: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Join room via signaling
      const room = await this.signalingManager.joinRoom(roomId);
      this.currentRoom = room;
      
      // Find host device
      const hostDevice = room.devices.find(d => d.isHost);
      if (!hostDevice) {
        throw new Error('No host found in room');
      }

      // Connect to host via WebRTC
      await this.webrtcManager.joinRoom(roomId, hostDevice.id);
      
      this.localDevice.connectionStatus = ConnectionStatus.CONNECTED;
      
      console.log(`Joined room: ${roomId}`);
      this.emit('room-joined', room);
    } catch (error) {
      console.error('Failed to join room:', error);
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.emit('error', errorObj);
      throw errorObj;
    }
  }

  // Leave current room
  public async leaveRoom(): Promise<void> {
    if (!this.currentRoom) {
      return;
    }

    try {
      // Leave signaling room
      await this.signalingManager.leaveRoom();
      
      // Disconnect WebRTC connections
      this.webrtcManager.disconnectAll();
      
      this.currentRoom = null;
      this.localDevice.isHost = false;
      this.localDevice.connectionStatus = ConnectionStatus.DISCONNECTED;
      
      console.log('Left room');
    } catch (error) {
      console.error('Failed to leave room:', error);
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.emit('error', errorObj);
    }
  }

  // Send message to all connected devices
  public sendMessage(message: Omit<P2PMessage, 'id' | 'senderId' | 'timestamp'>): void {
    const fullMessage: P2PMessage = {
      ...message,
      id: this.generateMessageId(),
      senderId: this.localDevice.id,
      timestamp: new Date()
    };

    this.webrtcManager.sendMessage(fullMessage);
  }

  // Send message to specific device
  public sendMessageToDevice(
    deviceId: string, 
    message: Omit<P2PMessage, 'id' | 'senderId' | 'timestamp' | 'targetId'>
  ): void {
    const fullMessage: P2PMessage = {
      ...message,
      id: this.generateMessageId(),
      senderId: this.localDevice.id,
      targetId: deviceId,
      timestamp: new Date()
    };

    this.webrtcManager.sendMessage(fullMessage, deviceId);
  }

  // Get list of connected devices
  public getConnectedDevices(): P2PDevice[] {
    return this.webrtcManager.getConnectedDevices();
  }

  // Get local device information
  public getLocalDevice(): P2PDevice {
    return { ...this.localDevice };
  }

  // Get current room information
  public getCurrentRoom(): Room | null {
    return this.currentRoom ? { ...this.currentRoom } : null;
  }

  // Check if connected to any devices
  public isConnected(): boolean {
    return this.webrtcManager.isConnected();
  }

  // Check if device is host
  public isHost(): boolean {
    return this.localDevice.isHost;
  }

  // List available rooms
  public async listAvailableRooms(): Promise<Room[]> {
    return this.signalingManager.listAvailableRooms();
  }

  // Setup event handlers between managers
  private setupEventHandlers(): void {
    // WebRTC Manager Events
    this.webrtcManager.on('device-joined', (device: P2PDevice) => {
      console.log(`Device joined via WebRTC: ${device.name}`);
      this.emit('device-joined', device);
    });

    this.webrtcManager.on('device-left', (device: P2PDevice) => {
      console.log(`Device left via WebRTC: ${device.name}`);
      this.emit('device-left', device);
    });

    this.webrtcManager.on('peer-connected', (device: P2PDevice) => {
      console.log(`WebRTC connection established with: ${device.name}`);
      this.emit('connection-established', device);
    });

    this.webrtcManager.on('peer-disconnected', (device: P2PDevice) => {
      console.log(`WebRTC connection lost with: ${device.name}`);
      this.emit('connection-lost', device);
    });

    this.webrtcManager.on('sync-message', (message: P2PMessage) => {
      this.emit('message-received', message);
    });

    this.webrtcManager.on('connection-error', ({ device, error }: { device: P2PDevice; error: any }) => {
      console.error(`WebRTC connection error with ${device.name}:`, error);
      this.emit('error', new Error(`Connection error with ${device.name}: ${error.message}`));
    });

    // Handle WebRTC signaling messages
    this.webrtcManager.on('signaling-message', ({ peerId, message }: { peerId: string; message: any }) => {
      // Forward WebRTC signaling through signaling manager
      this.signalingManager.sendWebRTCSignal(peerId, message).catch(error => {
        console.error('Failed to send WebRTC signal:', error);
      });
    });

    // Signaling Manager Events
    this.signalingManager.on('device-joined-room', ({ device, roomId }: { device: P2PDevice; roomId: string }) => {
      console.log(`Device joined room via signaling: ${device.name}`);
      
      // Connection will be established through signaling process
      // The WebRTC connection is handled automatically when devices join
    });

    this.signalingManager.on('device-left-room', ({ device }: { device: P2PDevice }) => {
      console.log(`Device left room via signaling: ${device.name}`);
      this.webrtcManager.disconnectFromPeer(device.id);
    });

    // Handle WebRTC signaling messages from signaling manager
    this.signalingManager.onSignalingMessage('offer', (message: SignalingMessage) => {
      if (message.targetId === this.localDevice.id || !message.targetId) {
        this.webrtcManager.handleSignalingMessage(message.senderId, message.data);
      }
    });

    this.signalingManager.onSignalingMessage('answer', (message: SignalingMessage) => {
      if (message.targetId === this.localDevice.id) {
        this.webrtcManager.handleSignalingMessage(message.senderId, message.data);
      }
    });

    this.signalingManager.onSignalingMessage('ice-candidate', (message: SignalingMessage) => {
      if (message.targetId === this.localDevice.id) {
        this.webrtcManager.handleSignalingMessage(message.senderId, message.data);
      }
    });
  }

  // Register message handler for specific message types
  public onMessage(messageType: string, handler: (message: P2PMessage) => void): void {
    this.webrtcManager.onMessage(messageType, handler);
  }

  // Remove message handler
  public offMessage(messageType: string): void {
    this.webrtcManager.offMessage(messageType);
  }

  // Event emitter functionality
  public on<K extends keyof ConnectionManagerEvents>(
    event: K, 
    listener: ConnectionManagerEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  public off<K extends keyof ConnectionManagerEvents>(
    event: K, 
    listener: ConnectionManagerEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(event, listeners);
    }
  }

  private emit<K extends keyof ConnectionManagerEvents>(
    event: K, 
    data: Parameters<ConnectionManagerEvents[K]>[0]
  ): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => listener(data));
  }

  // Connection retry functionality
  public async retryConnection(deviceId: string): Promise<void> {
    try {
      // Retry connection through signaling - reconnect to the room
      if (this.currentRoom) {
        await this.signalingManager.joinRoom(this.currentRoom.id);
      }
    } catch (error) {
      console.error(`Failed to retry connection to ${deviceId}:`, error);
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.emit('error', errorObj);
      throw errorObj;
    }
  }

  // Force reconnection to all devices
  public async reconnectAll(): Promise<void> {
    if (!this.currentRoom) {
      throw new Error('Not in a room');
    }

    const connectedDevices = this.getConnectedDevices();
    const reconnectPromises = connectedDevices.map(device => 
      this.retryConnection(device.id).catch(error => {
        console.error(`Failed to reconnect to ${device.name}:`, error);
        return error;
      })
    );

    const results = await Promise.allSettled(reconnectPromises);
    const failures = results.filter(result => result.status === 'rejected');
    
    if (failures.length > 0) {
      console.warn(`Failed to reconnect to ${failures.length} devices`);
    }
  }

  // Get connection statistics
  public getConnectionStats(): {
    connectedDevices: number;
    isHost: boolean;
    roomId: string | null;
    connectionStatus: ConnectionStatus;
    signalingStatus: string;
  } {
    return {
      connectedDevices: this.getConnectedDevices().length,
      isHost: this.localDevice.isHost,
      roomId: this.currentRoom?.id || null,
      connectionStatus: this.localDevice.connectionStatus,
      signalingStatus: this.signalingManager.getConnectionState()
    };
  }

  // Utility methods
  private generateDeviceId(): string {
    return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup and shutdown
  public async shutdown(): Promise<void> {
    console.log('Shutting down P2P Connection Manager');
    
    try {
      // Leave current room
      if (this.currentRoom) {
        await this.leaveRoom();
      }
      
      // Disconnect signaling
      await this.signalingManager.disconnect();
      
      // Cleanup WebRTC
      this.webrtcManager.destroy();
      
      // Clear event listeners
      this.eventListeners.clear();
      
      this.isInitialized = false;
      console.log('P2P Connection Manager shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }
}