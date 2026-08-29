import React from 'react'
import { useStore } from '../store'
import { unlockAudio } from '../util'
import { motion } from 'framer-motion'

export const Controls = React.memo(function Controls() {
  const timerStatus = useStore((s) => s.timerStatus)
  const setTimerStatus = useStore((s) => s.setTimerStatus)

  const running = timerStatus === 'running'

  const handleToggle = () => {
    // Counts as the user gesture that lets Web Audio play the end chime later.
    unlockAudio()
    setTimerStatus(running ? 'paused' : 'running')
  }

  return (
    <div id="controls" className="flex flex-col items-center">
      <motion.button
        id="btn-toggle"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleToggle}
        className="px-12 sm:px-16 py-4 rounded-xl text-lg font-bold tracking-widest uppercase transition-all duration-200"
        style={{
          background: 'var(--t-bg-card)',
          color: 'var(--t-fg)',
          boxShadow: '0 4px 12px var(--t-shadow)',
        }}
        aria-label={running ? 'Pause timer' : 'Start timer'}
      >
        {running ? 'PAUSE' : 'START'}
      </motion.button>
    </div>
  )
})
