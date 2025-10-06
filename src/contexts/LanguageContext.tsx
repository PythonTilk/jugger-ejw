'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface LanguageContextType {
  currentLanguage: string
  translations: any
  changeLanguage: (language: string) => Promise<void>
  t: (key: string, params?: Record<string, any>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
  children: ReactNode
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('de')
  const [translations, setTranslations] = useState<any>({})

  // Helper function to get nested translation value
  const getNestedValue = (obj: any, path: string): string => {
    return path.split('.').reduce((current, key) => current?.[key], obj) || path
  }

  // Translation function with interpolation support
  const t = (key: string, params?: Record<string, any>): string => {
    let translation = getNestedValue(translations, key)
    
    // Handle interpolation (e.g., {{count}})
    if (params && typeof translation === 'string') {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(
          new RegExp(`{{${paramKey}}}`, 'g'), 
          String(paramValue)
        )
      })
    }
    
    return translation
  }

  // Load translations for a specific language
  const loadTranslations = async (language: string) => {
    try {
      const response = await fetch(`/locales/${language}/common.json`)
      if (!response.ok) {
        throw new Error(`Failed to load translations for ${language}`)
      }
      const translationData = await response.json()
      setTranslations(translationData)
      return translationData
    } catch (error) {
      console.error('Error loading translations:', error)
      // Fallback to empty object if translations fail to load
      setTranslations({})
      return {}
    }
  }

  // Change language function
  const changeLanguage = async (language: string) => {
    if (!['de', 'en'].includes(language)) {
      console.warn(`Unsupported language: ${language}`)
      return
    }

    try {
      // Load new translations
      await loadTranslations(language)
      
      // Update current language
      setCurrentLanguage(language)
      
      // Persist to localStorage
      localStorage.setItem('jugger-app-language', language)
      
      // Dispatch custom event for other components to listen to
      window.dispatchEvent(new CustomEvent('languageChanged', { 
        detail: { language, translations } 
      }))
    } catch (error) {
      console.error('Error changing language:', error)
    }
  }

  // Initialize language on mount
  useEffect(() => {
    const initializeLanguage = async () => {
      // Get saved language or default to German
      const savedLanguage = localStorage.getItem('jugger-app-language') || 'de'
      
      // Load translations for the saved/default language
      await loadTranslations(savedLanguage)
      setCurrentLanguage(savedLanguage)
    }

    initializeLanguage()
  }, [])

  const contextValue: LanguageContextType = {
    currentLanguage,
    translations,
    changeLanguage,
    t
  }

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  )
}

// Custom hook to use the language context
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export default LanguageProvider