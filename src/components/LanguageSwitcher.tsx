'use client'

import { useLanguage } from '../contexts/LanguageContext'

interface LanguageSwitcherProps {
  className?: string
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  className = ''
}) => {
  const { currentLanguage, changeLanguage, t } = useLanguage()

  const handleLanguageChange = async (newLanguage: string) => {
    await changeLanguage(newLanguage)
  }

  const languages = [
    {
      code: 'de',
      name: t('languages.de'),
      flag: '🇩🇪'
    },
    {
      code: 'en', 
      name: t('languages.en'),
      flag: '🇺🇸'
    }
  ]

  return (
    <div className={`language-switcher ${className}`}>
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('settings.language')}:
        </span>
        <div className="flex space-x-1">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`
                flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium
                transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500
                ${
                  currentLanguage === language.code
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
                }
              `}
              title={`${t('settings.language')}: ${language.name}`}
              aria-label={`${t('settings.language')}: ${language.name}`}
            >
              <span className="text-base" role="img" aria-label={language.name}>
                {language.flag}
              </span>
              <span className="hidden sm:inline">{language.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default LanguageSwitcher