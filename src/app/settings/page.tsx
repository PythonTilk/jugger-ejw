'use client'

import { Layout, ThemeSwitcher, IntegrationTest } from '../../components'
import dynamic from 'next/dynamic'

// Dynamically import performance dashboard for better performance
const PerformanceDashboard = dynamic(() => import('../../components/PerformanceDashboard'), {
  ssr: false
})
import { useLanguage } from '../../contexts'

export default function SettingsPage() {
  const { t } = useLanguage()

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('settings.title')}
          </h1>
          <p className="text-gray-600">
            Customize your Jugger Tournament App experience
          </p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-8">
          {/* Theme Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <ThemeSwitcher variant="grid" />
          </div>

          {/* Language Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('settings.language')}
            </h3>
            <p className="text-gray-600 mb-4">
              Choose your preferred language for the application interface.
            </p>
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
                <span>🇩🇪</span>
                <span>Deutsch</span>
              </button>
              <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                <span>🇺🇸</span>
                <span>English</span>
              </button>
            </div>
          </div>

          {/* Sync Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('settings.sync')}
            </h3>
            <p className="text-gray-600 mb-4">
              Configure peer-to-peer synchronization settings for multi-device tournaments.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">Auto-sync</span>
                  <p className="text-sm text-gray-600">Automatically sync with other devices</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">{t('settings.offline')}</span>
                  <p className="text-sm text-gray-600">Enable offline functionality</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Data Management
            </h3>
            <p className="text-gray-600 mb-4">
              Manage your tournament data and application settings.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                {t('settings.export')}
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                {t('settings.import')}
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
                {t('settings.reset')}
              </button>
            </div>
          </div>

          {/* Integration Test */}
          <IntegrationTest />

          {/* Performance Dashboard */}
          <PerformanceDashboard />

          {/* App Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              App Information
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Version:</span>
                <span>1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Build:</span>
                <span>2024.1.0</span>
              </div>
              <div className="flex justify-between">
                <span>PWA Status:</span>
                <span className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Ready</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}