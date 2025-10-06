'use client'

import React, { useState } from 'react'
import { useTournamentStore } from '../store/tournamentStore'
import { useLanguage } from '../contexts'
import type { TournamentSettings as TournamentSettingsType } from '../types'
import { DEFAULT_TOURNAMENT_SETTINGS } from '../types/constants'

interface TournamentSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const TournamentSettings: React.FC<TournamentSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useLanguage()
  const { currentTournament, updateTournament } = useTournamentStore()
  
  const [settings, setSettings] = useState<TournamentSettingsType>(
    currentTournament?.settings || DEFAULT_TOURNAMENT_SETTINGS
  )
  
  const [hasChanges, setHasChanges] = useState(false)

  const handleSettingChange = (key: keyof TournamentSettingsType, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    if (currentTournament) {
      updateTournament({ settings })
      setHasChanges(false)
      onClose()
    }
  }

  const handleCancel = () => {
    setSettings(currentTournament?.settings || DEFAULT_TOURNAMENT_SETTINGS)
    setHasChanges(false)
    onClose()
  }

  const handleReset = () => {
    setSettings(DEFAULT_TOURNAMENT_SETTINGS)
    setHasChanges(true)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('settings.title')} - {currentTournament?.name || t('tournament.name')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Settings Form */}
        <div className="p-6 space-y-6">
          {/* Match Duration Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              {t('match.timer')} {t('settings.title')}
            </h3>
            
            {/* Match Duration in Stones */}
            <div>
              <label htmlFor="match-duration" className="block text-sm font-medium text-gray-700 mb-2">
                {t('match.duration')} ({t('timer.stones')})
              </label>
              <div className="flex items-center space-x-3">
                <input
                  id="match-duration"
                  type="number"
                  min="50"
                  max="200"
                  step="10"
                  value={settings.matchDuration}
                  onChange={(e) => handleSettingChange('matchDuration', parseInt(e.target.value))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-600">
                  {t('timer.stones')} (~{Math.round(settings.matchDuration * settings.stoneInterval / 60)} {t('timer.minutes')})
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Standard: 100 {t('timer.stones')} (~3.5 {t('timer.minutes')})
              </p>
            </div>

            {/* Stone Interval */}
            <div>
              <label htmlFor="stone-interval" className="block text-sm font-medium text-gray-700 mb-2">
                {t('timer.stone')} Interval ({t('timer.seconds')})
              </label>
              <div className="flex items-center space-x-3">
                <input
                  id="stone-interval"
                  type="number"
                  min="1.5"
                  max="3.0"
                  step="0.1"
                  value={settings.stoneInterval}
                  onChange={(e) => handleSettingChange('stoneInterval', parseFloat(e.target.value))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-600">{t('timer.seconds')}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Standard: 2.1 {t('timer.seconds')}
              </p>
            </div>

            {/* Allow Qwik */}
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="allow-qwik" className="text-sm font-medium text-gray-700">
                  {t('timer.qwik')} erlauben
                </label>
                <p className="text-xs text-gray-500">
                  Ermöglicht schnelle Steinzählung bei besonderen Ereignissen
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="allow-qwik"
                  type="checkbox"
                  checked={settings.allowQwik}
                  onChange={(e) => handleSettingChange('allowQwik', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Timeout Settings */}
          <div className="space-y-4 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900">
              {t('timer.timeout')} {t('settings.title')}
            </h3>
            
            {/* Timeout Duration */}
            <div>
              <label htmlFor="timeout-duration" className="block text-sm font-medium text-gray-700 mb-2">
                {t('timer.timeout')} {t('match.duration')} ({t('timer.seconds')})
              </label>
              <div className="flex items-center space-x-3">
                <input
                  id="timeout-duration"
                  type="number"
                  min="30"
                  max="300"
                  step="30"
                  value={settings.timeoutDuration}
                  onChange={(e) => handleSettingChange('timeoutDuration', parseInt(e.target.value))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-600">{t('timer.seconds')}</span>
              </div>
            </div>

            {/* Max Timeouts */}
            <div>
              <label htmlFor="max-timeouts" className="block text-sm font-medium text-gray-700 mb-2">
                Maximale {t('timer.timeout')}s pro Team
              </label>
              <div className="flex items-center space-x-3">
                <input
                  id="max-timeouts"
                  type="number"
                  min="0"
                  max="5"
                  step="1"
                  value={settings.maxTimeouts}
                  onChange={(e) => handleSettingChange('maxTimeouts', parseInt(e.target.value))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-600">pro Team</span>
              </div>
            </div>
          </div>

          {/* Team Settings */}
          <div className="space-y-4 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900">
              {t('navigation.teams')} {t('settings.title')}
            </h3>
            
            {/* Max Teams */}
            <div>
              <label htmlFor="max-teams" className="block text-sm font-medium text-gray-700 mb-2">
                Maximale Anzahl {t('navigation.teams')}
              </label>
              <div className="flex items-center space-x-3">
                <input
                  id="max-teams"
                  type="number"
                  min="2"
                  max="64"
                  step="1"
                  value={settings.maxTeams}
                  onChange={(e) => handleSettingChange('maxTeams', parseInt(e.target.value))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-600">{t('navigation.teams')}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Empfohlen: 8-16 Teams für optimale Turnierdauer
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            {t('settings.reset')}
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {t('ui.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {t('ui.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}