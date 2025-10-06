// Store hooks that integrate Zustand with database and sync layer
import { useEffect, useCallback } from 'react';
import { useAppStore } from './appStore';
import { useTournamentStore } from './tournamentStore';
import { useMatchStore } from './matchStore';
import { useUIStore } from './uiStore';
import { syncManager, type SyncStatus } from '../lib/sync';
import { initializeDatabase } from '../lib/database';
import type { Tournament, Match, Team } from '../types';

// Hook for initializing the application data layer
export const useInitializeApp = () => {
  const setLoading = useAppStore(state => state.setLoading);
  const setError = useAppStore(state => state.setError);
  const setTournaments = useAppStore(state => state.setTournaments);
  const setActiveMatches = useAppStore(state => state.setActiveMatches);
  const setOfflineStatus = useAppStore(state => state.setOfflineStatus);

  const initializeApp = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize database
      await initializeDatabase();

      // Load initial data from database
      const [tournaments, matches] = await Promise.all([
        syncManager.loadTournaments(),
        syncManager.loadMatches(),
      ]);

      // Update stores with loaded data
      setTournaments(tournaments);
      setActiveMatches(matches);

      // Set initial offline status
      setOfflineStatus(!navigator.onLine);

      console.log('Application initialized successfully');
    } catch (error) {
      console.error('Failed to initialize application:', error);
      setError('Failed to initialize application. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, setTournaments, setActiveMatches, setOfflineStatus]);

  return { initializeApp };
};

// Hook for tournament operations with automatic sync
export const useTournamentOperations = () => {
  const {
    tournaments,
    currentTournament,
    addTournament,
    updateTournament,
    deleteTournament,
    setCurrentTournament,
  } = useAppStore();

  const { addNotification } = useUIStore();

  const createTournament = useCallback(async (tournamentData: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const tournament: Tournament = {
        ...tournamentData,
        id: `tournament-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Update store immediately
      addTournament(tournament);
      
      // Sync to database
      await syncManager.syncTournament('create', tournament);

      addNotification({
        type: 'success',
        title: 'Tournament Created',
        message: `Tournament "${tournament.name}" has been created successfully.`,
        duration: 3000,
      });

      return tournament;
    } catch (error) {
      console.error('Error creating tournament:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create tournament. It will be synced when connection is restored.',
        duration: 5000,
      });
      throw error;
    }
  }, [addTournament, addNotification]);

  const updateTournamentData = useCallback(async (tournamentId: string, updates: Partial<Tournament>) => {
    try {
      // Update store immediately
      updateTournament(tournamentId, updates);
      
      // Sync to database
      await syncManager.syncTournament('update', { id: tournamentId, updates });

      addNotification({
        type: 'success',
        title: 'Tournament Updated',
        message: 'Tournament has been updated successfully.',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error updating tournament:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update tournament. Changes will be synced when connection is restored.',
        duration: 5000,
      });
    }
  }, [updateTournament, addNotification]);

  const deleteTournamentData = useCallback(async (tournamentId: string) => {
    try {
      // Update store immediately
      deleteTournament(tournamentId);
      
      // Sync to database
      await syncManager.syncTournament('delete', { id: tournamentId });

      addNotification({
        type: 'success',
        title: 'Tournament Deleted',
        message: 'Tournament has been deleted successfully.',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error deleting tournament:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete tournament. Changes will be synced when connection is restored.',
        duration: 5000,
      });
    }
  }, [deleteTournament, addNotification]);

  return {
    tournaments,
    currentTournament,
    createTournament,
    updateTournament: updateTournamentData,
    deleteTournament: deleteTournamentData,
    setCurrentTournament,
  };
};

// Hook for match operations with automatic sync
export const useMatchOperations = () => {
  const {
    activeMatches,
    currentMatch,
    addMatch,
    updateMatch,
    setCurrentMatch,
  } = useAppStore();

  const { addNotification } = useUIStore();

  const createMatch = useCallback(async (matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const match: Match = {
        ...matchData,
        id: `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        events: [],
      };

      // Update store immediately
      addMatch(match);
      
      // Sync to database
      await syncManager.syncMatch('create', match);

      addNotification({
        type: 'success',
        title: 'Match Created',
        message: `Match between ${match.homeTeam.name} and ${match.awayTeam.name} has been created.`,
        duration: 3000,
      });

      return match;
    } catch (error) {
      console.error('Error creating match:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create match. It will be synced when connection is restored.',
        duration: 5000,
      });
      throw error;
    }
  }, [addMatch, addNotification]);

  const updateMatchData = useCallback(async (matchId: string, updates: Partial<Match>) => {
    try {
      // Update store immediately
      updateMatch(matchId, updates);
      
      // Sync to database
      await syncManager.syncMatch('update', { id: matchId, updates });
    } catch (error) {
      console.error('Error updating match:', error);
      addNotification({
        type: 'error',
        title: 'Sync Error',
        message: 'Failed to sync match updates. Changes will be synced when connection is restored.',
        duration: 3000,
      });
    }
  }, [updateMatch, addNotification]);

  return {
    activeMatches,
    currentMatch,
    createMatch,
    updateMatch: updateMatchData,
    setCurrentMatch,
  };
};

