// Tournament-specific state management
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Tournament, Team, TournamentSettings } from '../types';
import { TournamentFormat } from '../types/enums';
import { DEFAULT_TOURNAMENT_SETTINGS } from '../types/constants';
import { generateTournamentMatches } from '../utils/matchGenerator';

export interface TournamentState {
  // Current tournament data
  currentTournament: Tournament | null;
  teams: Team[];
  
  // Tournament creation/editing
  isCreating: boolean;
  isEditing: boolean;
  editingTournament: Partial<Tournament> | null;
  
  // Tournament statistics
  tournamentStats: {
    totalMatches: number;
    completedMatches: number;
    activeMatches: number;
    totalTeams: number;
  };
}

export interface TournamentActions {
  // Tournament CRUD operations
  createTournament: (tournamentData: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'>) => Tournament;
  updateTournament: (updates: Partial<Tournament>) => void;
  deleteTournament: () => void;
  setCurrentTournament: (tournament: Tournament | null) => void;
  
  // Team management
  addTeam: (team: Omit<Team, 'id'>) => void;
  updateTeam: (teamId: string, updates: Partial<Team>) => void;
  removeTeam: (teamId: string) => void;
  setTeams: (teams: Team[]) => void;
  
  // Tournament editing
  startCreating: () => void;
  startEditing: (tournament: Tournament) => void;
  cancelEditing: () => void;
  saveEditing: () => Tournament | null;
  updateEditingTournament: (updates: Partial<Tournament>) => void;
  
  // Statistics
  updateTournamentStats: () => void;
  
  // Utility
  generateTournamentId: () => string;
  validateTournament: (tournament: Partial<Tournament>) => string[];
}

export type TournamentStore = TournamentState & TournamentActions;

const initialState: TournamentState = {
  currentTournament: null,
  teams: [],
  isCreating: false,
  isEditing: false,
  editingTournament: null,
  tournamentStats: {
    totalMatches: 0,
    completedMatches: 0,
    activeMatches: 0,
    totalTeams: 0,
  },
};

export const useTournamentStore = create<TournamentStore>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // Tournament CRUD operations
      createTournament: (tournamentData) => {
        const tournament: Tournament = {
          ...tournamentData,
          id: get().generateTournamentId(),
          createdAt: new Date(),
          updatedAt: new Date(),
          settings: { ...DEFAULT_TOURNAMENT_SETTINGS, ...tournamentData.settings },
        };
        
        // Generate matches if teams are provided
        if (tournament.teams.length >= 2) {
          try {
            const matches = generateTournamentMatches(tournament, {
              generateAllMatches: true,
              startFirstMatch: false,
            });
            tournament.matches = matches;
          } catch (error) {
            console.warn('Failed to generate matches:', error);
            tournament.matches = [];
          }
        }
        
        set({ 
          currentTournament: tournament,
          teams: tournament.teams,
          isCreating: false,
          editingTournament: null,
        }, false, 'createTournament');
        
        get().updateTournamentStats();
        return tournament;
      },
      
      updateTournament: (updates) => {
        const current = get().currentTournament;
        if (!current) return;
        
        const updatedTournament = {
          ...current,
          ...updates,
          updatedAt: new Date(),
        };
        
        set({ 
          currentTournament: updatedTournament,
          teams: updatedTournament.teams,
        }, false, 'updateTournament');
        
        get().updateTournamentStats();
      },
      
      deleteTournament: () => {
        set({
          currentTournament: null,
          teams: [],
          isEditing: false,
          editingTournament: null,
        }, false, 'deleteTournament');
      },
      
      setCurrentTournament: (tournament) => {
        set({
          currentTournament: tournament,
          teams: tournament?.teams || [],
        }, false, 'setCurrentTournament');
        
        get().updateTournamentStats();
      },
      
