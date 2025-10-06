// Signaling mechanism for WebRTC peer discovery and connection establishment
import { P2PDevice, P2PMessage } from './webrtc';

export interface SignalingMessage {
  id: string;
  type: 'join-room' | 'leave-room' | 'offer' | 'answer' | 'ice-candidate' | 'room-update';
  roomId: string;
  senderId: string;
  targetId?: string;
  timestamp: Date;
  data: any;
}

export interface Room {
  id: string;
  hostId: string;
  devices: P2PDevice[];
  createdAt: Date;
  lastActivity: Date;
}

export interface SignalingConfig {
  signalingServerUrl?: string;
  fallbackToLocalStorage: boolean;
  roomTimeout: number;
  heartbeatInterval: number;
}

const defaultSignalingConfig: SignalingConfig = {
  fallbackToLocalStorage: true,
  roomTimeout: 300000, // 5 minutes
  heartbeatInterval: 30000 // 30 seconds
};

export class SignalingManager {
  private config: SignalingConfig;
  private websocket: WebSocket | null = null;
  private currentRoomId: string | null = null;
  private localDevice: P2PDevice;
  private messageHandlers: Map<string, (message: SignalingMessage) => void> = new Map();
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(localDevice: P2PDevice, config: Partial<SignalingConfig> = {}) {
    this.config = { ...defaultSignalingConfig, ...config };
    this.localDevice = localDevice;
  }

  // Connect to signaling server or fallback to local storage
  public async connect(): Promise<void> {
    if (this.config.signalingServerUrl) {
      await this.connectToWebSocketServer();
    } else if (this.config.fallbackToLocalStorage) {
      this.initializeLocalStorageSignaling();
    } else {
      throw new Error('No signaling mechanism configured');
    }
  }

  // Connect to WebSocket signaling server
  private async connectToWebSocketServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.connectionState = 'connecting';
        this.websocket = new WebSocket(this.config.signalingServerUrl!);

        this.websocket.onopen = () => {
          console.log('Connected to signaling server');
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.websocket.onmessage = (event) => {
          try {
            const message: SignalingMessage = JSON.parse(event.data);
            this.handleSignalingMessage(message);
          } catch (error) {
            console.error('Error parsing signaling message:', error);
          }
        };

        this.websocket.onclose = () => {
          console.log('Signaling server connection closed');
          this.connectionState = 'disconnected';
          this.stopHeartbeat();
          this.attemptReconnection();
        };

        this.websocket.onerror = (error) => {
          console.error('Signaling server error:', error);
          this.connectionState = 'error';
          reject(error);
        };

        // Connection timeout
        setTimeout(() => {
          if (this.connectionState === 'connecting') {
            this.websocket?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        this.connectionState = 'error';
        reject(error);
      }
    });
  }

  // Initialize localStorage-based signaling for local network
  private initializeLocalStorageSignaling(): void {
    console.log('Using localStorage-based signaling');
    this.connectionState = 'connected';
    
    // Listen for localStorage changes (cross-tab communication)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === 'jugger-signaling') {
          try {
            const message: SignalingMessage = JSON.parse(event.newValue || '{}');
            if (message.senderId !== this.localDevice.id) {
              this.handleSignalingMessage(message);
            }
          } catch (error) {
            console.error('Error parsing localStorage signaling message:', error);
          }
        }
      });
    }

    this.startHeartbeat();
  }

  // Create a new room
  public async createRoom(): Promise<string> {
    const roomId = this.generateRoomId();
    this.currentRoomId = roomId;

    const room: Room = {
      id: roomId,
      hostId: this.localDevice.id,
      devices: [this.localDevice],
      createdAt: new Date(),
      lastActivity: new Date()
    };

    // Store room info
    if (this.config.fallbackToLocalStorage) {
      this.storeRoomInLocalStorage(room);
    }

    const message: SignalingMessage = {
      id: this.generateMessageId(),
      type: 'join-room',
      roomId,
      senderId: this.localDevice.id,
      timestamp: new Date(),
      data: { device: this.localDevice, isHost: true }
    };

    await this.sendSignalingMessage(message);
    console.log(`Created room: ${roomId}`);
    return roomId;
  }

  // Join an existing room
  public async joinRoom(roomId: string): Promise<Room> {
    this.currentRoomId = roomId;

    // Check if room exists
    const room = await this.getRoomInfo(roomId);
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    const message: SignalingMessage = {
      id: this.generateMessageId(),
      type: 'join-room',
      roomId,
      senderId: this.localDevice.id,
      timestamp: new Date(),
      data: { device: this.localDevice, isHost: false }
    };

    await this.sendSignalingMessage(message);
    console.log(`Joined room: ${roomId}`);
    return room;
  }

  // Leave current room
  public async leaveRoom(): Promise<void> {
    if (!this.currentRoomId) {
      return;
    }

    const message: SignalingMessage = {
      id: this.generateMessageId(),
      type: 'leave-room',
      roomId: this.currentRoomId,
      senderId: this.localDevice.id,
      timestamp: new Date(),
      data: { device: this.localDevice }
    };

    await this.sendSignalingMessage(message);
    this.currentRoomId = null;
  }

  // Send WebRTC signaling message
  public async sendWebRTCSignal(targetId: string, signalData: any): Promise<void> {
    if (!this.currentRoomId) {
      throw new Error('Not in a room');
    }

    const message: SignalingMessage = {
      id: this.generateMessageId(),
      type: signalData.type === 'offer' ? 'offer' : 
            signalData.type === 'answer' ? 'answer' : 'ice-candidate',
      roomId: this.currentRoomId,
      senderId: this.localDevice.id,
      targetId,
      timestamp: new Date(),
      data: signalData
    };

    await this.sendSignalingMessage(message);
  }

  // Send signaling message
  private async sendSignalingMessage(message: SignalingMessage): Promise<void> {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      // Send via WebSocket
      this.websocket.send(JSON.stringify(message));
    } else if (this.config.fallbackToLocalStorage) {
      // Send via localStorage
      this.sendViaLocalStorage(message);
    } else {
      throw new Error('No signaling connection available');
    }
  }

  // Send message via localStorage (cross-tab communication)
  private sendViaLocalStorage(message: SignalingMessage): void {
    try {
      localStorage.setItem('jugger-signaling', JSON.stringify(message));
      
      // Clear after a short delay to allow other tabs to read
      setTimeout(() => {
        const current = localStorage.getItem('jugger-signaling');
        if (current === JSON.stringify(message)) {
          localStorage.removeItem('jugger-signaling');
        }
      }, 1000);
    } catch (error) {
      console.error('Error sending via localStorage:', error);
    }
  }

  // Handle incoming signaling messages
  private handleSignalingMessage(message: SignalingMessage): void {
    // Ignore messages from self
    if (message.senderId === this.localDevice.id) {
      return;
    }

    console.log('Received signaling message:', message.type, 'from', message.senderId);

    // Forward to registered handlers
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    }

    // Handle room management messages
    switch (message.type) {
      case 'join-room':
        this.handleRoomJoin(message);
        break;
      case 'leave-room':
        this.handleRoomLeave(message);
        break;
      case 'room-update':
        this.handleRoomUpdate(message);
        break;
    }
  }

  // Handle room join
  private handleRoomJoin(message: SignalingMessage): void {
    if (message.roomId === this.currentRoomId) {
      const device: P2PDevice = message.data.device;
      console.log(`Device joined room: ${device.name}`);
      
      // Update room info
      this.updateRoomDevices(message.roomId, device, 'add');
      
      // Emit event
      this.emit('device-joined-room', { device, roomId: message.roomId });
    }
  }

  // Handle room leave
  private handleRoomLeave(message: SignalingMessage): void {
    if (message.roomId === this.currentRoomId) {
      const device: P2PDevice = message.data.device;
      console.log(`Device left room: ${device.name}`);
      
      // Update room info
      this.updateRoomDevices(message.roomId, device, 'remove');
      
      // Emit event
      this.emit('device-left-room', { device, roomId: message.roomId });
    }
  }

  // Handle room update
  private handleRoomUpdate(message: SignalingMessage): void {
    if (message.roomId === this.currentRoomId) {
      const room: Room = message.data.room;
      this.emit('room-updated', room);
    }
  }

  // Get room information
  private async getRoomInfo(roomId: string): Promise<Room | null> {
    if (this.config.fallbackToLocalStorage) {
      return this.getRoomFromLocalStorage(roomId);
    }
    
    // In a real implementation, this would query the signaling server
    return null;
  }

  // Store room in localStorage
  private storeRoomInLocalStorage(room: Room): void {
    try {
      const rooms = this.getRoomsFromLocalStorage();
      rooms[room.id] = room;
      localStorage.setItem('jugger-rooms', JSON.stringify(rooms));
    } catch (error) {
      console.error('Error storing room in localStorage:', error);
    }
  }

  // Get room from localStorage
  private getRoomFromLocalStorage(roomId: string): Room | null {
    try {
      const rooms = this.getRoomsFromLocalStorage();
      const room = rooms[roomId];
      
      if (room) {
        // Check if room has expired
        const now = new Date();
        const roomAge = now.getTime() - new Date(room.lastActivity).getTime();
        
        if (roomAge > this.config.roomTimeout) {
          delete rooms[roomId];
          localStorage.setItem('jugger-rooms', JSON.stringify(rooms));
          return null;
        }
        
        return {
          ...room,
          createdAt: new Date(room.createdAt),
          lastActivity: new Date(room.lastActivity)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting room from localStorage:', error);
      return null;
    }
  }

  // Get all rooms from localStorage
  private getRoomsFromLocalStorage(): Record<string, Room> {
    try {
      const stored = localStorage.getItem('jugger-rooms');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error getting rooms from localStorage:', error);
      return {};
    }
  }

  // Update room devices
  private updateRoomDevices(roomId: string, device: P2PDevice, action: 'add' | 'remove'): void {
    if (this.config.fallbackToLocalStorage) {
      const room = this.getRoomFromLocalStorage(roomId);
      if (room) {
        if (action === 'add') {
          const existingIndex = room.devices.findIndex(d => d.id === device.id);
          if (existingIndex === -1) {
            room.devices.push(device);
          } else {
            room.devices[existingIndex] = device;
          }
        } else {
          room.devices = room.devices.filter(d => d.id !== device.id);
        }
        
        room.lastActivity = new Date();
        this.storeRoomInLocalStorage(room);
      }
    }
  }

  // List available rooms
  public async listAvailableRooms(): Promise<Room[]> {
    if (this.config.fallbackToLocalStorage) {
      const rooms = this.getRoomsFromLocalStorage();
      return Object.values(rooms).filter(room => {
        const now = new Date();
        const roomAge = now.getTime() - new Date(room.lastActivity).getTime();
        return roomAge <= this.config.roomTimeout;
      });
    }
    
    // In a real implementation, this would query the signaling server
    return [];
  }

  // Heartbeat system
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.currentRoomId) {
        // Update room activity
        this.updateRoomActivity();
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private updateRoomActivity(): void {
    if (this.currentRoomId && this.config.fallbackToLocalStorage) {
      const room = this.getRoomFromLocalStorage(this.currentRoomId);
      if (room) {
        room.lastActivity = new Date();
        this.storeRoomInLocalStorage(room);
      }
    }
  }

  // Reconnection logic
  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      this.connectionState = 'error';
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`Attempting reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(async () => {
      try {
        await this.connectToWebSocketServer();
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.attemptReconnection();
      }
    }, delay);
  }

  // Register message handler
  public onSignalingMessage(messageType: string, handler: (message: SignalingMessage) => void): void {
    this.messageHandlers.set(messageType, handler);
  }

  // Remove message handler
  public offSignalingMessage(messageType: string): void {
    this.messageHandlers.delete(messageType);
  }

  // Get connection state
  public getConnectionState(): string {
    return this.connectionState;
  }

  // Get current room
  public getCurrentRoom(): string | null {
    return this.currentRoomId;
  }

  // Utility methods
  private generateRoomId(): string {
    return `room-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  private generateMessageId(): string {
    return `sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
  public async disconnect(): Promise<void> {
    this.stopHeartbeat();
    
    if (this.currentRoomId) {
      await this.leaveRoom();
    }
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    this.connectionState = 'disconnected';
    this.eventListeners.clear();
    this.messageHandlers.clear();
  }
}