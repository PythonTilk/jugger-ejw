'use client'

import React, { useState } from 'react'
import { useTournamentStore } from '../store/tournamentStore'
import { useLanguage } from '../contexts'
import type { Team, Player } from '../types'
import { JuggerPosition } from '../types/enums'

interface TeamManagementProps {
  isOpen: boolean
  onClose: () => void
}

export const TeamManagement: React.FC<TeamManagementProps> = ({
  isOpen,
  onClose
}) => {
  const { t } = useLanguage()
  const { teams, addTeam, updateTeam, removeTeam } = useTournamentStore()
  
  const [isCreating, setIsCreating] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    color: '#3B82F6',
    logo: '',
    players: [] as Player[]
  })
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const resetForm = () => {
    setFormData({
      name: '',
      shortName: '',
      color: '#3B82F6',
      logo: '',
      players: []
    })
    setValidationErrors([])
    setIsCreating(false)
    setEditingTeam(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleCreateTeam = () => {
    setIsCreating(true)
    setEditingTeam(null)
  }

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team)
    setFormData({
      name: team.name,
      shortName: team.shortName,
      color: team.color,
      logo: team.logo || '',
      players: [...team.players]
    })
    setIsCreating(false)
  }

  const validateTeam = () => {
    const errors: string[] = []
    
    if (!formData.name.trim()) {
      errors.push(t('validation.required').replace('{{field}}', t('team.name')))
    } else if (formData.name.trim().length < 2) {
      errors.push(t('validation.min_length').replace('{{count}}', '2'))
    }
    
    if (!formData.shortName.trim()) {
      errors.push(t('validation.required').replace('{{field}}', t('team.shortName')))
    } else if (formData.shortName.trim().length > 5) {
      errors.push(t('validation.max_length').replace('{{count}}', '5'))
    }
    
    // Check for duplicate names
    const existingTeam = teams.find(team => 
      team.id !== editingTeam?.id && 
      (team.name.toLowerCase() === formData.name.toLowerCase() || 
       team.shortName.toLowerCase() === formData.shortName.toLowerCase())
    )
    
    if (existingTeam) {
      errors.push(t('validation.duplicate'))
    }
    
    return errors
  }

  const handleSaveTeam = () => {
    const errors = validateTeam()
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    
    const teamData = {
      name: formData.name.trim(),
      shortName: formData.shortName.trim(),
      color: formData.color,
      logo: formData.logo.trim() || undefined,
      players: formData.players,
      stats: {
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        totalStones: 0,
        averageStones: 0,
        winRate: 0
      }
    }
    
    if (editingTeam) {
      updateTeam(editingTeam.id, teamData)
    } else {
      addTeam(teamData)
    }
    
    resetForm()
  }

  const handleDeleteTeam = (teamId: string) => {
    if (window.confirm(t('team.delete') + '?')) {
      removeTeam(teamId)
    }
  }

  const handleAddPlayer = () => {
    const newPlayer: Player = {
      id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      position: undefined,
      isActive: true
    }
    setFormData(prev => ({
      ...prev,
      players: [...prev.players, newPlayer]
    }))
  }

  const handleUpdatePlayer = (playerId: string, updates: Partial<Player>) => {
    setFormData(prev => ({
      ...prev,
      players: prev.players.map(player =>
        player.id === playerId ? { ...player, ...updates } : player
      )
    }))
  }

  const handleRemovePlayer = (playerId: string) => {
    setFormData(prev => ({
      ...prev,
      players: prev.players.filter(player => player.id !== playerId)
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('navigation.teams')} {t('settings.title')}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Team Creation/Editing Form */}
          {(isCreating || editingTeam) && (
            <div className="mb-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingTeam ? t('team.edit') : t('team.create')}
              </h3>

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
                {/* Team Name */}
                <div>
                  <label htmlFor="team-name" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('team.name')} *
                  </label>
                  <input
                    id="team-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('team.name')}
                  />
                </div>

                {/* Short Name */}
                <div>
                  <label htmlFor="team-short-name" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('team.shortName')} *
                  </label>
                  <input
                    id="team-short-name"
                    type="text"
                    maxLength={5}
                    value={formData.shortName}
                    onChange={(e) => setFormData(prev => ({ ...prev, shortName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('team.shortName')}
                  />
                  <p className="text-xs text-gray-500 mt-1">Max. 5 Zeichen</p>
                </div>

                {/* Team Color */}
                <div>
                  <label htmlFor="team-color" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('team.color')}
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      id="team-color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-12 h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                {/* Team Logo URL */}
                <div>
                  <label htmlFor="team-logo" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('team.logo')} URL
                  </label>
                  <input
                    id="team-logo"
                    type="url"
                    value={formData.logo}
                    onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>

              {/* Player Management */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">
                    {t('team.players')} ({formData.players.length})
                  </h4>
                  <button
                    onClick={handleAddPlayer}
                    className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Spieler hinzufügen</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.players.map((player) => (
                    <div key={player.id} className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg">
                      <input
                        type="text"
                        value={player.name}
                        onChange={(e) => handleUpdatePlayer(player.id, { name: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Spielername"
                      />
                      
                      <select
                        value={player.position || ''}
                        onChange={(e) => handleUpdatePlayer(player.id, { 
                          position: e.target.value ? e.target.value as JuggerPosition : undefined 
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Position wählen</option>
                        <option value={JuggerPosition.QWIK}>Qwik (Läufer)</option>
                        <option value={JuggerPosition.CHAIN}>Kette</option>
                        <option value={JuggerPosition.SHIELD}>Schild</option>
                        <option value={JuggerPosition.SHORT_SWORD}>Kurzschwert</option>
                        <option value={JuggerPosition.LONG_SWORD}>Langschwert</option>
                        <option value={JuggerPosition.STAFF}>Stab</option>
                      </select>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={player.isActive}
                          onChange={(e) => handleUpdatePlayer(player.id, { isActive: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-600">Aktiv</span>
                      </label>

                      <button
                        onClick={() => handleRemovePlayer(player.id)}
                        className="text-red-600 hover:text-red-800 transition-colors duration-200"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  {t('ui.cancel')}
                </button>
                <button
                  onClick={handleSaveTeam}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {t('ui.save')}
                </button>
              </div>
            </div>
          )}

          {/* Teams List */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {t('navigation.teams')} ({teams.length})
              </h3>
              {!isCreating && !editingTeam && (
                <button
                  onClick={handleCreateTeam}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>{t('team.create')}</span>
                </button>
              )}
            </div>

            {teams.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Keine Teams vorhanden
                </h3>
                <p className="text-gray-600 mb-6">
                  Erstellen Sie Teams für Ihr Turnier
                </p>
                <button
                  onClick={handleCreateTeam}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {t('team.create')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map((team) => (
                  <div key={team.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                          style={{ backgroundColor: team.color }}
                        >
                          {team.shortName}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{team.name}</h4>
                          <p className="text-sm text-gray-600">{team.players.length} {t('team.players')}</p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditTeam(team)}
                          className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                          title={t('team.edit')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className="text-red-600 hover:text-red-800 transition-colors duration-200"
                          title={t('team.delete')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Team Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <p className="font-semibold text-gray-900">{team.stats.matchesWon}</p>
                        <p className="text-gray-600">{t('team.wins')}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{team.stats.matchesLost}</p>
                        <p className="text-gray-600">{t('team.losses')}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{team.stats.winRate.toFixed(1)}%</p>
                        <p className="text-gray-600">Win Rate</p>
                      </div>
                    </div>

                    {/* Active Players */}
                    {team.players.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600 mb-2">Aktive Spieler:</p>
                        <div className="flex flex-wrap gap-1">
                          {team.players.filter(p => p.isActive).slice(0, 3).map((player) => (
                            <span key={player.id} className="px-2 py-1 bg-gray-100 text-xs text-gray-700 rounded">
                              {player.name}
                            </span>
                          ))}
                          {team.players.filter(p => p.isActive).length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-xs text-gray-700 rounded">
                              +{team.players.filter(p => p.isActive).length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}