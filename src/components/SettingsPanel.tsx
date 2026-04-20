import React, { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark, faPlus, faTrash, faChevronUp, faChevronDown,
  faVolumeHigh, faVolumeXmark, faBell, faBellSlash,
  faRotateLeft, faChartSimple,
} from '@fortawesome/free-solid-svg-icons'

// ─── Preset color swatches for mode color picker ──
const SWATCH_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#f43f5e', '#6b7280', '#1e293b',
]

function ColorPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative flex items-center" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-4 h-4 rounded-full shrink-0 cursor-pointer transition-transform hover:scale-110"
        style={{ backgroundColor: color }}
      />
      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 z-30 p-2 rounded-xl shadow-lg grid grid-cols-4 gap-1.5"
          style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', width: 130 }}
        >
          {SWATCH_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { onChange(c); setOpen(false) }}
              className="w-6 h-6 rounded-md transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                outline: c === color ? '2px solid var(--t-fg)' : 'none',
                outlineOffset: 1,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Toggle Switch ───────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-10 h-5.5 rounded-full transition-colors duration-200 shrink-0"
      style={{ background: value ? '#3b82f6' : 'var(--t-border)', width: 40, height: 22 }}
    >
      <motion.div
        className="absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm"
        animate={{ left: value ? '20px' : '2px' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  )
}

// ─── Setting row ─────────────────────────────────
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[13px]" style={{ color: 'var(--t-fg)' }}>{label}</span>
      {children}
    </div>
  )
}

// ─── Divider ─────────────────────────────────────
function Divider() {
  return <div className="my-2" style={{ borderTop: '1px solid var(--t-border)' }} />
}

// ─── Section label ───────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-wider mt-4 mb-2" style={{ color: 'var(--t-fg-dim)' }}>
      {children}
    </div>
  )
}

