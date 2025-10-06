'use client'

import React, { useState } from 'react'
import { useTheme, Theme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'

interface ThemeSwitcherProps {
  className?: string
  variant?: 'dropdown' | 'grid' | 'compact'
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ 
  className = '',
  variant = 'dropdown'
}) => {
  const { currentTheme, setTheme, themes } = useTheme()
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)

  const handleThemeChange = (theme: Theme) => {
    setTheme(theme)
    setIsOpen(false)
  }

  const currentThemeConfig = themes.find(t => t.id === currentTheme)

  if (variant === 'compact') {
    return (
      <div className={`theme-switcher-compact ${className}`}>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('settings.theme')}:
          </span>
          <div className="flex space-x-1">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={`
                  w-6 h-6 rounded-full border-2 transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  ${
                    currentTheme === theme.id
                      ? 'border-gray-800 scale-110'
                      : 'border-gray-300 hover:border-gray-500'
                  }
                `}
                style={{ backgroundColor: theme.colors.primary }}
                title={`${t('settings.theme')}: ${t(`themes.${theme.id}`)}`}
                aria-label={`${t('settings.theme')}: ${t(`themes.${theme.id}`)}`}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'grid') {
    return (
      <div className={`theme-switcher-grid ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('settings.theme')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeChange(theme.id)}
              className={`
                p-4 rounded-lg border-2 text-left transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${
                  currentTheme === theme.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-center space-x-3 mb-2">
                <div 
                  className="w-6 h-6 rounded-full border border-gray-300"
                  style={{ backgroundColor: theme.colors.primary }}
                />
                <span className="font-medium text-gray-900">
                  {t(`themes.${theme.id}`)}
                </span>
                {currentTheme === theme.id && (
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {theme.description}
              </p>
              <div className="flex space-x-2 mt-3">
                <div 
                  className="w-4 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: theme.colors.primary }}
                />
                <div 
                  className="w-4 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: theme.colors.secondary }}
                />
                <div 
                  className="w-4 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: theme.colors.accent }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Default dropdown variant
  return (
    <div className={`theme-switcher-dropdown relative ${className}`}>
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('settings.theme')}:
        </span>
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="
              flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium
              bg-white border border-gray-300 text-gray-700 hover:bg-gray-50
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              transition-colors duration-200
            "
            aria-expanded={isOpen}
            aria-haspopup="true"
          >
            <div 
              className="w-4 h-4 rounded border border-gray-300"
              style={{ backgroundColor: currentThemeConfig?.colors.primary }}
            />
            <span>{currentThemeConfig ? t(`themes.${currentThemeConfig.id}`) : t('settings.theme')}</span>
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
              />
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                <div className="py-2">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => handleThemeChange(theme.id)}
                      className={`
                        w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-200
                        focus:outline-none focus:bg-gray-50
                        ${currentTheme === theme.id ? 'bg-blue-50' : ''}
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-5 h-5 rounded border border-gray-300"
                          style={{ backgroundColor: theme.colors.primary }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">
                              {t(`themes.${theme.id}`)}
                            </span>
                            {currentTheme === theme.id && (
                              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {theme.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ThemeSwitcher