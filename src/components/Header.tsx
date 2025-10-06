'use client'

import React from 'react'
import Link from 'next/link'
import { useLanguage } from '../contexts/LanguageContext'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeSwitcher } from './ThemeSwitcher'

interface HeaderProps {
  className?: string
}

export const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const { t } = useLanguage()

  const navigationItems = [
    { key: 'dashboard', href: '/', label: t('navigation.dashboard') },
    { key: 'tournaments', href: '/tournaments', label: t('navigation.tournaments') },
    { key: 'matches', href: '/matches', label: t('navigation.matches') },
    { key: 'teams', href: '/teams', label: t('navigation.teams') },
    { key: 'settings', href: '/settings', label: t('navigation.settings') },
  ]

  return (
    <header className={`bg-white shadow-lg border-b border-gray-200 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              {/* Jugger Sport Logo Placeholder - Using SVG icon for now */}
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                <svg 
                  className="w-6 h-6 text-white" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">
                  {t('jugger.sport')} {t('app.title')}
                </h1>
                <p className="text-xs text-gray-600">
                  {t('app.description')}
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Theme Switcher, Language Switcher and Mobile Menu Button */}
          <div className="flex items-center space-x-4">
            <ThemeSwitcher className="hidden lg:block" variant="compact" />
            <LanguageSwitcher className="hidden sm:block" />
            
            {/* Mobile Menu Button */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-expanded="false"
              aria-label={t('navigation.menu')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu - Hidden by default, will be toggled with state later */}
        <div className="md:hidden border-t border-gray-200 py-2">
          <nav className="flex flex-col space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-200"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 px-3 space-y-4">
            <LanguageSwitcher />
            <ThemeSwitcher variant="compact" />
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header