// ─── Main Settings Panel ─────────────────────────
export function SettingsPanel() {
  const {
    settings, updateSettings, settingsOpen, setSettingsOpen,
    toggleDarkMode, sessions, sessionCount, resetStats, resetSettings,
    addTimerMode, updateTimerMode, deleteTimerMode,
  } = useStore()
  const [showAddMode, setShowAddMode] = useState(false)
  const [newModeName, setNewModeName] = useState('')
  const [newModeDuration, setNewModeDuration] = useState(25)
  const [visible, setVisible] = useState(false)
  const [editingModeId, setEditingModeId] = useState<string | null>(null)
  const [editingModeName, setEditingModeName] = useState('')

  useEffect(() => {
    if (settingsOpen) {
      setVisible(true)
    }
  }, [settingsOpen])

  const requestNotif = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') updateSettings({ desktopNotifications: true })
    }
  }

  const handleAddMode = () => {
    if (!newModeName.trim()) return
    addTimerMode({ name: newModeName.trim(), duration: newModeDuration * 60, color: '#3b82f6' })
    setNewModeName('')
    setNewModeDuration(25)
    setShowAddMode(false)
  }

  // Stats
  const todayKey = new Date().toISOString().split('T')[0]
  const todayRecord = sessions.find((s) => s.date === todayKey)
  const totalSessions = sessions.reduce((acc, s) => acc + s.completedSessions, 0)
  const totalMinutes = sessions.reduce((acc, s) => acc + s.totalFocusMinutes, 0)

  const handleClose = () => {
    setSettingsOpen(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: 'var(--t-overlay)',
          opacity: settingsOpen ? 1 : 0,
          pointerEvents: settingsOpen ? 'auto' : 'none',
        }}
        onClick={handleClose}
      />

      {/* Panel with slide animation */}
      {(settingsOpen || visible) && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: settingsOpen ? 0 : '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          onAnimationComplete={() => { if (!settingsOpen) setVisible(false) }}
          className="fixed right-0 top-0 bottom-0 w-full max-w-sm z-50 overflow-hidden flex flex-col"
          style={{ background: 'var(--t-bg-card)', borderLeft: '1px solid var(--t-border)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--t-border)' }}>
              <h2 className="text-base font-bold" style={{ color: 'var(--t-fg)' }}>Settings</h2>
              <button
                onClick={() => setSettingsOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--t-fg-muted)' }}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-3">

              {/* ── Theme ── */}
              <SectionLabel>Theme</SectionLabel>
              <Row label={settings.darkMode ? 'Dark Mode' : 'Light Mode'}>
                <Toggle value={settings.darkMode} onChange={() => toggleDarkMode()} />
              </Row>
              <Row label="Dark Mode when running">
                <Toggle value={settings.darkModeWhenRunning} onChange={(v) => updateSettings({ darkModeWhenRunning: v })} />
              </Row>

              <Divider />

              {/* ── Timer Modes ── */}
              <SectionLabel>Timer</SectionLabel>
              <div className="flex flex-col gap-2">
                {settings.timerModes.map((mode) => {
                  const mins = Math.round(mode.duration / 60)
                  return (
                    <div
                      key={mode.id}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                      style={{ background: 'var(--t-bg-input)' }}
                    >
                      <ColorPicker color={mode.color} onChange={(c) => updateTimerMode(mode.id, { color: c })} />
                      {editingModeId === mode.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={editingModeName}
                          onChange={(e) => setEditingModeName(e.target.value)}
                          onBlur={() => {
                            if (editingModeName.trim()) updateTimerMode(mode.id, { name: editingModeName.trim() })
                            setEditingModeId(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editingModeName.trim()) updateTimerMode(mode.id, { name: editingModeName.trim() })
                              setEditingModeId(null)
                            }
                            if (e.key === 'Escape') setEditingModeId(null)
                          }}
                          className="flex-1 bg-transparent text-[13px] outline-none min-w-0 px-1 rounded"
                          style={{ color: 'var(--t-fg)', border: '1px solid var(--t-border)' }}
                        />
                      ) : (
                        <span
                          className="flex-1 text-[13px] min-w-0 truncate cursor-default select-none"
                          style={{ color: 'var(--t-fg)' }}
                          onDoubleClick={() => {
                            setEditingModeId(mode.id)
                            setEditingModeName(mode.name)
                          }}
                        >
                          {mode.name}
                        </span>
                      )}
                      <div className="flex items-stretch h-7" style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--t-border)' }}>
                        <span className="w-8 flex items-center justify-center text-[12px]" style={{ color: 'var(--t-fg-muted)', background: 'var(--t-bg)' }}>
                          {mins}
                        </span>
                        <div className="flex flex-col w-5" style={{ borderLeft: '1px solid var(--t-border)' }}>
                          <button
                            onClick={() => updateTimerMode(mode.id, { duration: Math.min(240, mins + 1) * 60 })}
                            className="flex-1 flex items-center justify-center transition-colors"
                            style={{ background: 'var(--t-bg)', color: 'var(--t-fg-dim)' }}
                          >
                            <FontAwesomeIcon icon={faChevronUp} style={{ fontSize: 7 }} />
                          </button>
                          <div style={{ height: 1, background: 'var(--t-border)' }} />
                          <button
                            onClick={() => updateTimerMode(mode.id, { duration: Math.max(1, mins - 1) * 60 })}
                            className="flex-1 flex items-center justify-center transition-colors"
                            style={{ background: 'var(--t-bg)', color: 'var(--t-fg-dim)' }}
                          >
                            <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 7 }} />
                          </button>
                        </div>
                      </div>
                      {settings.timerModes.length > 1 && (
                        <button
                          onClick={() => deleteTimerMode(mode.id)}
                          className="ml-0.5 transition-colors"
                          style={{ color: 'var(--t-fg-dim)' }}
                        >
                          <FontAwesomeIcon icon={faTrash} size="xs" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {showAddMode ? (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={newModeName}
                    onChange={(e) => setNewModeName(e.target.value)}
                    placeholder="Name"
                    className="flex-1 t-input rounded-lg px-2.5 py-1.5 text-[13px]"
                    autoFocus
                  />
                  <input
                    type="number"
                    value={newModeDuration}
                    onChange={(e) => setNewModeDuration(Number(e.target.value))}
                    className="w-14 t-input rounded-lg px-2 py-1.5 text-[13px] text-right"
                    min={1}
                  />
                  <button onClick={handleAddMode} className="text-[13px] font-medium px-2.5 py-1.5 rounded-lg" style={{ background: '#3b82f6', color: '#fff' }}>Add</button>
                  <button onClick={() => setShowAddMode(false)} className="text-[13px] px-1" style={{ color: 'var(--t-fg-dim)' }}>
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddMode(true)}
                  className="mt-2 w-full py-2 rounded-lg text-[12px] transition-colors flex items-center justify-center gap-1.5"
                  style={{ border: '1px dashed var(--t-border)', color: 'var(--t-fg-dim)' }}
                >
                  <FontAwesomeIcon icon={faPlus} size="xs" /> Add Mode
                </button>
              )}

              <Divider />

              {/* ── Focus ── */}
              <SectionLabel>Focus</SectionLabel>
              <Row label="Colored background">
                <Toggle value={settings.focusColoredBackground} onChange={(v) => updateSettings({ focusColoredBackground: v })} />
              </Row>

              <Divider />

              {/* ── Behavior ── */}
              <SectionLabel>Behavior</SectionLabel>
              <Row label="Auto-start sessions">
                <Toggle value={settings.autoStartNextSession} onChange={(v) => updateSettings({ autoStartNextSession: v })} />
              </Row>
              <Row label="Auto-start breaks">
                <Toggle value={settings.autoStartBreaks} onChange={(v) => updateSettings({ autoStartBreaks: v })} />
              </Row>
              <Row label="Pomodoro 24/7">
                <Toggle value={settings.loopMode} onChange={(v) => updateSettings({ loopMode: v })} />
              </Row>

              <Divider />

              {/* ── Sound & Notifications ── */}
              <SectionLabel>Alerts</SectionLabel>
              <Row label="Sound">
                <div className="flex items-center gap-2.5">
                  <FontAwesomeIcon icon={settings.soundEnabled ? faVolumeHigh : faVolumeXmark} size="sm" style={{ color: 'var(--t-fg-dim)' }} />
                  <Toggle value={settings.soundEnabled} onChange={(v) => updateSettings({ soundEnabled: v })} />
                </div>
              </Row>
              {settings.soundEnabled && (
                <Row label="Volume">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.soundVolume}
                    onChange={(e) => updateSettings({ soundVolume: Number(e.target.value) })}
                    className="w-24"
                  />
                </Row>
              )}
              <Row label="Notifications">
                <div className="flex items-center gap-2.5">
                  <FontAwesomeIcon icon={settings.desktopNotifications ? faBell : faBellSlash} size="sm" style={{ color: 'var(--t-fg-dim)' }} />
                  {settings.desktopNotifications ? (
                    <Toggle value={true} onChange={(v) => updateSettings({ desktopNotifications: v })} />
                  ) : (
                    <button
                      onClick={requestNotif}
                      className="text-[12px] font-medium px-2.5 py-1 rounded-lg"
                      style={{ background: 'var(--t-bg-input)', color: 'var(--t-fg-muted)', border: '1px solid var(--t-border)' }}
                    >
                      Enable
                    </button>
                  )}
                </div>
              </Row>

              <Divider />

              {/* ── Font size ── */}
              <SectionLabel>Display</SectionLabel>
              <Row label="Timer size">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={60}
                    max={180}
                    value={settings.timerFontSize}
                    onChange={(e) => updateSettings({ timerFontSize: Number(e.target.value) })}
                    className="w-24"
                  />
                  <span className="text-[11px] font-mono w-8 text-right" style={{ color: 'var(--t-fg-dim)' }}>{settings.timerFontSize}</span>
                </div>
              </Row>

              <Divider />

              {/* ── Stats ── */}
              <SectionLabel>Stats</SectionLabel>
              <Row label="Today">
                <span className="text-[13px] font-bold" style={{ color: 'var(--t-fg)' }}>{todayRecord?.completedSessions || 0} sessions</span>
              </Row>
              <Row label="Total">
                <span className="text-[13px] font-bold" style={{ color: 'var(--t-fg)' }}>{totalSessions} sessions</span>
              </Row>
              <Row label="Focus time">
                <span className="text-[13px] font-bold" style={{ color: 'var(--t-fg)' }}>{Math.round(totalMinutes)}m</span>
              </Row>

              <Divider />

              {/* ── Reset ── */}
              <SectionLabel>Reset</SectionLabel>
              <Row label="Reset stats">
                <button
                  onClick={resetStats}
                  className="text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: 'var(--t-bg-input)', color: 'var(--t-fg-muted)', border: '1px solid var(--t-border)' }}
                >
                  Clear
                </button>
              </Row>
              <Row label="Reset all settings">
                <button
                  onClick={resetSettings}
                  className="text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  Reset
                </button>
              </Row>
              <div className="mb-4" />

            </div>
          </motion.div>
      )}
    </>
  )
}
