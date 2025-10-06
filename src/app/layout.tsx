import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LanguageProvider, ThemeProvider } from '../contexts'
import PWAUpdateNotification from '../components/PWAUpdateNotification'
import OfflineIndicator from '../components/OfflineIndicator'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Jugger Tournament App',
    template: '%s | Jugger Tournament App'
  },
  description: 'Modern web-based Jugger sports tournament management application with offline capabilities and real-time synchronization',
  manifest: '/manifest.json',
  keywords: ['jugger', 'tournament', 'sports', 'management', 'pwa', 'offline'],
  authors: [{ name: 'Jugger Tournament App Team' }],
  creator: 'Jugger Tournament App',
  publisher: 'Jugger Tournament App',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NODE_ENV === 'production' 
    ? 'https://username.github.io/jugger-tournament-app' 
    : 'http://localhost:3000'),
  alternates: {
    canonical: '/',
    languages: {
      'de': '/de',
      'en': '/en',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    alternateLocale: ['en_US'],
    title: 'Jugger Tournament App',
    description: 'Modern web-based Jugger sports tournament management application',
    siteName: 'Jugger Tournament App',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jugger Tournament App',
    description: 'Modern web-based Jugger sports tournament management application',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <ThemeProvider>
          <LanguageProvider>
            <OfflineIndicator />
            {children}
            <PWAUpdateNotification />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}