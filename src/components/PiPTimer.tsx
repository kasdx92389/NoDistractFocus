import React, { useMemo } from 'react'
import { useStore } from '../store'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faPause, faXmark } from '@fortawesome/free-solid-svg-icons'

interface PiPTimerProps {
  onClose: () => void
}

export function PiPTimer({ onClose }: PiPTimerProps) {
  const timeRemaining = useStore((s) => s.timeRemaining)
  const timerStatus = useStore((s) => s.timerStatus)
  const setTimerStatus = useStore((s) => s.setTimerStatus)
  const activeTaskId = useStore((s) => s.activeTaskId)
  const tasks = useStore((s) => s.tasks)
  const activeMode = useStore((s) => s.activeMode())
  const fontFamily = useStore((s) => s.settings.fontFamily)

  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeTaskId),
    [tasks, activeTaskId]
  )

  const displayTime = useMemo(() => {
    const total = Math.ceil(timeRemaining)
    const mins = Math.floor(total / 60)
    const secs = total % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, [timeRemaining])

  const modeColor = activeMode.color ?? '#3b82f6'

  const handleToggle = () => {
    setTimerStatus(timerStatus === 'running' ? 'paused' : 'running')
  }

  return (
    <div
      style={{
        fontFamily: `'${fontFamily}', 'Noto Sans Thai', sans-serif`,
        background: 'var(--t-bg, #0f1117)',
        color: 'var(--t-fg, #e8eaed)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        position: 'relative',
        userSelect: 'none',
        boxSizing: 'border-box',
        padding: '12px',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'transparent',
          border: 'none',
          color: 'var(--t-fg-muted, #9ca3af)',
          cursor: 'pointer',
          fontSize: 14,
          padding: '4px 6px',
          borderRadius: 6,
          lineHeight: 1,
        }}
        title="Close"
      >
        <FontAwesomeIcon icon={faXmark} />
      </button>

      {/* Mode / Task label */}
      <div
        style={{
          fontSize: '11px',
          color: 'var(--t-fg-dim, #6b7280)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontWeight: 600,
          maxWidth: '240px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
      >
        {activeTask ? activeTask.title : activeMode.name}
      </div>

      {/* Timer */}
      <div
        style={{
          fontSize: '52px',
          fontWeight: 700,
          fontFamily: `'${fontFamily}', 'JetBrains Mono', monospace`,
          lineHeight: 1,
          color: timerStatus === 'running' ? modeColor : 'var(--t-fg, #e8eaed)',
          transition: 'color 0.3s',
          letterSpacing: '-2px',
        }}
      >
        {displayTime}
      </div>

      {/* Play / Pause button */}
      <button
        onClick={handleToggle}
        style={{
          marginTop: '4px',
          padding: '8px 28px',
          borderRadius: '10px',
          background: 'var(--t-bg-card, #1a1d27)',
          color: 'var(--t-fg, #e8eaed)',
          border: '1px solid var(--t-border, #2a2e3a)',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <FontAwesomeIcon icon={timerStatus === 'running' ? faPause : faPlay} style={{ fontSize: 10 }} />
        {timerStatus === 'running' ? 'PAUSE' : 'START'}
      </button>
    </div>
  )
}
