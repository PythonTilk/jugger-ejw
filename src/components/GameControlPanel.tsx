'use client';

import React, { useState, useCallback } from 'react';
import { useMatchStore } from '../store/matchStore';
import { JuggerTimer } from './JuggerTimer';
import { MatchStatus, GameEventType, TeamSide } from '../types/enums';
import { useTranslation } from '../hooks/useTranslation';
import type { GameEvent } from '../types/match';

interface GameControlPanelProps {
  className?: string;
  compact?: boolean;
}

export const GameControlPanel: React.FC<GameControlPanelProps> = ({
  className = '',
  compact = false
}) => {
  const { t } = useTranslation();
  const {
    currentMatch,
    isReferee,
    matchControlEnabled,
    recentEvents,
    startMatch,
    pauseMatch,
    resumeMatch,
    endMatch,
    resetMatch,
    updateScore,
    setScore,
    addEvent,
    removeEvent
  } = useMatchStore();

  // Local state for timeout and penalty tracking
  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);
  const [showPenaltyDialog, setShowPenaltyDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamSide>(TeamSide.HOME);
  const [penaltyDescription, setPenaltyDescription] = useState('');
  const [timeoutReason, setTimeoutReason] = useState('');

  // Score adjustment handlers
  const handleScoreChange = useCallback((team: TeamSide, delta: number) => {
    if (!currentMatch || !isReferee || !matchControlEnabled) return;
    updateScore(team, delta);
  }, [currentMatch, isReferee, matchControlEnabled, updateScore]);

  const handleDirectScoreSet = useCallback((team: TeamSide, score: number) => {
    if (!currentMatch || !isReferee || !matchControlEnabled) return;
    setScore(team, score);
  }, [currentMatch, isReferee, matchControlEnabled, setScore]);

  // Match control handlers
  const handleMatchStart = useCallback(() => {
    if (!currentMatch || !isReferee || !matchControlEnabled) return;
    startMatch();
  }, [currentMatch, isReferee, matchControlEnabled, startMatch]);

  const handleMatchPause = useCallback(() => {
    if (!currentMatch || !isReferee || !matchControlEnabled) return;
    pauseMatch();
  }, [currentMatch, isReferee, matchControlEnabled, pauseMatch]);

  const handleMatchResume = useCallback(() => {
    if (!currentMatch || !isReferee || !matchControlEnabled) return;
    resumeMatch();
  }, [currentMatch, isReferee, matchControlEnabled, resumeMatch]);

  const handleMatchEnd = useCallback(() => {
    if (!currentMatch || !isReferee || !matchControlEnabled) return;
    if (window.confirm(t('match.confirmEnd'))) {
      endMatch();
    }
  }, [currentMatch, isReferee, matchControlEnabled, endMatch, t]);

  const handleMatchReset = useCallback(() => {
    if (!currentMatch || !isReferee || !matchControlEnabled) return;
    if (window.confirm(t('match.confirmReset'))) {
      resetMatch();
    }
  }, [currentMatch, isReferee, matchControlEnabled, resetMatch, t]);

  // Timeout handler
  const handleTimeout = useCallback((team: TeamSide) => {
    if (!currentMatch || !isReferee || !matchControlEnabled) return;
    
    setSelectedTeam(team);
    setShowTimeoutDialog(true);
  }, [currentMatch, isReferee, matchControlEnabled]);

  const confirmTimeout = useCallback(() => {
    if (!currentMatch) return;
    
    addEvent({
      matchId: currentMatch.id,
      type: GameEventType.TIMEOUT,
      team: selectedTeam,
      stoneCount: currentMatch.timer.stones,
      data: { reason: timeoutReason },
      description: `${t('timer.timeout')} - ${selectedTeam === TeamSide.HOME ? currentMatch.homeTeam.name : currentMatch.awayTeam.name}: ${timeoutReason}`
    });
    
    setShowTimeoutDialog(false);
    setTimeoutReason('');
  }, [currentMatch, selectedTeam, timeoutReason, addEvent, t]);

  // Penalty handler
  const handlePenalty = useCallback((team: TeamSide) => {
    if (!currentMatch || !isReferee || !matchControlEnabled) return;
    
    setSelectedTeam(team);
    setShowPenaltyDialog(true);
  }, [currentMatch, isReferee, matchControlEnabled]);

  const confirmPenalty = useCallback(() => {
    if (!currentMatch) return;
    
    addEvent({
      matchId: currentMatch.id,
      type: GameEventType.PENALTY,
      team: selectedTeam,
      stoneCount: currentMatch.timer.stones,
      data: { description: penaltyDescription },
      description: `${t('scoring.penalty')} - ${selectedTeam === TeamSide.HOME ? currentMatch.homeTeam.name : currentMatch.awayTeam.name}: ${penaltyDescription}`
    });
    
    setShowPenaltyDialog(false);
    setPenaltyDescription('');
  }, [currentMatch, selectedTeam, penaltyDescription, addEvent, t]);

  // Event removal handler
  const handleRemoveEvent = useCallback((eventId: string) => {
    if (!isReferee || !matchControlEnabled) return;
    if (window.confirm(t('match.confirmRemoveEvent'))) {
      removeEvent(eventId);
    }
  }, [isReferee, matchControlEnabled, removeEvent, t]);

  if (!currentMatch) {
    return (
      <div className={`game-control-panel no-match ${className}`}>
        <div className="text-center text-gray-500 py-8">
          {t('match.noActiveMatch')}
        </div>
      </div>
    );
  }

  if (!isReferee || !matchControlEnabled) {
    return (
      <div className={`game-control-panel spectator ${className}`}>
        <div className="text-center text-blue-600 py-4">
          {t('match.spectatorMode')}
        </div>
        <JuggerTimer showControls={false} size={compact ? 'small' : 'medium'} />
      </div>
    );
  }

  const { homeTeam, awayTeam, score, status } = currentMatch;
  const canControl = status !== MatchStatus.COMPLETED;

  return (
    <div className={`game-control-panel referee ${compact ? 'compact' : ''} ${className}`}>
      {/* Match Header */}
      <div className="match-header">
        <h2 className="match-title">
          {homeTeam.name} {t('match.vs')} {awayTeam.name}
        </h2>
        <div className="match-status">
          <span className={`status-badge ${status}`}>
            {t(`match.statuses.${status}`)}
          </span>
        </div>
      </div>

      {/* Score Display and Controls */}
      <div className="score-section">
        <div className="team-score home">
          <div className="team-info">
            <h3 className="team-name" style={{ color: homeTeam.color }}>
              {homeTeam.name}
            </h3>
            <div className="team-label">{t('match.home')}</div>
          </div>
          <div className="score-display">
            <span className="score-value">{score.home}</span>
          </div>
          <div className="score-controls">
            <button
              onClick={() => handleScoreChange(TeamSide.HOME, 1)}
              disabled={!canControl}
              className="btn-score-up"
              title={t('scoring.increment')}
            >
              +1
            </button>
            <button
              onClick={() => handleScoreChange(TeamSide.HOME, -1)}
              disabled={!canControl || score.home === 0}
              className="btn-score-down"
              title={t('scoring.decrement')}
            >
              -1
            </button>
            <input
              type="number"
              min="0"
              max="99"
              value={score.home}
              onChange={(e) => handleDirectScoreSet(TeamSide.HOME, parseInt(e.target.value) || 0)}
              disabled={!canControl}
              className="score-input"
              title={t('scoring.directSet')}
            />
          </div>
          <div className="team-actions">
            <button
              onClick={() => handleTimeout(TeamSide.HOME)}
              disabled={!canControl}
              className="btn-timeout"
              title={t('timer.timeout')}
            >
              ⏱️ {t('timer.timeout')}
            </button>
            <button
              onClick={() => handlePenalty(TeamSide.HOME)}
              disabled={!canControl}
              className="btn-penalty"
              title={t('scoring.penalty')}
            >
              ⚠️ {t('scoring.penalty')}
            </button>
          </div>
        </div>

        <div className="score-divider">
          <span className="vs-text">{t('match.vs')}</span>
        </div>

        <div className="team-score away">
          <div className="team-info">
            <h3 className="team-name" style={{ color: awayTeam.color }}>
              {awayTeam.name}
            </h3>
            <div className="team-label">{t('match.away')}</div>
          </div>
          <div className="score-display">
            <span className="score-value">{score.away}</span>
          </div>
          <div className="score-controls">
            <button
              onClick={() => handleScoreChange(TeamSide.AWAY, 1)}
              disabled={!canControl}
              className="btn-score-up"
              title={t('scoring.increment')}
            >
              +1
            </button>
            <button
              onClick={() => handleScoreChange(TeamSide.AWAY, -1)}
              disabled={!canControl || score.away === 0}
              className="btn-score-down"
              title={t('scoring.decrement')}
            >
              -1
            </button>
            <input
              type="number"
              min="0"
              max="99"
              value={score.away}
              onChange={(e) => handleDirectScoreSet(TeamSide.AWAY, parseInt(e.target.value) || 0)}
              disabled={!canControl}
              className="score-input"
              title={t('scoring.directSet')}
            />
          </div>
          <div className="team-actions">
            <button
              onClick={() => handleTimeout(TeamSide.AWAY)}
              disabled={!canControl}
              className="btn-timeout"
              title={t('timer.timeout')}
            >
              ⏱️ {t('timer.timeout')}
            </button>
            <button
              onClick={() => handlePenalty(TeamSide.AWAY)}
              disabled={!canControl}
              className="btn-penalty"
              title={t('scoring.penalty')}
            >
              ⚠️ {t('scoring.penalty')}
            </button>
          </div>
        </div>
      </div>

      {/* Timer Section */}
      <div className="timer-section">
        <JuggerTimer size={compact ? 'small' : 'medium'} />
      </div>

      {/* Match Control Buttons */}
      <div className="match-controls">
        {status === MatchStatus.PENDING && (
          <button
            onClick={handleMatchStart}
            className="btn-primary btn-large"
          >
            ▶️ {t('match.start')}
          </button>
        )}
        
        {status === MatchStatus.ACTIVE && (
          <button
            onClick={handleMatchPause}
            className="btn-secondary btn-large"
          >
            ⏸️ {t('match.pause')}
          </button>
        )}
        
        {status === MatchStatus.PAUSED && (
          <button
            onClick={handleMatchResume}
            className="btn-primary btn-large"
          >
            ▶️ {t('match.resume')}
          </button>
        )}
        
        {canControl && (
          <>
            <button
              onClick={handleMatchEnd}
              className="btn-success btn-large"
            >
              🏁 {t('match.end')}
            </button>
            <button
              onClick={handleMatchReset}
              className="btn-warning btn-large"
            >
              🔄 {t('match.reset')}
            </button>
          </>
        )}
      </div>

      {/* Recent Events */}
      <div className="events-section">
        <h3 className="events-title">{t('match.recentEvents')}</h3>
        <div className="events-list">
          {recentEvents.length === 0 ? (
            <div className="no-events">
              {t('match.noEvents')}
            </div>
          ) : (
            recentEvents.slice().reverse().map((event: GameEvent) => (
              <div key={event.id} className="event-item">
                <div className="event-info">
                  <span className="event-type">{t(`events.${event.type}`)}</span>
                  {event.team && (
                    <span className="event-team">
                      {event.team === TeamSide.HOME ? homeTeam.name : awayTeam.name}
                    </span>
                  )}
                  <span className="event-stone">Stone {event.stoneCount}</span>
                </div>
                <div className="event-description">
                  {event.description || t(`events.${event.type}`)}
                </div>
                <div className="event-actions">
                  <span className="event-time">
                    {event.timestamp.toLocaleTimeString()}
                  </span>
                  <button
                    onClick={() => handleRemoveEvent(event.id)}
                    className="btn-remove-event"
                    title={t('match.removeEvent')}
                  >
                    ❌
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Timeout Dialog */}
      {showTimeoutDialog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{t('timer.timeout')} - {selectedTeam === TeamSide.HOME ? homeTeam.name : awayTeam.name}</h3>
            <textarea
              value={timeoutReason}
              onChange={(e) => setTimeoutReason(e.target.value)}
              placeholder={t('match.timeoutReason')}
              className="modal-textarea"
            />
            <div className="modal-actions">
              <button onClick={confirmTimeout} className="btn-primary">
                {t('ui.confirm')}
              </button>
              <button onClick={() => setShowTimeoutDialog(false)} className="btn-secondary">
                {t('ui.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Penalty Dialog */}
      {showPenaltyDialog && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{t('scoring.penalty')} - {selectedTeam === TeamSide.HOME ? homeTeam.name : awayTeam.name}</h3>
            <textarea
              value={penaltyDescription}
              onChange={(e) => setPenaltyDescription(e.target.value)}
              placeholder={t('match.penaltyDescription')}
              className="modal-textarea"
              required
            />
            <div className="modal-actions">
              <button 
                onClick={confirmPenalty} 
                className="btn-primary"
                disabled={!penaltyDescription.trim()}
              >
                {t('ui.confirm')}
              </button>
              <button onClick={() => setShowPenaltyDialog(false)} className="btn-secondary">
                {t('ui.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameControlPanel;