'use client'

import { usePWA } from '../hooks/usePWA'
import { useTranslation } from '../hooks/useTranslation'

export default function PWAUpdateNotification() {
  const { isUpdateAvailable, updateServiceWorker, isInstallable, installPWA } = usePWA()
  const { t } = useTranslation()

  if (!isUpdateAvailable && !isInstallable) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {isUpdateAvailable && (
        <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg mb-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">
                {t('pwa.updateAvailable') || 'Update Available'}
              </h4>
              <p className="text-xs opacity-90 mt-1">
                {t('pwa.updateDescription') || 'A new version of the app is available.'}
              </p>
            </div>
            <button
              onClick={updateServiceWorker}
              className="ml-3 bg-white text-blue-600 px-3 py-1 rounded text-xs font-medium hover:bg-gray-100 transition-colors"
            >
              {t('pwa.update') || 'Update'}
            </button>
          </div>
        </div>
      )}

      {isInstallable && (
        <div className="bg-green-600 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">
                {t('pwa.installAvailable') || 'Install App'}
              </h4>
              <p className="text-xs opacity-90 mt-1">
                {t('pwa.installDescription') || 'Install this app for a better experience.'}
              </p>
            </div>
            <button
              onClick={installPWA}
              className="ml-3 bg-white text-green-600 px-3 py-1 rounded text-xs font-medium hover:bg-gray-100 transition-colors"
            >
              {t('pwa.install') || 'Install'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}