// Hook for sync status monitoring
export const useSyncStatus = () => {
  const setOfflineStatus = useAppStore(state => state.setOfflineStatus);
  const { addNotification } = useUIStore();

  useEffect(() => {
    const handleStatusChange = (status: SyncStatus) => {
      setOfflineStatus(!status.isOnline);

      // Show notifications for sync status changes
      if (status.error) {
        addNotification({
          type: 'error',
          title: 'Sync Error',
          message: status.error,
          duration: 5000,
        });
      }

      if (status.isOnline && status.pendingOperations > 0) {
        addNotification({
          type: 'info',
          title: 'Syncing Data',
          message: `Syncing ${status.pendingOperations} pending operations...`,
          duration: 3000,
        });
      }
    };

    syncManager.addStatusListener(handleStatusChange);

    return () => {
      syncManager.removeStatusListener(handleStatusChange);
    };
  }, [setOfflineStatus, addNotification]);

  return {
    syncStatus: syncManager.getStatus(),
    forceSync: () => syncManager.forcSync(),
  };
};

// Hook for loading tournament data
export const useTournamentData = (tournamentId?: string) => {
  const setCurrentTournament = useAppStore(state => state.setCurrentTournament);
  const setActiveMatches = useAppStore(state => state.setActiveMatches);
  const setLoading = useAppStore(state => state.setLoading);

  const loadTournamentData = useCallback(async (id?: string) => {
    if (!id) return;

    try {
      setLoading(true);

      const [matches] = await Promise.all([
        syncManager.loadMatches(id),
      ]);

      setActiveMatches(matches);
    } catch (error) {
      console.error('Error loading tournament data:', error);
    } finally {
      setLoading(false);
    }
  }, [setActiveMatches, setLoading]);

  useEffect(() => {
    if (tournamentId) {
      loadTournamentData(tournamentId);
    }
  }, [tournamentId, loadTournamentData]);

  return { loadTournamentData };
};

// Hook for automatic data refresh
export const useAutoRefresh = (intervalMs: number = 30000) => {
  const setTournaments = useAppStore(state => state.setTournaments);
  const setActiveMatches = useAppStore(state => state.setActiveMatches);

  useEffect(() => {
    const refreshData = async () => {
      try {
        const [tournaments, matches] = await Promise.all([
          syncManager.loadTournaments(),
          syncManager.loadMatches(),
        ]);

        setTournaments(tournaments);
        setActiveMatches(matches);
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    };

    const interval = setInterval(refreshData, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs, setTournaments, setActiveMatches]);
};

// Hook for persisting UI state
export const usePersistUIState = () => {
  const { currentTheme, currentLanguage } = useUIStore();

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    // Apply language to document
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);
};