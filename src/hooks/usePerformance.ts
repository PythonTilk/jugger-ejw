import { useEffect, useRef, useState } from 'react'

interface PerformanceMetrics {
  renderTime: number
  componentMounts: number
  rerenders: number
  memoryUsage?: number
}

export const usePerformance = (componentName: string) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    componentMounts: 0,
    rerenders: 0
  })
  
  const renderStartTime = useRef<number>(0)
  const mountCount = useRef<number>(0)
  const rerenderCount = useRef<number>(0)

  // Track component mount
  useEffect(() => {
    mountCount.current += 1
    setMetrics(prev => ({
      ...prev,
      componentMounts: mountCount.current
    }))
  }, [])

  // Track renders
  useEffect(() => {
    renderStartTime.current = performance.now()
    
    return () => {
      const renderTime = performance.now() - renderStartTime.current
      rerenderCount.current += 1
      
      setMetrics(prev => ({
        ...prev,
        renderTime,
        rerenders: rerenderCount.current,
        memoryUsage: (performance as any).memory?.usedJSHeapSize
      }))
      
      // Log performance in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName}:`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          rerenders: rerenderCount.current,
          mounts: mountCount.current
        })
      }
    }
  })

  return metrics
}

// Hook for measuring async operations
export const useAsyncPerformance = () => {
  const measureAsync = async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    const startTime = performance.now()
    
    try {
      const result = await operation()
      const endTime = performance.now()
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Async Performance] ${operationName}: ${(endTime - startTime).toFixed(2)}ms`)
      }
      
      return result
    } catch (error) {
      const endTime = performance.now()
      
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Async Performance] ${operationName} failed after ${(endTime - startTime).toFixed(2)}ms:`, error)
      }
      
      throw error
    }
  }

  return { measureAsync }
}

// Hook for monitoring bundle size and loading performance
export const useBundlePerformance = () => {
  const [loadingMetrics, setLoadingMetrics] = useState({
    domContentLoaded: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    firstInputDelay: 0,
    cumulativeLayoutShift: 0
  })

  useEffect(() => {
    // Measure Core Web Vitals
    const measureWebVitals = () => {
      // DOM Content Loaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          setLoadingMetrics(prev => ({
            ...prev,
            domContentLoaded: performance.now()
          }))
        })
      }

      // Performance Observer for other metrics
      if ('PerformanceObserver' in window) {
        // First Contentful Paint
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              setLoadingMetrics(prev => ({
                ...prev,
                firstContentfulPaint: entry.startTime
              }))
            }
          }
        })
        paintObserver.observe({ entryTypes: ['paint'] })

        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          setLoadingMetrics(prev => ({
            ...prev,
            largestContentfulPaint: lastEntry.startTime
          }))
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            setLoadingMetrics(prev => ({
              ...prev,
              firstInputDelay: (entry as any).processingStart - entry.startTime
            }))
          }
        })
        fidObserver.observe({ entryTypes: ['first-input'] })

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
          setLoadingMetrics(prev => ({
            ...prev,
            cumulativeLayoutShift: clsValue
          }))
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })
      }
    }

    measureWebVitals()
  }, [])

  return loadingMetrics
}

export default usePerformance