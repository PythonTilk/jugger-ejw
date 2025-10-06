import { useLanguage } from '../contexts/LanguageContext'

/**
 * Custom hook that provides translation functionality
 * This is a wrapper around the useLanguage hook for easier access to translations
 */
export const useTranslation = () => {
  const { t, currentLanguage, changeLanguage } = useLanguage()
  
  return {
    t,
    currentLanguage,
    changeLanguage,
    // Helper function to check if current language is German
    isGerman: currentLanguage === 'de',
    // Helper function to check if current language is English  
    isEnglish: currentLanguage === 'en'
  }
}

export default useTranslation