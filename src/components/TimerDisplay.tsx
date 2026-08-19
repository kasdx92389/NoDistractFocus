import React, { useMemo } from 'react'
import { useStore } from '../store'
import { fmtClock } from '../util'

const RING_SIZE = 340
const RING_STROKE = 6
const RADIUS = (RING_SIZE - RING_STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export const TimerDisplay = React.memo(function TimerDisplay() {
  // Granular selectors — only re-render when these specific values change.
  const timeRemaining = useStore((s) => s.timeRemaining)
  const timerFontSize = useStore((s) => s.settings.timerFontSize)
  const fontWeight = useStore((s) => s.settings.fontWeight)
  const fontFamily = useStore((s) => s.settings.fontFamily)
  const showRing = useStore((s) => s.settings.showProgressRing)
  const activeMode = useStore((s) => s.activeMode())
  const activeTaskId = useStore((s) => s.activeTaskId)
  const tasks = useStore((s) => s.tasks)
  const focusMode = useStore((s) => s.focusMode)
  const focusColoredBg = useStore((s) => s.settings.focusColoredBackground)

  const displayTime = useMemo(() => fmtClock(timeRemaining), [timeRemaining])

  const total = useMemo(() => {
    const task = activeTaskId ? tasks.find((t) => t.id === activeTaskId) : undefined
    return (task ? task.duration : activeMode.duration) || 1
  }, [activeTaskId, tasks, activeMode.duration])

  // Elapsed fraction, clamped: timeRemaining can briefly exceed `total` right
  // after a mode switch, which would otherwise draw a negative dash offset.
  const progress = Math.min(1, Math.max(0, 1 - timeRemaining / total))

  // In focus mode the background *is* the mode colour, so drawing the ring in
  // that same colour would make it invisible. Fall back to the text token,
  // which the focus overlay has already set to a readable value.
  const ringColor = focusMode && focusColoredBg ? 'var(--t-fg)' : activeMode.color

  return (
    <div id="timer-display" className="relative flex items-center justify-center">
      {showRing && (
        <svg
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{ width: 'min(340px, 78vw)', height: 'min(340px, 78vw)', transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
            fill="none" stroke="var(--t-fg)" strokeOpacity={0.14} strokeWidth={RING_STROKE}
          />
          <circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
            fill="none" stroke={ringColor} strokeWidth={RING_STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 0.25s linear' }}
          />
        </svg>
      )}

      <div
        className="timer-display tracking-tight relative"
        role="timer"
        aria-live="off"
        aria-label={`${displayTime} remaining`}
        style={{
          // ponytail: cap at viewport width so big sizes never overflow phones
          fontSize: `min(${timerFontSize}px, 22vw)`,
          fontWeight,
          fontFamily: `'${fontFamily}', sans-serif`,
          color: 'var(--t-fg)',
          lineHeight: 1,
          // Digits must not shuffle the layout as they change.
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {displayTime}
      </div>
    </div>
  )
})
