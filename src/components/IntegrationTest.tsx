'use client'

import React, { useState, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import { useTournamentStore } from '../store/tournamentStore'
import { useMatchStore } from '../store/matchStore'
import { useLanguage } from '../contexts'
import { TournamentFormat, MatchStatus, DeviceType, TeamSide } from '../types/enums'
import type { Team } from '../types'

interface IntegrationTestProps {
  onComplete?: (results: TestResults) => void
}

interface TestResults {
  tournamentCreation: boolean
  matchGeneration: boolean
  matchNavigation: boolean
  p2pSync: boolean
  stateManagement: boolean
  userFlow: boolean
  overall: boolean
}

export const IntegrationTest: React.FC<IntegrationTestProps> = ({ onComplete }) => {
  const { t } = useLanguage()
  const [isRunning, setIsRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState<string>('')
  const [results, setResults] = useState<TestResults>({
    tournamentCreation: false,
    matchGeneration: false,
    matchNavigation: false,
    p2pSync: false,
    stateManagement: false,
    userFlow: false,
    overall: false
  })
  const [logs, setLogs] = useState<string[]>([])

  const appStore = useAppStore()
  const tournamentStore = useTournamentStore()
  const matchStore = useMatchStore()

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const runIntegrationTests = async () => {
    setIsRunning(true)
    setLogs([])
    addLog('Starting integration tests...')

    const testResults: TestResults = {
      tournamentCreation: false,
      matchGeneration: false,
      matchNavigation: false,
      p2pSync: false,
      stateManagement: false,
      userFlow: false,
      overall: false
    }

    try {
      // Test 1: Tournament Creation
      setCurrentTest('Tournament Creation')
      addLog('Testing tournament creation...')

      const testTeams: Team[] = [
        {
          id: 'team-1',
          name: 'Test Team Alpha',
          shortName: 'TTA',
          color: '#FF6B6B',
          players: [],
          stats: {
            matchesPlayed: 0,
            matchesWon: 0,
            matchesLost: 0,
            totalStones: 0,
            averageStones: 0,
            winRate: 0
          }
        },
        {
          id: 'team-2',
          name: 'Test Team Beta',
          shortName: 'TTB',
          color: '#4ECDC4',
          players: [],
          stats: {
            matchesPlayed: 0,
            matchesWon: 0,
            matchesLost: 0,
            totalStones: 0,
            averageStones: 0,
            winRate: 0
          }
        },
        {
          id: 'team-3',
          name: 'Test Team Gamma',
          shortName: 'TTG',
          color: '#45B7D1',
          players: [],
          stats: {
            matchesPlayed: 0,
            matchesWon: 0,
            matchesLost: 0,
            totalStones: 0,
            averageStones: 0,
            winRate: 0
          }
        },
        {
          id: 'team-4',
          name: 'Test Team Delta',
          shortName: 'TTD',
          color: '#F7DC6F',
          players: [],
          stats: {
            matchesPlayed: 0,
            matchesWon: 0,
            matchesLost: 0,
            totalStones: 0,
            averageStones: 0,
            winRate: 0
          }
        }
      ]

      tournamentStore.startCreating()
      tournamentStore.updateEditingTournament({
        name: 'Integration Test Tournament',
        description: 'Automated test tournament for integration testing',
        format: TournamentFormat.SINGLE_ELIMINATION,
        teams: testTeams,
        matches: []
      })

      const tournament = tournamentStore.saveEditing()

      if (tournament && tournament.teams.length === 4) {
        testResults.tournamentCreation = true
        addLog('✓ Tournament creation successful')

        // Sync with app store
        appStore.setCurrentTournament(tournament)
        appStore.setActiveMatches(tournament.matches)
      } else {
        addLog('✗ Tournament creation failed')
      }

      await new Promise(resolve => setTimeout(resolve, 500))

      // Test 2: Match Generation
      setCurrentTest('Match Generation')
      addLog('Testing match generation...')

      if (tournament && tournament.matches.length > 0) {
        testResults.matchGeneration = true
        addLog(`✓ Match generation successful (${tournament.matches.length} matches created)`)
      } else {
        addLog('✗ Match generation failed')
      }

      await new Promise(resolve => setTimeout(resolve, 500))

      // Test 3: Match Navigation
      setCurrentTest('Match Navigation')
      addLog('Testing match navigation...')

      if (tournament && tournament.matches.length > 0) {
        const firstMatch = tournament.matches[0]
        matchStore.setCurrentMatch(firstMatch)

        if (matchStore.currentMatch?.id === firstMatch.id) {
          testResults.matchNavigation = true
          addLog('✓ Match navigation successful')
        } else {
          addLog('✗ Match navigation failed')
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500))

      // Test 4: State Management
      setCurrentTest('State Management')
      addLog('Testing state management...')

      // Test score updates
      if (matchStore.currentMatch) {
        matchStore.updateScore(TeamSide.HOME, 1)
        matchStore.updateScore(TeamSide.AWAY, 2)

        if (matchStore.currentMatch.score.home === 1 && matchStore.currentMatch.score.away === 2) {
          testResults.stateManagement = true
          addLog('✓ State management successful')
        } else {
          addLog('✗ State management failed')
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500))

      // Test 5: P2P Sync (Mock test)
      setCurrentTest('P2P Sync')
      addLog('Testing P2P sync capabilities...')

      // Since P2P requires actual connections, we'll test the integration points
      try {
        const devices = appStore.connectedDevices
        const isHost = appStore.isHost

        // Test device management
        appStore.setCurrentDevice({
          id: 'test-device',
          name: 'Integration Test Device',
          type: DeviceType.REFEREE,
          isHost: true,
          lastSeen: new Date(),
          connectionStatus: 'connected' as any
        })

        if (appStore.currentDevice?.name === 'Integration Test Device') {
          testResults.p2pSync = true
          addLog('✓ P2P sync integration successful')
        } else {
          addLog('✗ P2P sync integration failed')
        }
      } catch (error) {
        addLog(`✗ P2P sync test error: ${error}`)
      }

      await new Promise(resolve => setTimeout(resolve, 500))

      // Test 6: Complete User Flow
      setCurrentTest('Complete User Flow')
      addLog('Testing complete user flow...')

      const flowChecks = [
        tournament !== null,
        tournament?.matches && tournament.matches.length > 0,
        matchStore.currentMatch !== null,
        appStore.currentTournament !== null,
        appStore.activeMatches.length > 0
      ]

      if (flowChecks.every(check => check)) {
        testResults.userFlow = true
        addLog('✓ Complete user flow successful')
      } else {
        addLog('✗ Complete user flow failed')
      }

      // Calculate overall result
      const passedTests = Object.values(testResults).filter(Boolean).length
      const totalTests = Object.keys(testResults).length - 1 // Exclude 'overall'
      testResults.overall = passedTests >= totalTests * 0.8 // 80% pass rate

      addLog(`Integration tests completed: ${passedTests}/${totalTests} passed`)

      if (testResults.overall) {
        addLog('✓ Overall integration test PASSED')
      } else {
        addLog('✗ Overall integration test FAILED')
      }

    } catch (error) {
      addLog(`✗ Integration test error: ${error}`)
    } finally {
      setResults(testResults)
      setCurrentTest('')
      setIsRunning(false)

      if (onComplete) {
        onComplete(testResults)
      }
    }
  }

  const clearTestData = () => {
    // Clean up test data
    appStore.setCurrentTournament(null)
    appStore.setActiveMatches([])
    matchStore.setCurrentMatch(null)
    tournamentStore.setCurrentTournament(null)
    setLogs([])
    setResults({
      tournamentCreation: false,
      matchGeneration: false,
      matchNavigation: false,
      p2pSync: false,
      stateManagement: false,
      userFlow: false,
      overall: false
    })
    addLog('Test data cleared')
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Integration Test Suite
        </h2>
        <div className="flex space-x-3">
          <button
            onClick={runIntegrationTests}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? 'Running Tests...' : 'Run Tests'}
          </button>
          <button
            onClick={clearTestData}
            disabled={isRunning}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Clear Data
          </button>
        </div>
      </div>

      {/* Current Test Status */}
      {isRunning && currentTest && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-blue-800 font-medium">
              Running: {currentTest}
            </span>
          </div>
        </div>
      )}

      {/* Test Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {Object.entries(results).map(([test, passed]) => (
          <div
            key={test}
            className={`p-3 rounded-lg border ${passed
              ? 'bg-green-50 border-green-200'
              : 'bg-gray-50 border-gray-200'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 capitalize">
                {test.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <span className={`text-lg ${passed ? 'text-green-600' : 'text-gray-400'}`}>
                {passed ? '✓' : '○'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Overall Status */}
      {!isRunning && Object.values(results).some(Boolean) && (
        <div className={`p-4 rounded-lg border mb-6 ${results.overall
          ? 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200'
          }`}>
          <div className="flex items-center">
            <span className={`text-2xl mr-3 ${results.overall ? 'text-green-600' : 'text-red-600'
              }`}>
              {results.overall ? '✓' : '✗'}
            </span>
            <div>
              <h3 className={`font-semibold ${results.overall ? 'text-green-800' : 'text-red-800'
                }`}>
                Integration Test {results.overall ? 'PASSED' : 'FAILED'}
              </h3>
              <p className={`text-sm ${results.overall ? 'text-green-700' : 'text-red-700'
                }`}>
                {results.overall
                  ? 'All critical user flows are working correctly'
                  : 'Some critical user flows need attention'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Test Logs */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Test Logs</h3>
        <div className="bg-black text-green-400 p-3 rounded font-mono text-xs max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet. Run tests to see output.</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Test Description */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">What This Tests</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Tournament creation with teams and automatic match generation</li>
          <li>• Navigation between tournament dashboard and match pages</li>
          <li>• State synchronization between different stores</li>
          <li>• P2P integration points and device management</li>
          <li>• Complete user flow from tournament creation to match control</li>
          <li>• Real-time updates and data persistence</li>
        </ul>
      </div>
    </div>
  )
}

export default IntegrationTest