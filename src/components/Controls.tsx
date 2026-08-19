import React from 'react'
import { useStore } from '../store'
import { unlockAudio } from '../util'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRotateLeft, faForwardStep } from '@fortawesome/free-solid-svg-icons'

export const Controls = React.memo(function Controls() {
  const timerStatus = useStore((s) => s.timerStatus)
  const setTimerStatus = useStore((s) => s.setTimerStatus)
  const resetTimer = useStore((s) => s.resetTimer)
  const skipToNext = useStore((s) => s.skipToNext)
  const skipActiveTask = useStore((s) => s.skipActiveTask)
  const activeTaskId = useStore((s) => s.activeTaskId)

  const running = timerStatus === 'running'

  const handleToggle = () => {
    // Counts as the user gesture that lets Web Audio play the end chime later.
    unlockAudio()
    setTimerStatus(running ? 'paused' : 'running')
  }

  // Phones have no keyboard, so reset/skip need real buttons — they were
  // reachable only via R and N before.
  const sideBtn = 'w-11 h-11 rounded-xl flex items-center justify-center transition-all'
  const sideStyle: React.CSSProperties = {
    background: 'var(--t-bg-card)',
    color: 'var(--t-fg-muted)',
    border: '1px solid var(--t-border)',
  }

  return (
    <div id="controls" className="flex items-center justify-center gap-3">
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={resetTimer}
        className={sideBtn}
        style={sideStyle}
        aria-label="Reset timer"
        title="Reset (R)"
      >
        <FontAwesomeIcon icon={faRotateLeft} size="sm" />
      </motion.button>

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

      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => (activeTaskId ? skipActiveTask() : skipToNext())}
        className={sideBtn}
        style={sideStyle}
        aria-label="Skip to next"
        title="Skip (N)"
      >
        <FontAwesomeIcon icon={faForwardStep} size="sm" />
      </motion.button>
    </div>
  )
})
