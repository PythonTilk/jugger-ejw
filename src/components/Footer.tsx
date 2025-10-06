'use client'

import React from 'react'
import { useLanguage } from '../contexts/LanguageContext'

interface FooterProps {
  className?: string
}

export const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const { t } = useLanguage()
  const currentYear = new Date().getFullYear()

  return (
    <footer className={`bg-gray-50 border-t border-gray-200 ${className}`}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          {/* Jugger Sport Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
              <svg 
                className="w-5 h-5 text-white" 
                fill="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{t('jugger.sport')}</span>
              <span className="mx-2">•</span>
              <span>{t('app.title')}</span>
            </div>
          </div>

          {/* Copyright and Links */}
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm text-gray-500">
            <div>
              © {currentYear} {t('jugger.sport')} {t('app.title')}
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="#" 
                className="hover:text-blue-600 transition-colors duration-200"
                aria-label={t('ui.info')}
              >
                {t('ui.info')}
              </a>
              <a 
                href="#" 
                className="hover:text-blue-600 transition-colors duration-200"
                aria-label={t('settings.title')}
              >
                {t('settings.title')}
              </a>
            </div>
          </div>

          {/* PWA Status Indicator */}
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>PWA Ready</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer