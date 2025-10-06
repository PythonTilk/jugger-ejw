'use client'

import React, { useState } from 'react'
import { useTournamentStore } from '../store/tournamentStore'
import { useAppStore } from '../store/appStore'
import { useLanguage } from '../contexts'
import { TournamentFormat } from '../types/enums'
import { useKeyboardNavigation, useScreenReader } from '../hooks/useAccessibility'
import { TournamentBracket } from './TournamentBracket'
import type { Match } from '../types'
import '../styles/TournamentBracket.css'
import '../styles/BracketVisualization.css'
import '../styles/TournamentExport.css'

interface TournamentDashboardProps {
  onCreateTournament?: () => void
  onJoinMatch?: (matchId: string) => void
  onManageTeams?: () => void
}

export const TournamentDashboard: React.FC<TournamentDashboardProps> = ({
  onCreateTournament,
  onJoinMatch,
  onManageTeams
}) => {
  const { t } = useLanguage()
  const {
    currentTournament,
    tournamentStats,
    isCreating,
    editingTournament,
    startCreating,
    cancelEditing,
    saveEditing,
    updateEditingTournament,
    validateTournament
  } = useTournamentStore()
  
  const { setCurrentTournament, setActiveMatches } = useAppStore()
  
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'bracket'>('overview')
  
  // Accessibility features
  const { announce } = useScreenReader()
  
  // Keyboard navigation
  useKeyboardNavigation(
    () => {
      // Escape key - close any open modals or cancel editing
      if (isCreating) {
        handleCancelTournament()
        announce('Tournament creation cancelled')
      }
    },
    () => {
      // Enter key - save tournament if editing
      if (isCreating && editingTournament) {
        handleSaveTournament()
      }
    }
  )

  const handleCreateTournament = () => {
    startCreating()
    if (onCreateTournament) {
      onCreateTournament()
    }
  }

  const handleSaveTournament = () => {
    if (!editingTournament) return
    
    const errors = validateTournament(editingTournament)
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    
    setValidationErrors([])
    const tournament = saveEditing()
    
    // Sync with app store
    if (tournament) {
      setCurrentTournament(tournament)
      setActiveMatches(tournament.matches)
      announce(`Tournament "${tournament.name}" created successfully with ${tournament.matches.length} matches`)
    }
  }

  const handleCancelTournament = () => {
    setValidationErrors([])
    cancelEditing()
  }

  // Get matches from current tournament
  const matches = currentTournament?.matches || []
  const activeMatches = matches.filter((match: Match) => match.status === 'active')
  const completedMatches = matches.filter((match: Match) => match.status === 'completed')

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Tournament Overview Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('tournament.overview')}
            </h1>
            {currentTournament && (
              <p className="text-gray-600 mt-1">
                {currentTournament.name}
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            {currentTournament && (
              <button
                onClick={onManageTeams}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{t('navigation.teams')}</span>
              </button>
            )}
            <button
              onClick={handleCreateTournament}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>{t('tournament.create')}</span>
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">{t('tournament.active')}</p>
                <p className="text-2xl font-bold text-blue-900">
                  {currentTournament ? 1 : 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">{t('match.statuses.active')} {t('navigation.matches')}</p>
                <p className="text-2xl font-bold text-green-900">
                  {tournamentStats.activeMatches}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">{t('navigation.teams')}</p>
                <p className="text-2xl font-bold text-purple-900">
                  {tournamentStats.totalTeams}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t('tournament.completed')} {t('navigation.matches')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tournamentStats.completedMatches}
                </p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        {currentTournament && (
          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('tournament.overview')}
              </button>
              <button
                onClick={() => setActiveTab('bracket')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'bracket'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('tournament.bracket')}
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Tournament Creation Form */}
      {isCreating && editingTournament && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {t('tournament.create')}
          </h2>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {t('errors.validation')}
                  </h3>
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tournament Name */}
            <div>
              <label htmlFor="tournament-name" className="block text-sm font-medium text-gray-700 mb-2">
                {t('tournament.name')} *
              </label>
              <input
                id="tournament-name"
                type="text"
                value={editingTournament.name || ''}
                onChange={(e) => updateEditingTournament({ name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('tournament.name')}
              />
            </div>

            {/* Tournament Format */}
            <div>
              <label htmlFor="tournament-format" className="block text-sm font-medium text-gray-700 mb-2">
                {t('tournament.format')} *
              </label>
              <select
                id="tournament-format"
                value={editingTournament.format || TournamentFormat.SINGLE_ELIMINATION}
                onChange={(e) => updateEditingTournament({ format: e.target.value as TournamentFormat })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={TournamentFormat.SINGLE_ELIMINATION}>
                  {t('tournament.formats.single-elimination')}
                </option>
                <option value={TournamentFormat.DOUBLE_ELIMINATION}>
                  {t('tournament.formats.double-elimination')}
                </option>
                <option value={TournamentFormat.ROUND_ROBIN}>
                  {t('tournament.formats.round-robin')}
                </option>
              </select>
            </div>

            {/* Tournament Description */}
            <div className="md:col-span-2">
              <label htmlFor="tournament-description" className="block text-sm font-medium text-gray-700 mb-2">
                {t('tournament.description')}
              </label>
              <textarea
                id="tournament-description"
                value={editingTournament.description || ''}
                onChange={(e) => updateEditingTournament({ description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('tournament.description')}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={handleCancelTournament}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {t('ui.cancel')}
            </button>
            <button
              onClick={handleSaveTournament}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {t('ui.save')}
            </button>
          </div>
        </div>
      )}

      {/* Tournament Bracket View */}
      {currentTournament && activeTab === 'bracket' && (
        <TournamentBracket
          tournament={currentTournament}
          onMatchClick={onJoinMatch}
        />
      )}

      {/* Active Matches Section */}
      {activeTab === 'overview' && activeMatches.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t('match.statuses.active')} {t('navigation.matches')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeMatches.map((match: Match) => (
              <div
                key={match.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                onClick={() => onJoinMatch && onJoinMatch(match.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-600">
                    {t('match.statuses.active')}
                  </span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">
                    {match.homeTeam.name} {t('match.vs')} {match.awayTeam.name}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {match.score.home} - {match.score.away}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {match.timer.stones} {t('timer.stones')} {t('timer.remaining')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Tournament Details */}
      {currentTournament && activeTab === 'overview' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {currentTournament.name}
            </h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              {t(`tournament.formats.${currentTournament.format}`)}
            </span>
          </div>
          
          {currentTournament.description && (
            <p className="text-gray-600 mb-4">
              {currentTournament.description}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {currentTournament.teams.length}
              </p>
              <p className="text-sm text-gray-600">{t('navigation.teams')}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {currentTournament.matches.length}
              </p>
              <p className="text-sm text-gray-600">{t('navigation.matches')}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">
                {completedMatches.length}
              </p>
              <p className="text-sm text-gray-600">{t('tournament.completed')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!currentTournament && !isCreating && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('tournament.create')}
          </h3>
          <p className="text-gray-600 mb-6">
            {t('app.description')}
          </p>
          <button
            onClick={handleCreateTournament}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {t('tournament.create')}
          </button>
        </div>
      )}
    </div>
  )
}