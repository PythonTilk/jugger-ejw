// Match-specific state management
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Match, GameEvent, JuggerTimer, MatchScore, Team } from '../types';
import { MatchStatus, GameEventType, TeamSide } from '../types/enums';
import { DEFAULT_MATCH_SETTINGS, JUGGER_SPORT_CONSTANTS, DEFAULT_JUGGER_TIMER_CONFIG } from '../types/constants';

export interface MatchState {
  // Current match data
  currentMatch: Match | null;
  
  // Match control
  isReferee: boolean;
  matchControlEnabled: boolean;
  
  // Timer state
  timerInterval: NodeJS.Timeout | null;
  
  // Match history
  recentEvents: GameEvent[];
  
  // Match statistics
  matchStats: {
    totalEvents: number;
    scoreEvents: number;
    stoneEvents: number;
    timeoutEvents: number;
  };
}

export interface MatchActions {
  // Match CRUD operations
  createMatch: (matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>) => Match;
  updateMatch: (updates: Partial<Match>) => void;
  setCurrentMatch: (match: Match | null) => void;
  loadMatch: (matchId: string) => Promise<Match | null>;
  
  // Match control
  startMatch: () => void;
  pauseMatch: () => void;
  resumeMatch: () => void;
  endMatch: () => void;
  resetMatch: () => void;
  
  // Scoring
  updateScore: (team: TeamSide, delta: number) => void;
  setScore: (team: TeamSide, score: number) => void;
  
  // Timer control
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  advanceStone: () => void;
  qwikStone: () => void;
  
  // Event management
  addEvent: (event: Omit<GameEvent, 'id' | 'timestamp'>) => void;
  removeEvent: (eventId: string) => void;
  
  // Referee controls
  setRefereeMode: (isReferee: boolean) => void;
  enableMatchControl: (enabled: boolean) => void;
  
  // Statistics
  updateMatchStats: () => void;
  
  // Utility
  generateMatchId: () => string;
  validateMatch: (match: Partial<Match>) => string[];
  isMatchComplete: () => boolean;
  getTimeRemaining: () => { stones: number; seconds: number };
}

export type MatchStore = MatchState & MatchActions;

const initialState: MatchState = {
  currentMatch: null,
  isReferee: false,
  matchControlEnabled: false,
  timerInterval: null,
  recentEvents: [],
  matchStats: {
    totalEvents: 0,
    scoreEvents: 0,
    stoneEvents: 0,
    timeoutEvents: 0,
  },
};

