import React, { useMemo } from 'react'
import { useStore } from '../store'

export const TimerDisplay = React.memo(function TimerDisplay() {
  // Granular selectors — only re-render when these specific values change
  const timeRemaining = useStore((s) => s.timeRemaining)
  const timerFontSize = useStore((s) => s.settings.timerFontSize)
  const fontWeight = useStore((s) => s.settings.fontWeight)
  const fontFamily = useStore((s) => s.settings.fontFamily)

  const displayTime = useMemo(() => {
    const total = Math.ceil(timeRemaining)
    const mins = Math.floor(total / 60)
    const secs = total % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, [timeRemaining])

  return (
    <div id="timer-display" className="flex items-center justify-center">
      <div
        className="timer-display tracking-tight"
        style={{
          fontSize: `${timerFontSize}px`,
          fontWeight,
          fontFamily: `'${fontFamily}', sans-serif`,
          color: 'var(--t-fg)',
          lineHeight: 1,
        }}
      >
        {displayTime}
      </div>
    </div>
  )
})
