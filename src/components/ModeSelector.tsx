import React, { useState } from 'react'
import { useStore } from '../store'
import { motion } from 'framer-motion'

export const ModeSelector = React.memo(function ModeSelector() {
  const timerModes = useStore((s) => s.settings.timerModes)
  const activeModeIndex = useStore((s) => s.settings.activeModeIndex)
  const setActiveModeIndex = useStore((s) => s.setActiveModeIndex)
  const updateTimerMode = useStore((s) => s.updateTimerMode)
  const timerStatus = useStore((s) => s.timerStatus)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const saveEdit = (id: string) => {
    if (editText.trim()) updateTimerMode(id, { name: editText.trim() })
    setEditingId(null)
  }

  return (
    <div
      id="mode-selector"
      className="flex items-center gap-1 p-1.5 rounded-2xl"
      style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)' }}
    >
      {timerModes.map((mode, i) => (
        <button
          key={mode.id}
          id={`mode-btn-${mode.id}`}
          onClick={() => {
            if (editingId) return
            if (timerStatus === 'running') return
            setActiveModeIndex(i)
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            if (timerStatus === 'running') return
            setEditingId(mode.id)
            setEditText(mode.name)
          }}
          className={`relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
            timerStatus === 'running' && i !== activeModeIndex ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
          }`}
          style={{
            color: i === activeModeIndex ? '#fff' : 'var(--t-fg-muted)',
          }}
        >
          {i === activeModeIndex && (
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
              onChange={(e) => setEditText(e.target.value)}
              onBlur={() => saveEdit(mode.id)}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') saveEdit(mode.id)
                if (e.key === 'Escape') setEditingId(null)
              }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 bg-transparent text-sm font-medium outline-none text-center w-full"
              style={{ color: i === activeModeIndex ? '#fff' : 'var(--t-fg-muted)' }}
            />
          ) : (
            <span className="relative z-10">{mode.name}</span>
          )}
        </button>
      ))}
    </div>
  )
})
