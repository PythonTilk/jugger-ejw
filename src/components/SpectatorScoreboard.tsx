'use client';

import React, { useEffect, useState } from 'react';
import { useMatchStore } from '../store/matchStore';
import { MatchStatus } from '../types/enums';
import { formatStoneTime, getTimeRemaining } from '../types/jugger';
import { useTranslation } from '../hooks/useTranslation';

interface SpectatorScoreboardProps {
  className?: string;
  fullscreen?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const SpectatorScoreboard: React.FC<SpectatorScoreboardProps> = ({
  className = '',
  fullscreen = false,
  autoRefresh = true,
  refreshInterval = 1000
}) => {
  const { t } = useTranslation();
  const {
    currentMatch,
    getTimeRemaining: getMatchTimeRemaining
  } = useMatchStore();

  const [currentTime, setCurrentTime] = useState(new Date());

  // Auto-refresh timer for real-time updates
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  if (!currentMatch) {
    return (
      <div className={`spectator-scoreboard no-match ${fullscreen ? 'fullscreen' : ''} ${className}`}>
        <div className="no-match-content">
          <div className="no-match-icon">🏟️</div>
          <h2 className="no-match-title">{t('match.noActiveMatch')}</h2>
          <p className="no-match-subtitle">{t('scoreboard.waitingForMatch')}</p>
          <div className="current-time">
            {currentTime.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  }

  const { homeTeam, awayTeam, score, timer, status } = currentMatch;
  const timeRemaining = getMatchTimeRemaining();
  const progress = (timer.stones / currentMatch.settings.maxStones) * 100;
  const isComplete = timer.stones >= currentMatch.settings.maxStones;

  // Determine winner for completed matches
  const winner = status === MatchStatus.COMPLETED 
    ? score.home > score.away ? 'home' 
    : score.away > score.home ? 'away' 
    : 'tie'
    : null;

  return (
    <div className={`spectator-scoreboard ${fullscreen ? 'fullscreen' : ''} ${status} ${className}`}>
      {/* Fullscreen Toggle */}
      {!fullscreen && (
        <button
          onClick={toggleFullscreen}
          className="fullscreen-toggle"
          title={t('scoreboard.fullscreen')}
        >
          ⛶
        </button>
      )}

      {/* Match Status Header */}
      <div className="match-status-header">
        <div className="status-info">
          <span className={`status-indicator ${status}`}>
            {t(`match.statuses.${status}`)}
          </span>
          {status === MatchStatus.ACTIVE && timer.isRunning && (
            <span className="live-indicator">
              🔴 {t('scoreboard.live')}
            </span>
          )}
        </div>
        <div className="match-time">
          {currentTime.toLocaleTimeString()}
        </div>
      </div>

      {/* Main Scoreboard */}
      <div className="scoreboard-main">
        {/* Home Team */}
        <div className={`team-section home ${winner === 'home' ? 'winner' : ''}`}>
          <div className="team-info">
            <div className="team-name" style={{ color: homeTeam.color }}>
              {homeTeam.name}
            </div>
            <div className="team-label">{t('match.home')}</div>
          </div>
          <div className="team-score">
            <span className="score-value">{score.home}</span>
            {winner === 'home' && (
              <div className="winner-badge">
                🏆 {t('match.winner')}
              </div>
            )}
          </div>
        </div>

        {/* Center Section - Timer and VS */}
        <div className="center-section">
          <div className="vs-display">
            <span className="vs-text">{t('match.vs')}</span>
          </div>
          
          {/* Timer Display */}
          <div className="timer-display">
            <div className="stone-count">
              <span className="stone-label">{t('timer.stones')}</span>
              <span className="stone-value">
                {timer.stones} / {currentMatch.settings.maxStones}
              </span>
            </div>
            
            <div className="time-info">
              <div className="current-stone-time">
                {timer.seconds.toFixed(1)}s
              </div>
              <div className="total-time">
                {formatStoneTime(timer.stones, timer.totalSeconds)}
              </div>
            </div>
            
            {!isComplete && (
              <div className="time-remaining">
                <span className="remaining-label">{t('timer.remaining')}</span>
                <span className="remaining-value">
                  {timeRemaining.stones} {t('timer.stones')}
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="progress-section">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="progress-text">
              {progress.toFixed(1)}% {t('timer.complete')}
            </div>
          </div>

          {/* Match Complete Indicator */}
          {isComplete && (
            <div className="match-complete">
              <span className="complete-text">
                {winner === 'tie' ? t('scoreboard.tie') : t('timer.matchComplete')}
              </span>
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className={`team-section away ${winner === 'away' ? 'winner' : ''}`}>
          <div className="team-info">
            <div className="team-name" style={{ color: awayTeam.color }}>
              {awayTeam.name}
            </div>
            <div className="team-label">{t('match.away')}</div>
          </div>
          <div className="team-score">
            <span className="score-value">{score.away}</span>
            {winner === 'away' && (
              <div className="winner-badge">
                🏆 {t('match.winner')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Information */}
      <div className="scoreboard-footer">
        <div className="tournament-info">
          {currentMatch.tournamentId && (
            <span className="tournament-name">
              {t('tournament.tournament')} #{currentMatch.tournamentId.slice(-6)}
            </span>
          )}
        </div>
        
        <div className="jugger-branding">
          <span className="sport-name">{t('jugger.sport')}</span>
          <span className="app-name">{t('app.title')}</span>
        </div>
        
        <div className="refresh-info">
          {autoRefresh && (
            <span className="auto-refresh">
              🔄 {t('scoreboard.autoRefresh')}
            </span>
          )}
        </div>
      </div>

      {/* Timer Status Overlay */}
      {status === MatchStatus.PAUSED && (
        <div className="status-overlay paused">
          <div className="overlay-content">
            <div className="overlay-icon">⏸️</div>
            <div className="overlay-text">{t('match.statuses.paused')}</div>
          </div>
        </div>
      )}

      {status === MatchStatus.PENDING && (
        <div className="status-overlay pending">
          <div className="overlay-content">
            <div className="overlay-icon">⏳</div>
            <div className="overlay-text">{t('scoreboard.matchStartingSoon')}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpectatorScoreboard;