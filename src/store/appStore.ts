// Main application state store using Zustand
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Tournament, Match, Team } from '../types';
import { Language, Theme, DeviceType, ConnectionStatus } from '../types/enums';

// Device information for P2P synchronization
export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  isHost: boolean;
  lastSeen: Date;
  connectionStatus: ConnectionStatus;
}

// Main application state interface
export interface AppState {
  // Tournament State
  tournaments: Tournament[];
  currentTournament: Tournament | null;
  
  // Match State
  activeMatches: Match[];
  currentMatch: Match | null;
  
  // UI State
  currentTheme: Theme;
  currentLanguage: Language;
  isOffline: boolean;
  
  // P2P State
  connectedDevices: Device[];
  currentDevice: Device | null;
  isHost: boolean;
  roomCode: string | null;
  
  // Loading and Error States
  isLoading: boolean;
  error: string | null;
}

// Application actions interface
export interface AppActions {
  // Tournament Actions
  setTournaments: (tournaments: Tournament[]) => void;
  addTournament: (tournament: Tournament) => void;
  updateTournament: (tournamentId: string, updates: Partial<Tournament>) => void;
  deleteTournament: (tournamentId: string) => void;
  setCurrentTournament: (tournament: Tournament | null) => void;
  
  // Match Actions
  setActiveMatches: (matches: Match[]) => void;
  addMatch: (match: Match) => void;
  updateMatch: (matchId: string, updates: Partial<Match>) => void;
  setCurrentMatch: (match: Match | null) => void;
  
  // UI Actions
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setOfflineStatus: (isOffline: boolean) => void;
  
  // P2P Actions
  setConnectedDevices: (devices: Device[]) => void;
  addDevice: (device: Device) => void;
  removeDevice: (deviceId: string) => void;
  updateDevice: (deviceId: string, updates: Partial<Device>) => void;
  setCurrentDevice: (device: Device | null) => void;
  setHostStatus: (isHost: boolean) => void;
  setRoomCode: (roomCode: string | null) => void;
  
  // Utility Actions
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Sync Actions
  syncState: (partialState: Partial<AppState>) => void;
  resetState: () => void;
}

// Combined state and actions type
export type AppStore = AppState & AppActions;

// Initial state
const initialState: AppState = {
  tournaments: [],
  currentTournament: null,
  activeMatches: [],
  currentMatch: null,
  currentTheme: Theme.DEFAULT,
  currentLanguage: Language.GERMAN, // German as default per requirements
  isOffline: false,
  connectedDevices: [],
  currentDevice: null,
  isHost: false,
  roomCode: null,
  isLoading: false,
  error: null,
};

// Create the main app store
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Tournament Actions
        setTournaments: (tournaments) => 
          set({ tournaments }, false, 'setTournaments'),
        
        addTournament: (tournament) => 
          set((state) => ({ 
            tournaments: [...state.tournaments, tournament] 
          }), false, 'addTournament'),
        
        updateTournament: (tournamentId, updates) => 
          set((state) => ({
            tournaments: state.tournaments.map(t => 
              t.id === tournamentId ? { ...t, ...updates, updatedAt: new Date() } : t
            ),
            currentTournament: state.currentTournament?.id === tournamentId 
              ? { ...state.currentTournament, ...updates, updatedAt: new Date() }
              : state.currentTournament
          }), false, 'updateTournament'),
        
        deleteTournament: (tournamentId) => 
          set((state) => ({
            tournaments: state.tournaments.filter(t => t.id !== tournamentId),
            currentTournament: state.currentTournament?.id === tournamentId 
              ? null 
              : state.currentTournament,
            activeMatches: state.activeMatches.filter(m => m.tournamentId !== tournamentId)
          }), false, 'deleteTournament'),
        
        setCurrentTournament: (tournament) => 
          set((state) => ({ 
            currentTournament: tournament,
            activeMatches: tournament?.matches || state.activeMatches
          }), false, 'setCurrentTournament'),
        
        // Match Actions
        setActiveMatches: (matches) => 
          set({ activeMatches: matches }, false, 'setActiveMatches'),
        
        addMatch: (match) => 
          set((state) => ({ 
            activeMatches: [...state.activeMatches, match] 
          }), false, 'addMatch'),
        
        updateMatch: (matchId, updates) => 
          set((state) => ({
            activeMatches: state.activeMatches.map(m => 
              m.id === matchId ? { ...m, ...updates, updatedAt: new Date() } : m
            ),
            currentMatch: state.currentMatch?.id === matchId 
              ? { ...state.currentMatch, ...updates, updatedAt: new Date() }
              : state.currentMatch
          }), false, 'updateMatch'),
        
        setCurrentMatch: (match) => 
          set({ currentMatch: match }, false, 'setCurrentMatch'),
        
        // UI Actions
        setTheme: (theme) => 
          set({ currentTheme: theme }, false, 'setTheme'),
        
        setLanguage: (language) => 
          set({ currentLanguage: language }, false, 'setLanguage'),
        
        setOfflineStatus: (isOffline) => 
          set({ isOffline }, false, 'setOfflineStatus'),
        
        // P2P Actions
        setConnectedDevices: (devices) => 
          set({ connectedDevices: devices }, false, 'setConnectedDevices'),
        
        addDevice: (device) => 
          set((state) => ({ 
            connectedDevices: [...state.connectedDevices, device] 
          }), false, 'addDevice'),
        
        removeDevice: (deviceId) => 
          set((state) => ({
            connectedDevices: state.connectedDevices.filter(d => d.id !== deviceId)
          }), false, 'removeDevice'),
        
        updateDevice: (deviceId, updates) => 
          set((state) => ({
            connectedDevices: state.connectedDevices.map(d => 
              d.id === deviceId ? { ...d, ...updates, lastSeen: new Date() } : d
            )
          }), false, 'updateDevice'),
        
        setCurrentDevice: (device) => 
          set({ currentDevice: device }, false, 'setCurrentDevice'),
        
        setHostStatus: (isHost) => 
          set({ isHost }, false, 'setHostStatus'),
        
        setRoomCode: (roomCode) => 
          set({ roomCode }, false, 'setRoomCode'),
        
        // Utility Actions
        setLoading: (isLoading) => 
          set({ isLoading }, false, 'setLoading'),
        
        setError: (error) => 
          set({ error }, false, 'setError'),
        
        clearError: () => 
          set({ error: null }, false, 'clearError'),
        
        // Sync Actions
        syncState: (partialState) => 
          set((state) => ({ ...state, ...partialState }), false, 'syncState'),
        
        resetState: () => 
          set(initialState, false, 'resetState'),
      }),
      {
        name: 'jugger-app-storage',
        partialize: (state) => ({
          // Only persist certain parts of the state
          tournaments: state.tournaments,
          currentTheme: state.currentTheme,
          currentLanguage: state.currentLanguage,
          currentDevice: state.currentDevice,
        }),
      }
    ),
    {
      name: 'jugger-app-store',
    }
  )
);