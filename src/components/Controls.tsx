import React from 'react'
import { useStore } from '../store'
import { motion } from 'framer-motion'

export const Controls = React.memo(function Controls() {
  const timerStatus = useStore((s) => s.timerStatus)
  const setTimerStatus = useStore((s) => s.setTimerStatus)

  const handleToggle = () => {
    if (timerStatus === 'running') {
      setTimerStatus('paused')
    } else {
      setTimerStatus('running')
    }
  }

  const label = timerStatus === 'running' ? 'PAUSE' : 'START'

  return (
    <div id="controls" className="flex flex-col items-center">
      <motion.button
        id="btn-toggle"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleToggle}
        className="px-16 py-4 rounded-xl text-lg font-bold tracking-widest uppercase transition-all duration-200"
        style={{
          background: 'var(--t-bg-card)',
          color: 'var(--t-fg)',
          boxShadow: '0 4px 12px var(--t-shadow)',
        }}
      >
        {label}
      </motion.button>
    </div>
  )
})
