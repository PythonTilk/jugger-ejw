'use client'

import React, { useState } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'
import { Sidebar } from './Sidebar'
import { ErrorBoundary } from './ErrorBoundary'
import { FadeIn } from './AnimatedTransition'
import { useAccessibility } from '../hooks/useAccessibility'

interface LayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
  className?: string
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  showSidebar = true,
  className = '' 
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { prefersReducedMotion } = useAccessibility()

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  return (
    <ErrorBoundary>
      <div className={`min-h-screen bg-gray-50 flex flex-col ${className}`}>
        {/* Skip to main content link for screen readers */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
        >
          Skip to main content
        </a>

        {/* Header */}
        <Header />

        <div className="flex flex-1">
          {/* Sidebar */}
          {showSidebar && (
            <Sidebar 
              isOpen={sidebarOpen} 
              onClose={closeSidebar}
            />
          )}

          {/* Main Content Area */}
          <main 
            id="main-content"
            className={`flex-1 flex flex-col ${showSidebar ? 'lg:ml-64' : ''}`}
            role="main"
            aria-label="Main content"
          >
            {/* Mobile Menu Button */}
            {showSidebar && (
              <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-2">
                <button
                  onClick={toggleSidebar}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus-visible:focus"
                  aria-label="Open sidebar"
                  aria-expanded={sidebarOpen}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            )}

            {/* Page Content */}
            <div className="flex-1 p-4 md:p-6 lg:p-8">
              <FadeIn>
                {children}
              </FadeIn>
            </div>
          </main>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </ErrorBoundary>
  )
}

export default Layout