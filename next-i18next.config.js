module.exports = {
  i18n: {
    defaultLocale: 'de',
    locales: ['de', 'en'],
  },
  fallbackLng: {
    default: ['en'],
  },
  debug: process.env.NODE_ENV === 'development',
  reloadOnPrerender: process.env.NODE_ENV === 'development',
  localePath: './public/locales',
}