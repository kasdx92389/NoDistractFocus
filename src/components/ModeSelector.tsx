import React, { useRef, useState } from 'react'
import { useStore } from '../store'
import { readableOn } from '../util'
import { motion } from 'framer-motion'

export const ModeSelector = React.memo(function ModeSelector() {
  const timerModes = useStore((s) => s.settings.timerModes)
  const activeModeIndex = useStore((s) => s.settings.activeModeIndex)
  const setActiveModeIndex = useStore((s) => s.setActiveModeIndex)
  const updateTimerMode = useStore((s) => s.updateTimerMode)
  const timerStatus = useStore((s) => s.timerStatus)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // Mobile has no double-click; long-press is the touch equivalent for rename.
  const pressTimer = useRef<number | null>(null)
  const pressFired = useRef(false)
  const cancelPress = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null }
  }

  const locked = timerStatus === 'running'

  const beginEdit = (id: string, name: string) => {
    if (locked) return
    setEditingId(id)
    setEditText(name)
  }

  const saveEdit = (id: string) => {
    if (editText.trim()) updateTimerMode(id, { name: editText.trim() })
    setEditingId(null)
  }

  return (
    <div
      id="mode-selector"
      role="tablist"
      aria-label="Timer modes"
      className="flex flex-wrap items-center justify-center gap-1 p-1.5 rounded-2xl max-w-[calc(100vw-2rem)]"
      style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)' }}
    >
      {timerModes.map((mode, i) => {
        const active = i === activeModeIndex
        // The active pill is filled with the mode colour, so the label has to
        // contrast against that colour rather than always being white.
        const labelColor = active ? readableOn(mode.color) : 'var(--t-fg-muted)'
        return (
          <button
            key={mode.id}
            id={`mode-btn-${mode.id}`}
            role="tab"
            aria-selected={active}
            title="Double-click or long-press to rename"
            onClick={() => {
              if (editingId || locked) return
              if (pressFired.current) { pressFired.current = false; return }
              setActiveModeIndex(i)
            }}
            onDoubleClick={(e) => { e.stopPropagation(); beginEdit(mode.id, mode.name) }}
            onPointerDown={() => {
              pressFired.current = false
              pressTimer.current = window.setTimeout(() => {
                pressFired.current = true
                beginEdit(mode.id, mode.name)
              }, 500)
            }}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
            onPointerCancel={cancelPress}
            className={`relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              locked && !active ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
            }`}
            style={{ color: labelColor, touchAction: 'manipulation' }}
          >
            {active && (
              <motion.div
                layoutId="mode-indicator"
                className="absolute inset-0 rounded-xl"
                style={{ backgroundColor: mode.color }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            {editingId === mode.id ? (
              <input
                autoFocus
                type="text"
                value={editText}
                maxLength={40}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={() => saveEdit(mode.id)}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') saveEdit(mode.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 bg-transparent text-sm font-medium outline-none text-center w-full"
                style={{ color: labelColor }}
                aria-label={`Rename ${mode.name}`}
              />
            ) : (
              <span className="relative z-10">{mode.name}</span>
            )}
          </button>
        )
      })}
    </div>
  )
})
