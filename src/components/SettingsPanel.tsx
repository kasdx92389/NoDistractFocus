import React, { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { fontChoices } from '../defaults'
import { todayKey } from '../util'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark, faPlus, faTrash, faChevronUp, faChevronDown,
  faVolumeHigh, faVolumeXmark, faBell, faBellSlash,
} from '@fortawesome/free-solid-svg-icons'

// ─── Preset color swatches for the mode color picker ──
const SWATCH_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#f43f5e', '#6b7280', '#1e293b',
]

const WEIGHTS = [300, 400, 500, 600, 700, 800, 900]

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
        aria-label="Change mode color"
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
              style={{ backgroundColor: c, outline: c === color ? '2px solid var(--t-fg)' : 'none', outlineOffset: 1 }}
              aria-label={`Set color ${c}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Toggle Switch ───────────────────────────────
function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      aria-label={label}
      className="relative rounded-full transition-colors duration-200 shrink-0"
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
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-[13px] min-w-0" style={{ color: 'var(--t-fg)' }}>{label}</span>
      {children}
    </div>
  )
}

function Divider() {
  return <div className="my-2" style={{ borderTop: '1px solid var(--t-border)' }} />
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-wider mt-4 mb-2" style={{ color: 'var(--t-fg-dim)' }}>
      {children}
    </div>
  )
}

/** Human-readable name for a stored binding string like "Ctrl+ " or " ". */
function keyLabel(key: string): string {
  if (!key) return '—'
  const ctrl = key.toLowerCase().startsWith('ctrl+')
  const base = ctrl ? key.slice(5) : key
  return (ctrl ? 'Ctrl + ' : '') + (base === ' ' ? 'Space' : base.toUpperCase())
}

// ─── Keyboard shortcut capture ───────────────────
function ShortcutRow({ action, label, value }: { action: string; label: string; value: string }) {
  const updateKeyBinding = useStore((s) => s.updateKeyBinding)
  const [listening, setListening] = useState(false)

  useEffect(() => {
    if (!listening) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') { setListening(false); return }
      // Modifier presses on their own aren't a binding.
      if (['Control', 'Meta', 'Shift', 'Alt'].includes(e.key)) return
      updateKeyBinding(action, `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.key === 'Spacebar' ? ' ' : e.key}`)
      setListening(false)
    }
    // Capture phase, or the app's own global shortcut handler sees it first.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [listening, action, updateKeyBinding])

  return (
    <Row label={label}>
      <button
        onClick={() => setListening((v) => !v)}
        className="text-[11px] font-mono px-2.5 py-1 rounded-lg min-w-[5.5rem] transition-colors"
        style={listening
          ? { background: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: '1px solid #3b82f6' }
          : { background: 'var(--t-bg-input)', color: 'var(--t-fg-muted)', border: '1px solid var(--t-border)' }}
      >
        {listening ? 'Press a key…' : keyLabel(value)}
      </button>
    </Row>
  )
}

// ─── Last 7 days mini chart ──────────────────────
function WeekChart() {
  const sessions = useStore((s) => s.sessions)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = todayKey(d)
    return {
      key,
      short: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
      minutes: sessions.find((s) => s.date === key)?.totalFocusMinutes ?? 0,
    }
  })
  const peak = Math.max(25, ...days.map((d) => d.minutes))

  return (
    <div className="flex items-end justify-between gap-1.5 h-16 mt-1 mb-2">
      {days.map((d, i) => (
        <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t"
            title={`${Math.round(d.minutes)} min`}
            style={{
              // Always leave a sliver so an empty day still reads as a bar slot.
              height: `${Math.max(3, (d.minutes / peak) * 46)}px`,
              background: d.minutes > 0 ? '#3b82f6' : 'var(--t-border)',
              opacity: i === 6 ? 1 : 0.75,
            }}
          />
          <span className="text-[9px]" style={{ color: 'var(--t-fg-dim)' }}>{d.short}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Settings Panel ─────────────────────────
export function SettingsPanel() {
  // Granular selectors: subscribing to the whole store re-rendered this panel
  // on every 250ms timer tick.
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const settingsOpen = useStore((s) => s.settingsOpen)
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)
  const toggleDarkMode = useStore((s) => s.toggleDarkMode)
  const sessions = useStore((s) => s.sessions)
  const resetStats = useStore((s) => s.resetStats)
  const resetSettings = useStore((s) => s.resetSettings)
  const addTimerMode = useStore((s) => s.addTimerMode)
  const updateTimerMode = useStore((s) => s.updateTimerMode)
  const deleteTimerMode = useStore((s) => s.deleteTimerMode)

  const [showAddMode, setShowAddMode] = useState(false)
  const [newModeName, setNewModeName] = useState('')
  const [newModeDuration, setNewModeDuration] = useState(25)
  const [visible, setVisible] = useState(false)
  const [editingModeId, setEditingModeId] = useState<string | null>(null)
  const [editingModeName, setEditingModeName] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (settingsOpen) setVisible(true)
    else setConfirmReset(false)
  }, [settingsOpen])

  const requestNotif = async () => {
    if (typeof Notification === 'undefined') return
    try {
      if (await Notification.requestPermission() === 'granted') {
        updateSettings({ desktopNotifications: true })
      }
    } catch { /* unsupported / blocked */ }
  }

  const handleAddMode = () => {
    if (!newModeName.trim()) return
    addTimerMode({
      name: newModeName.trim(),
      duration: Math.min(240, Math.max(1, newModeDuration)) * 60,
      color: '#3b82f6',
    })
    setNewModeName('')
    setNewModeDuration(25)
    setShowAddMode(false)
  }

  // Stats
  const todayRecord = sessions.find((s) => s.date === todayKey())
  const totalSessions = sessions.reduce((acc, s) => acc + s.completedSessions, 0)
  const totalMinutes = sessions.reduce((acc, s) => acc + s.totalFocusMinutes, 0)
  const fmtHours = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${Math.round(m % 60)}m` : `${Math.round(m)}m`)

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
        onClick={() => setSettingsOpen(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      {(settingsOpen || visible) && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
          initial={{ x: '100%' }}
          animate={{ x: settingsOpen ? 0 : '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          onAnimationComplete={() => { if (!settingsOpen) setVisible(false) }}
          className="fixed right-0 top-0 bottom-0 w-full max-w-sm z-50 overflow-hidden flex flex-col"
          style={{ background: 'var(--t-bg-card)', borderLeft: '1px solid var(--t-border)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3.5"
            style={{ borderBottom: '1px solid var(--t-border)', paddingTop: 'max(0.875rem, env(safe-area-inset-top))' }}
          >
            <h2 className="text-base font-bold" style={{ color: 'var(--t-fg)' }}>Settings</h2>
            <button
              onClick={() => setSettingsOpen(false)}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--t-fg-muted)' }}
              aria-label="Close settings"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>

          {/* Scrollable content */}
          <div
            className="flex-1 overflow-y-auto overscroll-contain px-5 py-3"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            {/* ── Theme ── */}
            <SectionLabel>Theme</SectionLabel>
            <Row label={settings.darkMode ? 'Dark Mode' : 'Light Mode'}>
              <Toggle value={settings.darkMode} onChange={() => toggleDarkMode()} label="Dark mode" />
            </Row>
            <Row label="Dark Mode when running">
              <Toggle value={settings.darkModeWhenRunning} onChange={(v) => updateSettings({ darkModeWhenRunning: v })} label="Dark mode when running" />
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
                        maxLength={40}
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
                        className="flex-1 text-[13px] min-w-0 truncate select-none cursor-text"
                        style={{ color: 'var(--t-fg)' }}
                        title="Double-click to rename"
                        onDoubleClick={() => { setEditingModeId(mode.id); setEditingModeName(mode.name) }}
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
                          aria-label={`Increase ${mode.name} duration`}
                        >
                          <FontAwesomeIcon icon={faChevronUp} style={{ fontSize: 7 }} />
                        </button>
                        <div style={{ height: 1, background: 'var(--t-border)' }} />
                        <button
                          onClick={() => updateTimerMode(mode.id, { duration: Math.max(1, mins - 1) * 60 })}
                          className="flex-1 flex items-center justify-center transition-colors"
                          style={{ background: 'var(--t-bg)', color: 'var(--t-fg-dim)' }}
                          aria-label={`Decrease ${mode.name} duration`}
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
                        aria-label={`Delete ${mode.name}`}
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
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddMode(); if (e.key === 'Escape') setShowAddMode(false) }}
                  placeholder="Name"
                  maxLength={40}
                  className="flex-1 t-input rounded-lg px-2.5 py-1.5 text-[13px] min-w-0"
                  autoFocus
                />
                <input
                  type="number"
                  value={newModeDuration}
                  onChange={(e) => setNewModeDuration(Number(e.target.value))}
                  className="w-14 t-input rounded-lg px-2 py-1.5 text-[13px] text-right shrink-0"
                  min={1}
                  max={240}
                  aria-label="Duration in minutes"
                />
                <button onClick={handleAddMode} className="text-[13px] font-medium px-2.5 py-1.5 rounded-lg shrink-0" style={{ background: '#3b82f6', color: '#fff' }}>Add</button>
                <button onClick={() => setShowAddMode(false)} className="text-[13px] px-1 shrink-0" style={{ color: 'var(--t-fg-dim)' }} aria-label="Cancel">
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
              <Toggle value={settings.focusColoredBackground} onChange={(v) => updateSettings({ focusColoredBackground: v })} label="Colored background" />
            </Row>
            <Row label="Hide cursor after">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0} max={15} step={1}
                  value={settings.hideCursorAfter}
                  onChange={(e) => updateSettings({ hideCursorAfter: Number(e.target.value) })}
                  className="w-24"
                  aria-label="Hide cursor after seconds"
                />
                <span className="text-[11px] font-mono w-8 text-right" style={{ color: 'var(--t-fg-dim)' }}>
                  {settings.hideCursorAfter === 0 ? 'off' : `${settings.hideCursorAfter}s`}
                </span>
              </div>
            </Row>

            <Divider />

            {/* ── Behavior ── */}
            <SectionLabel>Behavior</SectionLabel>
            <Row label="Auto-start sessions">
              <Toggle value={settings.autoStartNextSession} onChange={(v) => updateSettings({ autoStartNextSession: v })} label="Auto-start sessions" />
            </Row>
            <Row label="Auto-start breaks">
              <Toggle value={settings.autoStartBreaks} onChange={(v) => updateSettings({ autoStartBreaks: v })} label="Auto-start breaks" />
            </Row>
            <Row label="Pomodoro 24/7">
              <Toggle value={settings.loopMode} onChange={(v) => updateSettings({ loopMode: v })} label="Loop modes forever" />
            </Row>
            <Row label="Keep screen awake">
              <Toggle value={settings.keepScreenAwake} onChange={(v) => updateSettings({ keepScreenAwake: v })} label="Keep screen awake" />
            </Row>

            <Divider />

            {/* ── Sound & Notifications ── */}
            <SectionLabel>Alerts</SectionLabel>
            <Row label="Sound">
              <div className="flex items-center gap-2.5">
                <FontAwesomeIcon icon={settings.soundEnabled ? faVolumeHigh : faVolumeXmark} size="sm" style={{ color: 'var(--t-fg-dim)' }} />
                <Toggle value={settings.soundEnabled} onChange={(v) => updateSettings({ soundEnabled: v })} label="Sound" />
              </div>
            </Row>
            {settings.soundEnabled && (
              <Row label="Volume">
                <input
                  type="range"
                  min={0} max={1} step={0.05}
                  value={settings.soundVolume}
                  onChange={(e) => updateSettings({ soundVolume: Number(e.target.value) })}
                  className="w-24"
                  aria-label="Alarm volume"
                />
              </Row>
            )}
            <Row label="Notifications">
              <div className="flex items-center gap-2.5">
                <FontAwesomeIcon icon={settings.desktopNotifications ? faBell : faBellSlash} size="sm" style={{ color: 'var(--t-fg-dim)' }} />
                {settings.desktopNotifications ? (
                  <Toggle value onChange={(v) => updateSettings({ desktopNotifications: v })} label="Notifications" />
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

            {/* ── Display ── */}
            <SectionLabel>Display</SectionLabel>
            <Row label="Timer size">
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={60} max={180}
                  value={settings.timerFontSize}
                  onChange={(e) => updateSettings({ timerFontSize: Number(e.target.value) })}
                  className="w-24"
                  aria-label="Timer font size"
                />
                <span className="text-[11px] font-mono w-8 text-right" style={{ color: 'var(--t-fg-dim)' }}>{settings.timerFontSize}</span>
              </div>
            </Row>
            <Row label="Font">
              <select
                value={settings.fontFamily}
                onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                className="t-input rounded-lg px-2 py-1.5 text-[12px]"
                aria-label="Timer font"
              >
                {fontChoices.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Row>
            <Row label="Weight">
              <select
                value={settings.fontWeight}
                onChange={(e) => updateSettings({ fontWeight: Number(e.target.value) })}
                className="t-input rounded-lg px-2 py-1.5 text-[12px]"
                aria-label="Timer font weight"
              >
                {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </Row>
            <Row label="Progress ring">
              <Toggle value={settings.showProgressRing} onChange={(v) => updateSettings({ showProgressRing: v })} label="Progress ring" />
            </Row>

            <Divider />

            {/* ── Shortcuts ── */}
            <SectionLabel>Shortcuts</SectionLabel>
            {settings.keyBindings.map((b) => (
              <ShortcutRow key={b.action} action={b.action} label={b.label} value={b.key} />
            ))}

            <Divider />

            {/* ── Stats ── */}
            <SectionLabel>Stats</SectionLabel>
            <WeekChart />
            <Row label="Today">
              <span className="text-[13px] font-bold" style={{ color: 'var(--t-fg)' }}>
                {todayRecord?.completedSessions || 0} sessions · {fmtHours(todayRecord?.totalFocusMinutes ?? 0)}
              </span>
            </Row>
            <Row label="Total">
              <span className="text-[13px] font-bold" style={{ color: 'var(--t-fg)' }}>{totalSessions} sessions</span>
            </Row>
            <Row label="Focus time">
              <span className="text-[13px] font-bold" style={{ color: 'var(--t-fg)' }}>{fmtHours(totalMinutes)}</span>
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
              {/* Two-step: this wipes every mode, shortcut and preference. */}
              <button
                onClick={() => (confirmReset ? (resetSettings(), setConfirmReset(false)) : setConfirmReset(true))}
                className="text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                {confirmReset ? 'Tap again to confirm' : 'Reset'}
              </button>
            </Row>
            <div className="mb-4" />
          </div>
        </motion.div>
      )}
    </>
  )
}
