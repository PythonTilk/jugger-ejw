'use client'

import { useState, useEffect } from 'react'
import { Layout, TournamentDashboard, LoadingSpinner } from '../components'
import { useLanguage } from '../contexts'
import { useTournamentStore } from '../store/tournamentStore'
import { useMatchStore } from '../store/matchStore'
import { useAppStore } from '../store/appStore'
import { usePerformance, useBundlePerformance } from '../hooks/usePerformance'
import dynamic from 'next/dynamic'

// Dynamically import components for better performance
const MatchView = dynamic(() => import('../components/MatchPage'), { 
  ssr: false,
  loading: () => <LoadingSpinner size="large" text="Loading match..." />
})

const TournamentSettings = dynamic(() => import('../components/TournamentSettings').then(mod => ({ default: mod.TournamentSettings })), {
  ssr: false,
  loading: () => <LoadingSpinner size="medium" text="Loading settings..." />
})

const TeamManagement = dynamic(() => import('../components/TeamManagement').then(mod => ({ default: mod.TeamManagement })), {
  ssr: false,
  loading: () => <LoadingSpinner size="medium" text="Loading team management..." />
})

export default function Home() {
  const { t } = useLanguage()
  const { currentTournament } = useTournamentStore()
  const { activeMatches } = useAppStore()
  const { setCurrentMatch } = useMatchStore()
  const [showSettings, setShowSettings] = useState(false)
  const [showTeamManagement, setShowTeamManagement] = useState(false)
  const [currentMatchId, setCurrentMatchId] = useState<string | null>(null)
  
  // Performance monitoring
  const performanceMetrics = usePerformance('HomePage')
  const bundleMetrics = useBundlePerformance()
  
  // Log performance metrics in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Bundle Performance:', bundleMetrics)
    }
  }, [bundleMetrics])

  // Check for match parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const matchId = urlParams.get('match')
    
    if (matchId) {
      setCurrentMatchId(matchId)
      // Find and set the current match
      const match = activeMatches.find(m => m.id === matchId)
      if (match) {
        setCurrentMatch(match)
      }
    } else {
      setCurrentMatchId(null)
    }
  }, [activeMatches, setCurrentMatch])

  const handleJoinMatch = (matchId: string) => {
    // For static export, we'll use query parameters instead of dynamic routes
    const url = new URL(window.location.href)
    url.searchParams.set('match', matchId)
    window.history.pushState({}, '', url.toString())
    setCurrentMatchId(matchId)
    
    // Find and set the current match
    const match = activeMatches.find(m => m.id === matchId)
    if (match) {
      setCurrentMatch(match)
    }
  }

  const handleBackToTournament = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('match')
    window.history.pushState({}, '', url.toString())
    setCurrentMatchId(null)
    setCurrentMatch(null)
  }

  const handleOpenSettings = () => {
    if (currentTournament) {
      setShowSettings(true)
    }
  }

  const handleManageTeams = () => {
    setShowTeamManagement(true)
  }

  // Show match view if match ID is present
  if (currentMatchId) {
    return <MatchView onBackToTournament={handleBackToTournament} />
  }

  return (
    <Layout>
      <TournamentDashboard 
        onJoinMatch={handleJoinMatch}
        onManageTeams={handleManageTeams}
      />
      
      {/* Tournament Settings Modal */}
      <TournamentSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Team Management Modal */}
      <TeamManagement
        isOpen={showTeamManagement}
        onClose={() => setShowTeamManagement(false)}
      />

      {/* Settings Button - Only show if tournament exists */}
      {currentTournament && (
        <div className="fixed bottom-6 right-6">
          <button
            onClick={handleOpenSettings}
            className="flex items-center justify-center w-14 h-14 bg-gray-600 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            title={t('settings.title')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      )}
    </Layout>
  )
}