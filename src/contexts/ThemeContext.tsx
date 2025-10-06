'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'jugger' | 'tournament' | 'modern'

interface ThemeContextType {
  currentTheme: Theme
  setTheme: (theme: Theme) => void
  themes: Array<{
    id: Theme
    name: string
    description: string
    colors: {
      primary: string
      secondary: string
      accent: string
      background: string
      surface: string
      text: string
    }
  }>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>('light')

  // Define available themes with their color schemes
  const themes = React.useMemo(() => [
    {
      id: 'light' as Theme,
      name: 'Light',
      description: 'Clean and bright interface',
      colors: {
        primary: '#2563eb',
        secondary: '#64748b',
        accent: '#3b82f6',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1e293b'
      }
    },
    {
      id: 'dark' as Theme,
      name: 'Dark',
      description: 'Easy on the eyes in low light',
      colors: {
        primary: '#3b82f6',
        secondary: '#94a3b8',
        accent: '#60a5fa',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#f1f5f9'
      }
    },
    {
      id: 'jugger' as Theme,
      name: 'Jugger',
      description: 'Official Jugger sport colors',
      colors: {
        primary: '#dc2626',
        secondary: '#374151',
        accent: '#f59e0b',
        background: '#fef2f2',
        surface: '#ffffff',
        text: '#111827'
      }
    },
    {
      id: 'tournament' as Theme,
      name: 'Tournament',
      description: 'Professional tournament interface',
      colors: {
        primary: '#059669',
        secondary: '#6b7280',
        accent: '#10b981',
        background: '#f0fdf4',
        surface: '#ffffff',
        text: '#064e3b'
      }
    },
    {
      id: 'modern' as Theme,
      name: 'Modern',
      description: 'Contemporary gradient design',
      colors: {
        primary: '#7c3aed',
        secondary: '#8b5cf6',
        accent: '#a855f7',
        background: '#faf5ff',
        surface: '#ffffff',
        text: '#581c87'
      }
    }
  ], [])

  // Apply theme to document root
  const applyTheme = React.useCallback((theme: Theme) => {
    const themeConfig = themes.find(t => t.id === theme)
    if (!themeConfig) return

    const root = document.documentElement
    
    // Remove existing theme classes
    themes.forEach(t => {
      root.classList.remove(`theme-${t.id}`)
    })
    
    // Add new theme class
    root.classList.add(`theme-${theme}`)
    
    // Set CSS custom properties
    root.style.setProperty('--color-primary', themeConfig.colors.primary)
    root.style.setProperty('--color-secondary', themeConfig.colors.secondary)
    root.style.setProperty('--color-accent', themeConfig.colors.accent)
    root.style.setProperty('--color-background', themeConfig.colors.background)
    root.style.setProperty('--color-surface', themeConfig.colors.surface)
    root.style.setProperty('--color-text', themeConfig.colors.text)
    
    // Update meta theme-color for PWA
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeConfig.colors.primary)
    }
  }, [themes])

  // Set theme function
  const setTheme = (theme: Theme) => {
    setCurrentTheme(theme)
    applyTheme(theme)
    
    // Persist to localStorage
    localStorage.setItem('jugger-app-theme', theme)
    
    // Dispatch custom event for other components to listen to
    window.dispatchEvent(new CustomEvent('themeChanged', { 
      detail: { theme } 
    }))
  }

  // Initialize theme on mount
  useEffect(() => {
    // Get saved theme or default to light
    const savedTheme = localStorage.getItem('jugger-app-theme') as Theme || 'light'
    
    // Validate saved theme
    const isValidTheme = themes.some(t => t.id === savedTheme)
    const initialTheme = isValidTheme ? savedTheme : 'light'
    
    setCurrentTheme(initialTheme)
    applyTheme(initialTheme)
  }, [applyTheme, themes])

  const contextValue: ThemeContextType = {
    currentTheme,
    setTheme,
    themes
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

// Custom hook to use the theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export default ThemeProvider