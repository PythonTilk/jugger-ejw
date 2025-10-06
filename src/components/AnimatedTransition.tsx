'use client'

import React, { ReactNode } from 'react'
import { useReducedMotion } from '../hooks/useAccessibility'

interface AnimatedTransitionProps {
  children: ReactNode
  type?: 'fade' | 'slide' | 'scale' | 'bounce'
  duration?: 'fast' | 'normal' | 'slow'
  delay?: number
  className?: string
}

export const AnimatedTransition: React.FC<AnimatedTransitionProps> = ({
  children,
  type = 'fade',
  duration = 'normal',
  delay = 0,
  className = ''
}) => {
  const prefersReducedMotion = useReducedMotion()

  // If user prefers reduced motion, don't animate
  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  const durationClasses = {
    fast: 'duration-150',
    normal: 'duration-300',
    slow: 'duration-500'
  }

  const typeClasses = {
    fade: 'animate-fade-in',
    slide: 'animate-slide-in',
    scale: 'animate-scale-in',
    bounce: 'animate-bounce-in'
  }

  const delayStyle = delay > 0 ? { animationDelay: `${delay}ms` } : {}

  return (
    <div 
      className={`${typeClasses[type]} ${durationClasses[duration]} ${className}`}
      style={delayStyle}
    >
      {children}
    </div>
  )
}

// Specific transition components
export const FadeIn: React.FC<Omit<AnimatedTransitionProps, 'type'>> = (props) => (
  <AnimatedTransition {...props} type="fade" />
)

export const SlideIn: React.FC<Omit<AnimatedTransitionProps, 'type'>> = (props) => (
  <AnimatedTransition {...props} type="slide" />
)

export const ScaleIn: React.FC<Omit<AnimatedTransitionProps, 'type'>> = (props) => (
  <AnimatedTransition {...props} type="scale" />
)

export const BounceIn: React.FC<Omit<AnimatedTransitionProps, 'type'>> = (props) => (
  <AnimatedTransition {...props} type="bounce" />
)

export default AnimatedTransition