      // Team management
      addTeam: (teamData) => {
        const team: Team = {
          ...teamData,
          id: `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        
        const currentTournament = get().currentTournament;
        if (currentTournament) {
          const updatedTeams = [...currentTournament.teams, team];
          get().updateTournament({ teams: updatedTeams });
        } else {
          set((state) => ({ teams: [...state.teams, team] }), false, 'addTeam');
        }
      },
      
      updateTeam: (teamId, updates) => {
        const currentTournament = get().currentTournament;
        if (currentTournament) {
          const updatedTeams = currentTournament.teams.map(team =>
            team.id === teamId ? { ...team, ...updates } : team
          );
          get().updateTournament({ teams: updatedTeams });
        } else {
          set((state) => ({
            teams: state.teams.map(team =>
              team.id === teamId ? { ...team, ...updates } : team
            )
          }), false, 'updateTeam');
        }
      },
      
      removeTeam: (teamId) => {
        const currentTournament = get().currentTournament;
        if (currentTournament) {
          const updatedTeams = currentTournament.teams.filter(team => team.id !== teamId);
          get().updateTournament({ teams: updatedTeams });
        } else {
          set((state) => ({
            teams: state.teams.filter(team => team.id !== teamId)
          }), false, 'removeTeam');
        }
      },
      
      setTeams: (teams) => {
        const currentTournament = get().currentTournament;
        if (currentTournament) {
          get().updateTournament({ teams });
        } else {
          set({ teams }, false, 'setTeams');
        }
      },
      
      // Tournament editing
      startCreating: () => {
        set({
          isCreating: true,
          isEditing: false,
          editingTournament: {
            name: '',
            description: '',
            format: TournamentFormat.SINGLE_ELIMINATION,
            teams: [],
            matches: [],
            settings: DEFAULT_TOURNAMENT_SETTINGS,
          },
        }, false, 'startCreating');
      },
      
      startEditing: (tournament) => {
        set({
          isEditing: true,
          isCreating: false,
          editingTournament: { ...tournament },
        }, false, 'startEditing');
      },
      
      cancelEditing: () => {
        set({
          isCreating: false,
          isEditing: false,
          editingTournament: null,
        }, false, 'cancelEditing');
      },
      
      saveEditing: () => {
        const { editingTournament, isCreating } = get();
        if (!editingTournament) return null;
        
        let tournament: Tournament;
        
        if (isCreating) {
          tournament = get().createTournament(editingTournament as Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'>);
        } else {
          get().updateTournament(editingTournament);
          tournament = get().currentTournament!;
        }
        
        set({
          isCreating: false,
          isEditing: false,
          editingTournament: null,
        }, false, 'saveEditing');
        
        return tournament;
      },
      
      updateEditingTournament: (updates) => {
        set((state) => ({
          editingTournament: state.editingTournament 
            ? { ...state.editingTournament, ...updates }
            : null
        }), false, 'updateEditingTournament');
      },
      
      // Statistics
      updateTournamentStats: () => {
        const tournament = get().currentTournament;
        if (!tournament) {
          set({
            tournamentStats: {
              totalMatches: 0,
              completedMatches: 0,
              activeMatches: 0,
              totalTeams: 0,
            }
          }, false, 'updateTournamentStats');
          return;
        }
        
        const totalMatches = tournament.matches.length;
        const completedMatches = tournament.matches.filter(m => m.status === 'completed').length;
        const activeMatches = tournament.matches.filter(m => m.status === 'active').length;
        const totalTeams = tournament.teams.length;
        
        set({
          tournamentStats: {
            totalMatches,
            completedMatches,
            activeMatches,
            totalTeams,
          }
        }, false, 'updateTournamentStats');
      },
      
      // Utility
      generateTournamentId: () => {
        return `tournament-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      },
      
      validateTournament: (tournament) => {
        const errors: string[] = [];
        
        if (!tournament.name || tournament.name.trim().length < 3) {
          errors.push('Tournament name must be at least 3 characters long');
        }
        
        if (!tournament.format) {
          errors.push('Tournament format is required');
        }
        
        if (!tournament.teams || tournament.teams.length < 2) {
          errors.push('Tournament must have at least 2 teams');
        }
        
        return errors;
      },
    }),
    {
      name: 'tournament-store',
    }
  )
);