export const useMatchStore = create<MatchStore>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // Match CRUD operations
      createMatch: (matchData) => {
        const match: Match = {
          ...matchData,
          id: get().generateMatchId(),
          createdAt: new Date(),
          updatedAt: new Date(),
          settings: { ...DEFAULT_MATCH_SETTINGS, ...matchData.settings },
          timer: {
            ...matchData.timer,
            stones: matchData.timer?.stones ?? 0,
            seconds: matchData.timer?.seconds ?? 0,
            totalSeconds: matchData.timer?.totalSeconds ?? 0,
            isRunning: matchData.timer?.isRunning ?? false,
            isPaused: matchData.timer?.isPaused ?? false,
            config: matchData.timer?.config ?? DEFAULT_JUGGER_TIMER_CONFIG,
          },
          score: { 
            home: matchData.score?.home ?? 0, 
            away: matchData.score?.away ?? 0 
          },
          events: [],
        };
        
        set({ 
          currentMatch: match,
          recentEvents: [],
        }, false, 'createMatch');
        
        get().updateMatchStats();
        return match;
      },
      
      updateMatch: (updates) => {
        const current = get().currentMatch;
        if (!current) return;
        
        const updatedMatch = {
          ...current,
          ...updates,
          updatedAt: new Date(),
        };
        
        set({ currentMatch: updatedMatch }, false, 'updateMatch');
        get().updateMatchStats();
      },
      
      setCurrentMatch: (match) => {
        // Clear any existing timer
        const { timerInterval } = get();
        if (timerInterval) {
          clearInterval(timerInterval);
        }
        
        set({
          currentMatch: match,
          timerInterval: null,
          recentEvents: match?.events.slice(-10) || [],
        }, false, 'setCurrentMatch');
        
        get().updateMatchStats();
      },
      
      loadMatch: async (matchId) => {
        try {
          // In a real app, this would load from database/storage
          // For now, we'll try to find it in the app store's active matches
          const { useAppStore } = await import('./appStore');
          const appState = useAppStore.getState();
          const match = appState.activeMatches.find(m => m.id === matchId);
          
          if (match) {
            get().setCurrentMatch(match);
            return match;
          }
          
          // Could also try loading from localStorage or IndexedDB here
          console.warn(`Match with ID ${matchId} not found`);
          return null;
        } catch (error) {
          console.error('Failed to load match:', error);
          return null;
        }
      },
      
      // Match control
      startMatch: () => {
        const match = get().currentMatch;
        if (!match || match.status !== MatchStatus.PENDING) return;
        
        get().updateMatch({ 
          status: MatchStatus.ACTIVE,
          timer: { ...match.timer, startedAt: new Date() }
        });
        
        get().addEvent({
          matchId: match.id,
          type: GameEventType.MATCH_START,
          stoneCount: match.timer.stones,
          data: {},
        });
        
        get().startTimer();
      },
      
      pauseMatch: () => {
        const match = get().currentMatch;
        if (!match || match.status !== MatchStatus.ACTIVE) return;
        
        get().updateMatch({ 
          status: MatchStatus.PAUSED,
          timer: { ...match.timer, pausedAt: new Date() }
        });
        
        get().addEvent({
          matchId: match.id,
          type: GameEventType.MATCH_PAUSE,
          stoneCount: match.timer.stones,
          data: {},
        });
        
        get().pauseTimer();
      },
      
      resumeMatch: () => {
        const match = get().currentMatch;
        if (!match || match.status !== MatchStatus.PAUSED) return;
        
        get().updateMatch({ 
          status: MatchStatus.ACTIVE,
          timer: { ...match.timer, pausedAt: undefined }
        });
        
        get().addEvent({
          matchId: match.id,
          type: GameEventType.MATCH_RESUME,
          stoneCount: match.timer.stones,
          data: {},
        });
        
        get().resumeTimer();
      },
      
      endMatch: () => {
        const match = get().currentMatch;
        if (!match) return;
        
        get().updateMatch({ 
          status: MatchStatus.COMPLETED,
          timer: { ...match.timer, completedAt: new Date(), isRunning: false }
        });
        
        get().addEvent({
          matchId: match.id,
          type: GameEventType.MATCH_END,
          stoneCount: match.timer.stones,
          data: { finalScore: match.score },
        });
        
        get().pauseTimer();
      },
      
      resetMatch: () => {
        const match = get().currentMatch;
        if (!match) return;
        
        get().updateMatch({
          status: MatchStatus.PENDING,
          score: { home: 0, away: 0 },
          timer: {
            stones: 0,
            seconds: 0,
            totalSeconds: 0,
            isRunning: false,
            isPaused: false,
            startedAt: undefined,
            pausedAt: undefined,
            completedAt: undefined,
            config: DEFAULT_JUGGER_TIMER_CONFIG,
          },
          events: [],
        });
        
        set({ recentEvents: [] }, false, 'resetMatch');
        get().pauseTimer();
      },
      
      // Scoring
      updateScore: (team, delta) => {
        const match = get().currentMatch;
        if (!match) return;
        
        const newScore = Math.max(0, match.score[team] + delta);
        get().updateMatch({
          score: { ...match.score, [team]: newScore }
        });
        
        get().addEvent({
          matchId: match.id,
          type: GameEventType.SCORE,
          team,
          stoneCount: match.timer.stones,
          data: { delta, newScore },
        });
      },
      
      setScore: (team, score) => {
        const match = get().currentMatch;
        if (!match) return;
        
        const newScore = Math.max(0, score);
        get().updateMatch({
          score: { ...match.score, [team]: newScore }
        });
        
        get().addEvent({
          matchId: match.id,
          type: GameEventType.SCORE,
          team,
          stoneCount: match.timer.stones,
          data: { newScore, previousScore: match.score[team] },
        });
      },
      
      // Timer control
      startTimer: () => {
        const match = get().currentMatch;
        if (!match || match.timer.isRunning) return;
        
        get().updateMatch({
          timer: { ...match.timer, isRunning: true, isPaused: false }
        });
        
        const interval = setInterval(() => {
          const currentMatch = get().currentMatch;
          if (!currentMatch || !currentMatch.timer.isRunning) return;
          
          const newSeconds = currentMatch.timer.seconds + 0.1; // Update every 100ms
          const stoneInterval = currentMatch.settings.stoneInterval;
          
          if (newSeconds >= stoneInterval) {
            // Advance to next stone
            get().advanceStone();
          } else {
            get().updateMatch({
              timer: {
                ...currentMatch.timer,
                seconds: newSeconds,
                totalSeconds: currentMatch.timer.totalSeconds + 0.1,
              }
            });
          }
        }, 100);
        
        set({ timerInterval: interval }, false, 'startTimer');
      },
      
      pauseTimer: () => {
        const { timerInterval } = get();
        if (timerInterval) {
          clearInterval(timerInterval);
          set({ timerInterval: null }, false, 'pauseTimer');
        }
        
        const match = get().currentMatch;
        if (match) {
          get().updateMatch({
            timer: { ...match.timer, isRunning: false, isPaused: true }
          });
        }
      },
      
      resumeTimer: () => {
        const match = get().currentMatch;
        if (!match || !match.timer.isPaused) return;
        
        get().startTimer();
      },
      
      resetTimer: () => {
        get().pauseTimer();
        
        const match = get().currentMatch;
        if (match) {
          get().updateMatch({
            timer: {
              ...match.timer,
              stones: 0,
              seconds: 0,
              totalSeconds: 0,
              isRunning: false,
              isPaused: false,
            }
          });
        }
      },
      
      advanceStone: () => {
        const match = get().currentMatch;
        if (!match) return;
        
        const newStones = match.timer.stones + 1;
        
        get().updateMatch({
          timer: {
            ...match.timer,
            stones: newStones,
            seconds: 0,
          }
        });
        
        get().addEvent({
          matchId: match.id,
          type: GameEventType.STONE,
          stoneCount: newStones,
          data: {},
        });
        
        // Check if match is complete
        if (newStones >= match.settings.maxStones) {
          get().endMatch();
        }
      },
      
      qwikStone: () => {
        const match = get().currentMatch;
        if (!match || !match.settings.allowQwik) return;
        
        get().addEvent({
          matchId: match.id,
          type: GameEventType.QWIK,
          stoneCount: match.timer.stones,
          data: {},
        });
        
        // Immediately advance stone for qwik
        get().advanceStone();
      },
      
      // Event management
      addEvent: (eventData) => {
        const event: GameEvent = {
          ...eventData,
          id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
        };
        
        const match = get().currentMatch;
        if (match) {
          get().updateMatch({
            events: [...match.events, event]
          });
          
          set((state) => ({
            recentEvents: [...state.recentEvents, event].slice(-10)
          }), false, 'addEvent');
        }
      },
      
      removeEvent: (eventId) => {
        const match = get().currentMatch;
        if (match) {
          get().updateMatch({
            events: match.events.filter(e => e.id !== eventId)
          });
          
          set((state) => ({
            recentEvents: state.recentEvents.filter(e => e.id !== eventId)
          }), false, 'removeEvent');
        }
      },
      
      // Referee controls
      setRefereeMode: (isReferee) => {
        set({ isReferee, matchControlEnabled: isReferee }, false, 'setRefereeMode');
      },
      
      enableMatchControl: (enabled) => {
        set({ matchControlEnabled: enabled }, false, 'enableMatchControl');
      },
      
      // Statistics
      updateMatchStats: () => {
        const match = get().currentMatch;
        if (!match) {
          set({
            matchStats: {
              totalEvents: 0,
              scoreEvents: 0,
              stoneEvents: 0,
              timeoutEvents: 0,
            }
          }, false, 'updateMatchStats');
          return;
        }
        
        const totalEvents = match.events.length;
        const scoreEvents = match.events.filter(e => e.type === GameEventType.SCORE).length;
        const stoneEvents = match.events.filter(e => e.type === GameEventType.STONE).length;
        const timeoutEvents = match.events.filter(e => e.type === GameEventType.TIMEOUT).length;
        
        set({
          matchStats: {
            totalEvents,
            scoreEvents,
            stoneEvents,
            timeoutEvents,
          }
        }, false, 'updateMatchStats');
      },
      
      // Utility
      generateMatchId: () => {
        return `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      },
      
      validateMatch: (match) => {
        const errors: string[] = [];
        
        if (!match.homeTeam || !match.awayTeam) {
          errors.push('Both home and away teams are required');
        }
        
        if (match.homeTeam?.id === match.awayTeam?.id) {
          errors.push('Home and away teams must be different');
        }
        
        return errors;
      },
      
      isMatchComplete: () => {
        const match = get().currentMatch;
        if (!match) return false;
        
        return match.status === MatchStatus.COMPLETED || 
               match.timer.stones >= match.settings.maxStones;
      },
      
      getTimeRemaining: () => {
        const match = get().currentMatch;
        if (!match) return { stones: 0, seconds: 0 };
        
        const remainingStones = Math.max(0, match.settings.maxStones - match.timer.stones);
        const remainingSeconds = Math.max(0, match.settings.stoneInterval - match.timer.seconds);
        
        return { stones: remainingStones, seconds: remainingSeconds };
      },
    }),
    {
      name: 'match-store',
    }
  )
);