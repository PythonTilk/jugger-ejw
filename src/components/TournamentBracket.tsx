'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BracketVisualization } from './BracketVisualization';
import { TournamentExport } from './TournamentExport';
import { BracketGenerator } from '../utils/bracketGenerator';
import { StandingsCalculator } from '../utils/standingsCalculator';
import type { Tournament, Team } from '../types/tournament';
import type { Bracket, BracketGenerationOptions, TournamentStandings } from '../types/bracket';
import { TournamentFormat, MatchStatus } from '../types/enums';
import { useTournamentStore } from '../store/tournamentStore';
import { useMatchStore } from '../store/matchStore';

interface TournamentBracketProps {
  tournament: Tournament;
  onMatchClick?: (matchId: string) => void;
  onGenerateBracket?: (bracket: Bracket) => void;
}

export const TournamentBracket: React.FC<TournamentBracketProps> = ({
  tournament,
  onMatchClick,
  onGenerateBracket
}) => {
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [showStandings, setShowStandings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [bracketOptions, setBracketOptions] = useState<BracketGenerationOptions>({
    format: tournament.format,
    teams: tournament.teams,
    seedingMethod: 'manual',
    includeThirdPlace: false
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { updateTournament } = useTournamentStore();
  const { currentMatch } = useMatchStore();

  // Calculate standings for the current tournament
  const standings = useMemo<TournamentStandings[]>(() => {
    if (!tournament.teams.length) return [];
    
    return StandingsCalculator.calculateStandings(tournament.teams, tournament.matches);
  }, [tournament.teams, tournament.matches]);

  // Generate initial bracket if tournament has teams
  useEffect(() => {
    if (tournament.teams.length >= 2 && !bracket) {
      handleGenerateBracket();
    }
  }, [tournament.teams.length]);

  const handleGenerateBracket = async () => {
    if (tournament.teams.length < 2) {
      setError('At least 2 teams are required to generate a bracket');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const newBracket = BracketGenerator.generateBracket({
        ...bracketOptions,
        teams: tournament.teams
      });

      setBracket(newBracket);
      
      if (onGenerateBracket) {
        onGenerateBracket(newBracket);
      }

      // Update tournament with generated matches if needed
      if (newBracket.rounds.length > 0) {
        const generatedMatches = newBracket.rounds
          .flatMap(round => round.matches)
          .filter(match => match.team1 && match.team2)
          .map(bracketMatch => ({
            id: bracketMatch.id,
            tournamentId: tournament.id,
            homeTeam: bracketMatch.team1!,
            awayTeam: bracketMatch.team2!,
            score: { home: 0, away: 0 },
            timer: {
              stones: tournament.settings.matchDuration || 100,
              seconds: 0,
              isRunning: false,
              totalSeconds: 0,
              isPaused: false,
              config: {
                maxStones: tournament.settings.matchDuration || 100,
                stoneIntervalMs: (tournament.settings.stoneInterval || 2.1) * 1000,
                allowQwik: tournament.settings.allowQwik || true,
                autoAdvanceStones: false
              }
            },
            status: MatchStatus.PENDING,
            events: [],
            settings: {
              maxStones: tournament.settings.matchDuration || 100,
              stoneInterval: tournament.settings.stoneInterval || 2.1,
              allowQwik: tournament.settings.allowQwik || true,
              enableTimeouts: true,
              maxTimeouts: tournament.settings.maxTimeouts || 2,
              timeoutDuration: tournament.settings.timeoutDuration || 60
            },
            createdAt: new Date(),
            updatedAt: new Date()
          }));

        updateTournament({
          matches: [...tournament.matches, ...generatedMatches]
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate bracket');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptionsChange = (updates: Partial<BracketGenerationOptions>) => {
    setBracketOptions(prev => ({ ...prev, ...updates }));
  };

  const canShowStandings = tournament.format === TournamentFormat.ROUND_ROBIN || 
                          standings.some(s => s.matchesPlayed > 0);

  return (
    <div className="tournament-bracket">
      <div className="bracket-header">
        <div className="bracket-title">
          <h2>{tournament.name} - Tournament Bracket</h2>
          <p className="tournament-format">
            Format: {tournament.format.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </p>
        </div>

        <div className="bracket-controls">
          {canShowStandings && (
            <button
              className={`btn ${showStandings ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowStandings(!showStandings)}
            >
              {showStandings ? 'Hide Standings' : 'Show Standings'}
            </button>
          )}
          
          <button
            className={`btn ${showExport ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowExport(!showExport)}
          >
            {showExport ? 'Hide Export' : 'Export Results'}
          </button>
          
          <button
            className="btn btn-primary"
            onClick={handleGenerateBracket}
            disabled={isGenerating || tournament.teams.length < 2}
          >
            {isGenerating ? 'Generating...' : 'Regenerate Bracket'}
          </button>
        </div>
      </div>

      {tournament.teams.length < 2 && (
        <div className="bracket-empty">
          <p>Add at least 2 teams to generate a tournament bracket.</p>
        </div>
      )}

      {error && (
        <div className="bracket-error">
          <p>Error: {error}</p>
        </div>
      )}

      {showExport && (
        <TournamentExport
          tournament={tournament}
          matches={tournament.matches}
          onClose={() => setShowExport(false)}
        />
      )}

      {!showExport && (
        <>
          <BracketOptions
            options={bracketOptions}
            onChange={handleOptionsChange}
            disabled={isGenerating}
            format={tournament.format}
          />

          {bracket && (
            <BracketVisualization
              bracket={bracket}
              onMatchClick={onMatchClick}
              showStandings={showStandings}
              standings={standings}
            />
          )}
        </>
      )}

      {standings.length > 0 && (
        <TournamentStats
          tournament={tournament}
          standings={standings}
        />
      )}
    </div>
  );
};

interface BracketOptionsProps {
  options: BracketGenerationOptions;
  onChange: (updates: Partial<BracketGenerationOptions>) => void;
  disabled: boolean;
  format: TournamentFormat;
}

const BracketOptions: React.FC<BracketOptionsProps> = ({
  options,
  onChange,
  disabled,
  format
}) => {
  const showSeedingOptions = format !== TournamentFormat.ROUND_ROBIN;
  const showThirdPlaceOption = format === TournamentFormat.SINGLE_ELIMINATION;

  return (
    <div className="bracket-options">
      <h3>Bracket Options</h3>
      
      {showSeedingOptions && (
        <div className="option-group">
          <label>Seeding Method:</label>
          <select
            value={options.seedingMethod}
            onChange={(e) => onChange({ seedingMethod: e.target.value as any })}
            disabled={disabled}
          >
            <option value="manual">Manual Order</option>
            <option value="random">Random</option>
            <option value="ranking">By Team Ranking</option>
          </select>
        </div>
      )}

      {showThirdPlaceOption && (
        <div className="option-group">
          <label>
            <input
              type="checkbox"
              checked={options.includeThirdPlace || false}
              onChange={(e) => onChange({ includeThirdPlace: e.target.checked })}
              disabled={disabled}
            />
            Include Third Place Match
          </label>
        </div>
      )}
    </div>
  );
};

interface TournamentStatsProps {
  tournament: Tournament;
  standings: TournamentStandings[];
}

const TournamentStats: React.FC<TournamentStatsProps> = ({
  tournament,
  standings
}) => {
  const stats = useMemo(() => {
    return StandingsCalculator.calculateTournamentStats(tournament.matches);
  }, [tournament.matches]);

  const topTeam = standings[0];
  const completionPercentage = stats.totalMatches > 0 
    ? (stats.completedMatches / stats.totalMatches) * 100 
    : 0;

  return (
    <div className="tournament-stats">
      <h3>Tournament Statistics</h3>
      
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Progress</span>
          <span className="stat-value">
            {stats.completedMatches}/{stats.totalMatches} matches
            ({completionPercentage.toFixed(1)}%)
          </span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Total Stones</span>
          <span className="stat-value">{stats.totalStones}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Avg Stones/Match</span>
          <span className="stat-value">{stats.averageStonesPerMatch.toFixed(1)}</span>
        </div>

        {topTeam && (
          <div className="stat-item">
            <span className="stat-label">Leading Team</span>
            <span className="stat-value">
              {topTeam.team.name} ({topTeam.points} pts)
            </span>
          </div>
        )}

        {stats.highestScoringMatch && (
          <div className="stat-item">
            <span className="stat-label">Highest Scoring</span>
            <span className="stat-value">
              {stats.highestScoringMatch.score.home + stats.highestScoringMatch.score.away} stones
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentBracket;