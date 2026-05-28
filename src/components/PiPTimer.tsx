import React, { useMemo, useState } from 'react'
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
  const fontWeight = useStore((s) => s.settings.fontWeight)

  const [hovered, setHovered] = useState(false)

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

  const running = timerStatus === 'running'
  const modeColor = activeMode.color ?? '#3b82f6'
  const label = (activeTask ? activeTask.title : activeMode.name).toUpperCase()

  const handleToggle = () => setTimerStatus(running ? 'paused' : 'running')

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: `'${fontFamily}', 'Noto Sans Thai', sans-serif`,
        background: 'var(--t-bg, #0f1117)',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        userSelect: 'none',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Accent line at top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: modeColor }} />

      {/* Status dot — always visible, minimal */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: running ? '#22c55e' : '#4b5563',
          transition: 'background 0.3s',
        }}
      />

      {/* Timer — always visible */}
      <div
        style={{
          fontSize: '50px',
          fontWeight,
          fontFamily: `'${fontFamily}', sans-serif`,
          lineHeight: 1,
          color: 'var(--t-fg, #e8eaed)',
          letterSpacing: '-0.025em',
        }}
      >
        {displayTime}
      </div>

      {/* Hover overlay — fades in on hover */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.72)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.18s ease',
          pointerEvents: hovered ? 'auto' : 'none',
        }}
      >
        {/* Label */}
        <div
          style={{
            fontSize: '10px',
            color: '#9ca3af',
            letterSpacing: '0.1em',
            fontWeight: 600,
            maxWidth: 180,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>

        {/* Status */}
        <div
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: running ? '#22c55e' : '#6b7280',
            letterSpacing: '0.08em',
          }}
        >
          {running ? '▶  RUNNING' : '⏸  PAUSED'}
        </div>

        {/* Play / Pause */}
        <button
          onClick={handleToggle}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            marginTop: 2,
            padding: '5px 20px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.12)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.18)',
            cursor: 'pointer',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <FontAwesomeIcon icon={running ? faPause : faPlay} style={{ fontSize: 9 }} />
          {running ? 'PAUSE' : 'START'}
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            fontSize: 13,
            padding: '3px 5px',
            borderRadius: 5,
            lineHeight: 1,
          }}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
    </div>
  )
}
