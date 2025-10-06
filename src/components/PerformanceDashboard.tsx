'use client'

import React, { useState, useEffect } from 'react'
import { useBundlePerformance } from '../hooks/usePerformance'

export const PerformanceDashboard: React.FC = () => {
  const bundleMetrics = useBundlePerformance()
  const [memoryInfo, setMemoryInfo] = useState<any>(null)
  const [connectionInfo, setConnectionInfo] = useState<any>(null)

  useEffect(() => {
    // Get memory information if available
    if ('memory' in performance) {
      setMemoryInfo((performance as any).memory)
    }

    // Get connection information if available
    if ('connection' in navigator) {
      setConnectionInfo((navigator as any).connection)
    }
  }, [])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTime = (time: number) => {
    return `${time.toFixed(2)}ms`
  }

  const getPerformanceScore = () => {
    const { firstContentfulPaint, largestContentfulPaint, firstInputDelay, cumulativeLayoutShift } = bundleMetrics
    
    let score = 100
    
    // FCP scoring (good: <1.8s, needs improvement: 1.8s-3s, poor: >3s)
    if (firstContentfulPaint > 3000) score -= 25
    else if (firstContentfulPaint > 1800) score -= 10
    
    // LCP scoring (good: <2.5s, needs improvement: 2.5s-4s, poor: >4s)
    if (largestContentfulPaint > 4000) score -= 25
    else if (largestContentfulPaint > 2500) score -= 10
    
    // FID scoring (good: <100ms, needs improvement: 100ms-300ms, poor: >300ms)
    if (firstInputDelay > 300) score -= 25
    else if (firstInputDelay > 100) score -= 10
    
    // CLS scoring (good: <0.1, needs improvement: 0.1-0.25, poor: >0.25)
    if (cumulativeLayoutShift > 0.25) score -= 25
    else if (cumulativeLayoutShift > 0.1) score -= 10
    
    return Math.max(0, score)
  }

  const performanceScore = getPerformanceScore()
  const scoreColor = performanceScore >= 90 ? 'text-green-600' : performanceScore >= 70 ? 'text-yellow-600' : 'text-red-600'
  const scoreBg = performanceScore >= 90 ? 'bg-green-50' : performanceScore >= 70 ? 'bg-yellow-50' : 'bg-red-50'

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Performance Dashboard
      </h3>

      {/* Performance Score */}
      <div className={`p-4 rounded-lg mb-6 ${scoreBg}`}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Performance Score</h4>
            <p className="text-sm text-gray-600">Based on Core Web Vitals</p>
          </div>
          <div className={`text-3xl font-bold ${scoreColor}`}>
            {performanceScore}
          </div>
        </div>
      </div>

      {/* Core Web Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">First Contentful Paint</h4>
          <p className="text-2xl font-bold text-blue-600">
            {bundleMetrics.firstContentfulPaint ? formatTime(bundleMetrics.firstContentfulPaint) : 'N/A'}
          </p>
          <p className="text-sm text-gray-600">Good: &lt;1.8s</p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Largest Contentful Paint</h4>
          <p className="text-2xl font-bold text-blue-600">
            {bundleMetrics.largestContentfulPaint ? formatTime(bundleMetrics.largestContentfulPaint) : 'N/A'}
          </p>
          <p className="text-sm text-gray-600">Good: &lt;2.5s</p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">First Input Delay</h4>
          <p className="text-2xl font-bold text-blue-600">
            {bundleMetrics.firstInputDelay ? formatTime(bundleMetrics.firstInputDelay) : 'N/A'}
          </p>
          <p className="text-sm text-gray-600">Good: &lt;100ms</p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Cumulative Layout Shift</h4>
          <p className="text-2xl font-bold text-blue-600">
            {bundleMetrics.cumulativeLayoutShift ? bundleMetrics.cumulativeLayoutShift.toFixed(3) : 'N/A'}
          </p>
          <p className="text-sm text-gray-600">Good: &lt;0.1</p>
        </div>
      </div>

      {/* Memory Information */}
      {memoryInfo && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Memory Usage</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Used JS Heap</p>
              <p className="font-semibold">{formatBytes(memoryInfo.usedJSHeapSize)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Total JS Heap</p>
              <p className="font-semibold">{formatBytes(memoryInfo.totalJSHeapSize)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">JS Heap Limit</p>
              <p className="font-semibold">{formatBytes(memoryInfo.jsHeapSizeLimit)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Information */}
      {connectionInfo && (
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-3">Network Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Connection Type</p>
              <p className="font-semibold capitalize">{connectionInfo.effectiveType || 'Unknown'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Downlink</p>
              <p className="font-semibold">{connectionInfo.downlink ? `${connectionInfo.downlink} Mbps` : 'Unknown'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Performance Tips */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Performance Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use the integration test to verify all components work together</li>
          <li>• Enable P2P sync only when needed to save resources</li>
          <li>• Close unused tournament tabs to free memory</li>
          <li>• Use fullscreen mode for better scoreboard performance</li>
          {performanceScore < 70 && (
            <li className="text-red-700 font-medium">• Consider refreshing the page if performance is poor</li>
          )}
        </ul>
      </div>
    </div>
  )
}

export default PerformanceDashboard