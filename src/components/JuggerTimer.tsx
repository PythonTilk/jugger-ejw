'use client';

import React, { useEffect, useCallback } from 'react';
import { useMatchStore } from '../store/matchStore';
import { JUGGER_SPORT_CONSTANTS } from '../types/constants';
import { formatStoneTime, getTimeRemaining } from '../types/jugger';
import { useTranslation } from '../hooks/useTranslation';

interface JuggerTimerProps {
  className?: string;
  showControls?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const JuggerTimer: React.FC<JuggerTimerProps> = ({
  className = '',
  showControls = true,
  size = 'medium'
}) => {
  const { t } = useTranslation();
  const {
    currentMatch,
    isReferee,
    matchControlEnabled,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    advanceStone,
    qwikStone,
    getTimeRemaining: getMatchTimeRemaining
  } = useMatchStore();

  // Handle keyboard shortcuts for timer control
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (!isReferee || !matchControlEnabled || !currentMatch) return;

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        if (currentMatch.timer.isRunning) {
          pauseTimer();
        } else {
          if (currentMatch.timer.isPaused) {
            resumeTimer();
          } else {
            startTimer();
          }
        }
        break;
      case 'KeyR':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          resetTimer();
        }
        break;
      case 'KeyS':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          advanceStone();
        }
        break;
      case 'KeyQ':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          qwikStone();
        }
        break;
    }
  }, [isReferee, matchControlEnabled, currentMatch, startTimer, pauseTimer, resumeTimer, resetTimer, advanceStone, qwikStone]);

  useEffect(() => {
    if (showControls && isReferee) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [handleKeyPress, showControls, isReferee]);

  if (!currentMatch) {
    return (
      <div className={`jugger-timer no-match ${className}`}>
        <div className="text-center text-gray-500">
          {t('timer.noMatch')}
        </div>
      </div>
    );
  }

  const { timer, settings } = currentMatch;
  const timeRemaining = getMatchTimeRemaining();
  const progress = (timer.stones / settings.maxStones) * 100;
  const isComplete = timer.stones >= settings.maxStones;
  const canControl = isReferee && matchControlEnabled;

  // Size-based styling
  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-lg',
    large: 'text-2xl md:text-4xl'
  };

  const buttonSizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-2 text-sm',
    large: 'px-4 py-3 text-base'
  };

  return (
    <div className={`jugger-timer ${size} ${className}`}>
      {/* Main Timer Display */}
      <div className={`timer-display ${sizeClasses[size]}`}>
        <div className="timer-main">
          {/* Stone Count */}
          <div className="stone-count">
            <span className="label">{t('timer.stones')}:</span>
            <span className={`value ${isComplete ? 'complete' : ''}`}>
              {timer.stones} / {settings.maxStones}
            </span>
          </div>

          {/* Current Stone Timer */}
          <div className="stone-timer">
            <span className="label">{t('timer.currentStone')}:</span>
            <span className="value">
              {timer.seconds.toFixed(1)}s / {settings.stoneInterval}s
            </span>
          </div>

          {/* Total Time */}
          <div className="total-time">
            <span className="label">{t('timer.totalTime')}:</span>
            <span className="value">
              {formatStoneTime(timer.stones, timer.totalSeconds)}
            </span>
          </div>

          {/* Time Remaining */}
          <div className="time-remaining">
            <span className="label">{t('timer.remaining')}:</span>
            <span className="value">
              {timeRemaining.stones} {t('timer.stones')}, {timeRemaining.seconds.toFixed(1)}s
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
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

        {/* Timer Status */}
        <div className="timer-status">
          <span className={`status-indicator ${timer.isRunning ? 'running' : timer.isPaused ? 'paused' : 'stopped'}`}>
            {timer.isRunning ? t('timer.running') : 
             timer.isPaused ? t('timer.paused') : 
             t('timer.stopped')}
          </span>
          {isComplete && (
            <span className="complete-indicator">
              {t('timer.matchComplete')}
            </span>
          )}
        </div>
      </div>

      {/* Timer Controls */}
      {showControls && canControl && (
        <div className="timer-controls">
          <div className="control-group primary">
            {!timer.isRunning ? (
              <button
                onClick={timer.isPaused ? resumeTimer : startTimer}
                className={`btn-primary ${buttonSizeClasses[size]}`}
                disabled={isComplete}
                title={timer.isPaused ? t('timer.resume') : t('timer.start')}
              >
                ▶️ {timer.isPaused ? t('timer.resume') : t('timer.start')}
              </button>
            ) : (
              <button
                onClick={pauseTimer}
                className={`btn-secondary ${buttonSizeClasses[size]}`}
                title={t('timer.pause')}
              >
                ⏸️ {t('timer.pause')}
              </button>
            )}

            <button
              onClick={resetTimer}
              className={`btn-warning ${buttonSizeClasses[size]}`}
              title={t('timer.reset')}
            >
              🔄 {t('timer.reset')}
            </button>
          </div>

          <div className="control-group secondary">
            <button
              onClick={advanceStone}
              className={`btn-stone ${buttonSizeClasses[size]}`}
              disabled={isComplete}
              title={`${t('timer.advanceStone')} (Ctrl+S)`}
            >
              ⏭️ {t('timer.stone')}
            </button>

            {settings.allowQwik && (
              <button
                onClick={qwikStone}
                className={`btn-qwik ${buttonSizeClasses[size]}`}
                disabled={isComplete}
                title={`${t('timer.qwik')} (Ctrl+Q)`}
              >
                ⚡ {t('timer.qwik')}
              </button>
            )}
          </div>

          {/* Keyboard Shortcuts Help */}
          <div className="keyboard-shortcuts">
            <small className="text-gray-600">
              {t('timer.shortcuts')}: Space={t('timer.playPause')}, Ctrl+R={t('timer.reset')}, 
              Ctrl+S={t('timer.stone')}, Ctrl+Q={t('timer.qwik')}
            </small>
          </div>
        </div>
      )}

      {/* Spectator Mode Info */}
      {showControls && !canControl && (
        <div className="spectator-info">
          <small className="text-gray-500">
            {t('timer.spectatorMode')}
          </small>
        </div>
      )}
    </div>
  );
};

export default JuggerTimer;