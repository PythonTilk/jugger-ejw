// P2P Connection component for managing peer-to-peer connections
import React, { useState } from 'react';
import { useP2P } from '../hooks/useP2P';
import { DeviceType } from '../types/enums';

interface P2PConnectionProps {
  deviceName?: string;
  deviceType?: DeviceType;
  className?: string;
}

export const P2PConnection: React.FC<P2PConnectionProps> = ({
  deviceName = 'Jugger Device',
  deviceType = DeviceType.SPECTATOR,
  className = ''
}) => {
  const [roomIdInput, setRoomIdInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    status,
    error,
    isLoading,
    initialize,
    createRoom,
    joinRoom,
    leaveRoom,
    manualSync,
    forceReconnect,
    clearOfflineQueue,
    getConnectedDevices,
    clearError
  } = useP2P({
    deviceName,
    deviceType,
    enableAutoSync: true,
    syncDebugMode: false
  });

  const handleInitialize = async () => {
    try {
      await initialize();
    } catch (err) {
      console.error('Failed to initialize P2P:', err);
    }
  };

  const handleCreateRoom = async () => {
    try {
      const roomId = await createRoom();
      console.log('Created room:', roomId);
    } catch (err) {
      console.error('Failed to create room:', err);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomIdInput.trim()) {
      return;
    }

    try {
      await joinRoom(roomIdInput.trim());
      setRoomIdInput('');
    } catch (err) {
      console.error('Failed to join room:', err);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await leaveRoom();
    } catch (err) {
      console.error('Failed to leave room:', err);
    }
  };

  const handleManualSync = async () => {
    try {
      await manualSync();
    } catch (err) {
      console.error('Manual sync failed:', err);
    }
  };

  const handleForceReconnect = async () => {
    try {
      await forceReconnect();
    } catch (err) {
      console.error('Force reconnect failed:', err);
    }
  };

  const connectedDevices = getConnectedDevices();

  return (
    <div className={`p-4 border rounded-lg bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          P2P Connection
        </h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Status Display */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-medium">Status:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${
              status.isConnected 
                ? 'bg-green-100 text-green-800' 
                : status.isOffline 
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {status.isConnected ? 'Connected' : status.isOffline ? 'Offline' : 'Disconnected'}
            </span>
          </div>
          <div>
            <span className="font-medium">Role:</span>
            <span className="ml-2">
              {status.isHost ? 'Host' : 'Participant'}
            </span>
          </div>
          <div>
            <span className="font-medium">Devices:</span>
            <span className="ml-2">{status.connectedDevices}</span>
          </div>
          <div>
            <span className="font-medium">Queue:</span>
            <span className="ml-2">{status.queueSize}</span>
          </div>
        </div>
        
        {status.roomId && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <span className="font-medium text-sm">Room ID:</span>
            <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs font-mono">
              {status.roomId}
            </code>
          </div>
        )}
      </div>

      {/* Main Actions */}
      <div className="space-y-3">
        {!status.isInitialized ? (
          <button
            onClick={handleInitialize}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Initializing...' : 'Initialize P2P'}
          </button>
        ) : !status.roomId ? (
          <div className="space-y-3">
            <button
              onClick={handleCreateRoom}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Room'}
            </button>
            
            <div className="flex space-x-2">
              <input
                type="text"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                placeholder="Enter Room ID"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleJoinRoom}
                disabled={isLoading || !roomIdInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Joining...' : 'Join'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleLeaveRoom}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Leaving...' : 'Leave Room'}
          </button>
        )}
      </div>

      {/* Connected Devices */}
      {connectedDevices.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Connected Devices ({connectedDevices.length})
          </h4>
          <div className="space-y-1">
            {connectedDevices.map((device) => (
              <div key={device.id} className="flex items-center justify-between text-sm">
                <span className="text-blue-800">{device.name}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  device.type === DeviceType.REFEREE 
                    ? 'bg-purple-100 text-purple-800'
                    : device.type === DeviceType.ORGANIZER
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {device.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Controls */}
      {showAdvanced && status.isInitialized && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Advanced Controls
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleManualSync}
              disabled={isLoading}
              className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
            >
              Manual Sync
            </button>
            <button
              onClick={handleForceReconnect}
              disabled={isLoading}
              className="px-3 py-2 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50"
            >
              Force Reconnect
            </button>
            <button
              onClick={clearOfflineQueue}
              disabled={isLoading || status.queueSize === 0}
              className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
            >
              Clear Queue
            </button>
            <div className="px-3 py-2 text-sm bg-gray-100 rounded">
              {status.isReconnecting ? (
                <span className="text-orange-600">
                  Reconnecting... ({status.reconnectionAttempts})
                </span>
              ) : (
                <span className="text-gray-600">
                  Ready
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};