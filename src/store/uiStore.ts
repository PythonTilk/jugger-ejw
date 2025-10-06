// UI-specific state management
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Language, Theme } from '../types/enums';

export interface UIState {
  // Theme and appearance
  currentTheme: Theme;
  isDarkMode: boolean;
  
  // Language and internationalization
  currentLanguage: Language;
  
  // Navigation and layout
  sidebarOpen: boolean;
  currentPage: string;
  
  // Modal and dialog states
  modals: {
    tournamentCreate: boolean;
    teamCreate: boolean;
    matchCreate: boolean;
    settings: boolean;
    about: boolean;
  };
  
  // Loading and notification states
  isLoading: boolean;
  notifications: Notification[];
  
  // Mobile and responsive states
  isMobile: boolean;
  screenSize: 'sm' | 'md' | 'lg' | 'xl';
  
  // Accessibility
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

export interface UIActions {
  // Theme management
  setTheme: (theme: Theme) => void;
  toggleDarkMode: () => void;
  
  // Language management
  setLanguage: (language: Language) => void;
  
  // Navigation
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setCurrentPage: (page: string) => void;
  
  // Modal management
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
  closeAllModals: () => void;
  
  // Loading states
  setLoading: (loading: boolean) => void;
  
  // Notification management
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Responsive design
  setMobile: (isMobile: boolean) => void;
  setScreenSize: (size: UIState['screenSize']) => void;
  
  // Accessibility
  setHighContrast: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setFontSize: (size: UIState['fontSize']) => void;
  
  // Utility
  generateNotificationId: () => string;
}

export type UIStore = UIState & UIActions;

const initialState: UIState = {
  currentTheme: Theme.DEFAULT,
  isDarkMode: false,
  currentLanguage: Language.GERMAN, // German as default per requirements
  sidebarOpen: false,
  currentPage: 'dashboard',
  modals: {
    tournamentCreate: false,
    teamCreate: false,
    matchCreate: false,
    settings: false,
    about: false,
  },
  isLoading: false,
  notifications: [],
  isMobile: false,
  screenSize: 'lg',
  highContrast: false,
  reducedMotion: false,
  fontSize: 'medium',
};

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Theme management
        setTheme: (theme) => {
          set({ currentTheme: theme }, false, 'setTheme');
          
          // Auto-detect dark mode for certain themes
          const isDarkMode = theme === Theme.DARK;
          set({ isDarkMode }, false, 'setTheme/darkMode');
        },
        
        toggleDarkMode: () => {
          set((state) => ({ isDarkMode: !state.isDarkMode }), false, 'toggleDarkMode');
        },
        
        // Language management
        setLanguage: (language) => {
          set({ currentLanguage: language }, false, 'setLanguage');
          
          // Update document language attribute
          if (typeof document !== 'undefined') {
            document.documentElement.lang = language;
          }
        },
        
        // Navigation
        setSidebarOpen: (open) => {
          set({ sidebarOpen: open }, false, 'setSidebarOpen');
        },
        
        toggleSidebar: () => {
          set((state) => ({ sidebarOpen: !state.sidebarOpen }), false, 'toggleSidebar');
        },
        
        setCurrentPage: (page) => {
          set({ currentPage: page }, false, 'setCurrentPage');
        },
        
        // Modal management
        openModal: (modal) => {
          set((state) => ({
            modals: { ...state.modals, [modal]: true }
          }), false, 'openModal');
        },
        
        closeModal: (modal) => {
          set((state) => ({
            modals: { ...state.modals, [modal]: false }
          }), false, 'closeModal');
        },
        
        closeAllModals: () => {
          set({
            modals: {
              tournamentCreate: false,
              teamCreate: false,
              matchCreate: false,
              settings: false,
              about: false,
            }
          }, false, 'closeAllModals');
        },
        
        // Loading states
        setLoading: (loading) => {
          set({ isLoading: loading }, false, 'setLoading');
        },
        
        // Notification management
        addNotification: (notificationData) => {
          const notification: Notification = {
            ...notificationData,
            id: get().generateNotificationId(),
            timestamp: new Date(),
          };
          
          set((state) => ({
            notifications: [...state.notifications, notification]
          }), false, 'addNotification');
          
          // Auto-remove notification after duration
          if (notification.duration && notification.duration > 0) {
            setTimeout(() => {
              get().removeNotification(notification.id);
            }, notification.duration);
          }
        },
        
        removeNotification: (id) => {
          set((state) => ({
            notifications: state.notifications.filter(n => n.id !== id)
          }), false, 'removeNotification');
        },
        
        clearNotifications: () => {
          set({ notifications: [] }, false, 'clearNotifications');
        },
        
        // Responsive design
        setMobile: (isMobile) => {
          set({ isMobile }, false, 'setMobile');
          
          // Auto-close sidebar on mobile
          if (isMobile) {
            set({ sidebarOpen: false }, false, 'setMobile/closeSidebar');
          }
        },
        
        setScreenSize: (size) => {
          set({ screenSize: size }, false, 'setScreenSize');
          
          // Update mobile state based on screen size
          const isMobile = size === 'sm';
          get().setMobile(isMobile);
        },
        
        // Accessibility
        setHighContrast: (enabled) => {
          set({ highContrast: enabled }, false, 'setHighContrast');
          
          // Apply high contrast class to document
          if (typeof document !== 'undefined') {
            if (enabled) {
              document.documentElement.classList.add('high-contrast');
            } else {
              document.documentElement.classList.remove('high-contrast');
            }
          }
        },
        
        setReducedMotion: (enabled) => {
          set({ reducedMotion: enabled }, false, 'setReducedMotion');
          
          // Apply reduced motion class to document
          if (typeof document !== 'undefined') {
            if (enabled) {
              document.documentElement.classList.add('reduced-motion');
            } else {
              document.documentElement.classList.remove('reduced-motion');
            }
          }
        },
        
        setFontSize: (size) => {
          set({ fontSize: size }, false, 'setFontSize');
          
          // Apply font size class to document
          if (typeof document !== 'undefined') {
            document.documentElement.classList.remove('font-small', 'font-medium', 'font-large');
            document.documentElement.classList.add(`font-${size}`);
          }
        },
        
        // Utility
        generateNotificationId: () => {
          return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        },
      }),
      {
        name: 'jugger-ui-storage',
        partialize: (state) => ({
          // Persist UI preferences
          currentTheme: state.currentTheme,
          isDarkMode: state.isDarkMode,
          currentLanguage: state.currentLanguage,
          highContrast: state.highContrast,
          reducedMotion: state.reducedMotion,
          fontSize: state.fontSize,
        }),
      }
    ),
    {
      name: 'ui-store',
    }
  )
);