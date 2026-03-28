import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 1.02
  }
}

const pageTransition = {
  type: 'tween' as const,
  ease: 'anticipate' as const,
  duration: 0.3
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// For more complex layouts, we can provide different transition variants
export function PageTransitionFade({ children, className = '' }: PageTransitionProps) {
  const location = useLocation()

  const fadeVariants = {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 }
  }

  const fadeTransition = {
    type: 'tween' as const,
    ease: 'easeInOut' as const,
    duration: 0.2
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={fadeVariants}
        transition={fadeTransition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// For dashboard pages that need subtle transitions
export function DashboardPageTransition({ children, className = '' }: PageTransitionProps) {
  const location = useLocation()

  const dashboardVariants = {
    initial: { 
      opacity: 0, 
      x: 10 
    },
    in: { 
      opacity: 1, 
      x: 0 
    },
    out: { 
      opacity: 0, 
      x: -10 
    }
  }

  const dashboardTransition = {
    type: 'tween' as const,
    ease: 'easeInOut' as const,
    duration: 0.25
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={dashboardVariants}
        transition={dashboardTransition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
