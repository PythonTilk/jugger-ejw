'use client'

import { useEffect, useState } from 'react'
import { Layout, GameControlPanel, SpectatorScoreboard, P2PConnection } from '../components'
import { useMatchStore } from '../store/matchStore'
import { useTournamentStore } from '../store/tournamentStore'
import { useAppStore } from '../store/appStore'
import { useLanguage } from '../contexts'
import { DeviceType } from '../types/enums'

interface MatchPageProps {
  onBackToTournament?: () => void
}

export const MatchPage: React.FC<MatchPageProps> = ({ onBackToTournament }) => {
  const { t } = useLanguage()
  const [viewMode, setViewMode] = useState<'control' | 'scoreboard'>('control')
  const [deviceType, setDeviceType] = useState<DeviceType>(DeviceType.REFEREE)
  
  const { 
    currentMatch, 
    setCurrentMatch, 
    loadMatch,
    isReferee,
    setRefereeMode 
  } = useMatchStore()
  
  const { currentTournament } = useTournamentStore()
  const { activeMatches } = useAppStore()

  const handleDeviceTypeChange = (type: DeviceType) => {
    setDeviceType(type)
    setRefereeMode(type === DeviceType.REFEREE)
  }

  const handleBackToTournament = () => {
    if (onBackToTournament) {
      onBackToTournament()
    }
  }

  if (!currentMatch) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t('match.loading')}
            </h2>
            <p className="text-gray-600 mb-4">
              {t('match.loadingDescription')}
            </p>
            <button
              onClick={handleBackToTournament}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('navigation.backToTournament')}
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Match Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentMatch.homeTeam.name} {t('match.vs')} {currentMatch.awayTeam.name}
              </h1>
              {currentTournament && (
                <p className="text-gray-600 mt-1">
                  {currentTournament.name}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBackToTournament}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ← {t('navigation.backToTournament')}
              </button>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('control')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'control'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('match.controlPanel')}
              </button>
              <button
                onClick={() => setViewMode('scoreboard')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'scoreboard'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('match.scoreboard')}
              </button>
            </div>

            {/* Device Type Selector */}
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">
                {t('device.type')}:
              </label>
              <select
                value={deviceType}
                onChange={(e) => handleDeviceTypeChange(e.target.value as DeviceType)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={DeviceType.REFEREE}>{t('device.referee')}</option>
                <option value={DeviceType.SPECTATOR}>{t('device.spectator')}</option>
                <option value={DeviceType.ORGANIZER}>{t('device.organizer')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* P2P Connection Panel */}
        <P2PConnection
          deviceName={`${deviceType} - ${currentMatch.homeTeam.name} vs ${currentMatch.awayTeam.name}`}
          deviceType={deviceType}
          className="bg-white rounded-lg shadow-md"
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Primary View */}
          <div className="lg:col-span-2">
            {viewMode === 'control' ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {t('match.controlPanel')}
                </h2>
                <GameControlPanel />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <SpectatorScoreboard fullscreen={false} />
              </div>
            )}
          </div>

          {/* Secondary View */}
          <div className="space-y-6">
            {viewMode === 'control' ? (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('match.scoreboard')}
                  </h3>
                </div>
                <SpectatorScoreboard fullscreen={false} />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('match.controlPanel')}
                </h3>
                <GameControlPanel compact={true} />
              </div>
            )}

            {/* Match Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('match.information')}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('match.status')}:</span>
                  <span className={`px-2 py-1 rounded text-sm font-medium ${
                    currentMatch.status === 'active' ? 'bg-green-100 text-green-800' :
                    currentMatch.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                    currentMatch.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {t(`match.statuses.${currentMatch.status}`)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('match.created')}:</span>
                  <span className="text-gray-900">
                    {currentMatch.createdAt.toLocaleString()}
                  </span>
                </div>
                {currentMatch.updatedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('match.updated')}:</span>
                    <span className="text-gray-900">
                      {currentMatch.updatedAt.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('match.id')}:</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {currentMatch.id.slice(-8)}
                  </code>
                </div>
              </div>
            </div>

            {/* Team Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('navigation.teams')}
              </h3>
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium" style={{ color: currentMatch.homeTeam.color }}>
                      {currentMatch.homeTeam.name}
                    </h4>
                    <span className="text-sm text-gray-600">{t('match.home')}</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {currentMatch.score.home}
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium" style={{ color: currentMatch.awayTeam.color }}>
                      {currentMatch.awayTeam.name}
                    </h4>
                    <span className="text-sm text-gray-600">{t('match.away')}</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {currentMatch.score.away}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fullscreen Scoreboard Button */}
        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => {
              const element = document.documentElement
              if (element.requestFullscreen) {
                element.requestFullscreen()
                setViewMode('scoreboard')
              }
            }}
            className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            title={t('scoreboard.fullscreen')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>
    </Layout>
  )
}

export default MatchPage