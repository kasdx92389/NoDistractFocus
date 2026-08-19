import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useStore } from './store'
import { useTimer } from './hooks/useTimer'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useCursorHider } from './hooks/useCursorHider'
import { useWakeLock } from './hooks/useWakeLock'
import { usePiP } from './hooks/usePiP'
import { TimerDisplay } from './components/TimerDisplay'
import { Controls } from './components/Controls'
import { ModeSelector } from './components/ModeSelector'
import { TaskList } from './components/TaskList'
import { SettingsPanel } from './components/SettingsPanel'
import { PiPTimer } from './components/PiPTimer'
import { fmtClock, readableOn, unlockAudio } from './util'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faExpand, faGear, faSun, faMoon } from '@fortawesome/free-solid-svg-icons'

const PIP_W = 220
const PIP_H = 130

function App() {
  useTimer()
  useKeyboardShortcuts()
  useCursorHider()
  const { openPiP, closePiP, isPiP, floating } = usePiP()

  // Use granular selectors to minimize re-renders
  const darkMode = useStore((s) => s.settings.darkMode)
  const fontFamily = useStore((s) => s.settings.fontFamily)
  const focusMode = useStore((s) => s.focusMode)
  const toggleFocusMode = useStore((s) => s.toggleFocusMode)
  const toggleDarkMode = useStore((s) => s.toggleDarkMode)
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)
  const timerStatus = useStore((s) => s.timerStatus)
  const timeRemaining = useStore((s) => s.timeRemaining)
  const sessionCount = useStore((s) => s.sessionCount)
  const activeTaskId = useStore((s) => s.activeTaskId)
  const tasks = useStore((s) => s.tasks)
  const keepScreenAwake = useStore((s) => s.settings.keepScreenAwake)
  const focusColoredBg = useStore((s) => s.settings.focusColoredBackground)
  const timerModes = useStore((s) => s.settings.timerModes)
  const darkModeWhenRunning = useStore((s) => s.settings.darkModeWhenRunning)

  const activeMode = useStore((s) => s.activeMode())
  const activeTask = useMemo(() => tasks.find((t) => t.id === activeTaskId), [tasks, activeTaskId])

  // A phone that dims and locks mid-session defeats the point of the timer.
  useWakeLock(keepScreenAwake && timerStatus === 'running')

  // Web Audio starts suspended until a real gesture; arm it on the first one so
  // the end-of-session chime isn't silently dropped on mobile.
  useEffect(() => {
    const arm = () => unlockAudio()
    window.addEventListener('pointerdown', arm, { once: true })
    window.addEventListener('keydown', arm, { once: true })
    return () => {
      window.removeEventListener('pointerdown', arm)
      window.removeEventListener('keydown', arm)
    }
  }, [])

  // ─── Draggable PiP ───────────────────────────
  const [pipPos, setPipPos] = useState<{ x: number; y: number } | null>(null)
  const dragData = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null)

  useEffect(() => {
    if (!floating) setPipPos(null)
  }, [floating])

  const clampPip = useCallback((x: number, y: number) => ({
    x: Math.max(0, Math.min(window.innerWidth - PIP_W, x)),
    y: Math.max(0, Math.min(window.innerHeight - PIP_H, y)),
  }), [])

  // Rotating a phone or resizing a window can strand the widget off-screen.
  useEffect(() => {
    if (!floating) return
    const onResize = () => setPipPos((p) => (p ? clampPip(p.x, p.y) : p))
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [floating, clampPip])

  const onPipPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const pos = pipPos ?? { x: window.innerWidth - PIP_W - 16, y: window.innerHeight - PIP_H - 24 }
    dragData.current = { startX: e.clientX, startY: e.clientY, initX: pos.x, initY: pos.y }
  }

  const onPipPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragData.current
    if (!d) return
    setPipPos(clampPip(d.initX + e.clientX - d.startX, d.initY + e.clientY - d.startY))
  }

  const onPipPointerUp = () => { dragData.current = null }

  // Pick color based on active task type (break/longbreak use their timer mode colors)
  const resolvedColor = useMemo(() => {
    if (activeTask) {
      if (activeTask.type === 'break') {
        const breakMode = timerModes.find((m) => m.name.toLowerCase().includes('short') || (m.name.toLowerCase().includes('break') && !m.name.toLowerCase().includes('long')))
        if (breakMode) return breakMode.color
      }
      if (activeTask.type === 'longbreak') {
        const longMode = timerModes.find((m) => m.name.toLowerCase().includes('long'))
        if (longMode) return longMode.color
      }
      if (activeTask.type === 'task' && activeTask.color) return activeTask.color
    }
    return activeMode.color
  }, [activeTask, activeMode.color, timerModes])

  const focusColor = focusColoredBg ? resolvedColor : (darkMode ? '#0a0b10' : '#f0f2f5')
  // White on a light mode colour (amber, yellow) is unreadable — derive it.
  const focusFg = focusColoredBg ? readableOn(resolvedColor) : null
  const focusFgDim = focusFg
    ? (focusFg === '#ffffff' ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)')
    : 'var(--t-fg-dim)'
  // Only override the token when there is a real colour to override it with:
  // `--t-fg: var(--t-fg)` is self-referential, which CSS discards entirely.
  const focusStyle: React.CSSProperties = {
    fontFamily: `'${fontFamily}', 'Noto Sans Thai', sans-serif`,
    ...(focusFg ? { ['--t-fg' as string]: focusFg } : {}),
  }

  // Set data-theme on html element + auto dark when running
  useEffect(() => {
    const shouldBeDark = darkMode || (darkModeWhenRunning && timerStatus === 'running')
    document.documentElement.setAttribute('data-theme', shouldBeDark ? 'dark' : 'light')
    // Keep the mobile browser/PWA chrome in step with the page.
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', focusMode ? focusColor : (shouldBeDark ? '#0f1117' : '#f0f2f5'))
  }, [darkMode, darkModeWhenRunning, timerStatus, focusMode, focusColor])

  // Fullscreen on focus mode
  useEffect(() => {
    if (focusMode) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [focusMode])

  // Leaving fullscreen by any other route (Esc, browser UI) must leave focus mode too.
  useEffect(() => {
    const onChange = () => {
      const inFocus = useStore.getState().focusMode
      if (!document.fullscreenElement && inFocus) {
        useStore.getState().toggleFocusMode()
      } else if (document.fullscreenElement && !inFocus) {
        // Focus mode was toggled off before the async request resolved; without
        // this the page stays fullscreen with no way back out.
        document.exitFullscreen?.().catch(() => {})
      }
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Document title — recomputed only when the displayed second changes, not on
  // every 250ms tick.
  const clock = fmtClock(timeRemaining)
  useEffect(() => {
    document.title = timerStatus === 'idle'
      ? 'NoDistractFocus'
      : `${clock} — ${activeTask ? activeTask.title : activeMode.name}`
  }, [timerStatus, clock, activeMode.name, activeTask])

  // Task done toast
  const [taskDoneText, setTaskDoneText] = useState<string | null>(null)
  const prevTasksRef = useRef(tasks)
  useEffect(() => {
    const prev = prevTasksRef.current
    prevTasksRef.current = tasks
    const justDone = tasks.find((t) => {
      const old = prev.find((p) => p.id === t.id)
      return old && !old.completed && t.completed
    })
    if (!justDone) return
    setTaskDoneText(justDone.title)
    const timer = setTimeout(() => setTaskDoneText(null), 2000)
    return () => clearTimeout(timer)
  }, [tasks])

  const iconBtn = 'w-10 h-10 rounded-xl flex items-center justify-center transition-all'
  const iconBtnStyle: React.CSSProperties = {
    background: 'var(--t-bg-input)',
    color: 'var(--t-fg-muted)',
    border: '1px solid var(--t-border)',
  }

  // ─── Render ──────────────────────────────────
  return (<>
    <AnimatePresence mode="wait">
      {focusMode ? (
        <motion.div
          key="focus"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, backgroundColor: focusColor }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut', backgroundColor: { duration: 0.6 } }}
          className="fixed inset-0 flex flex-col items-center justify-center cursor-pointer overflow-hidden"
          style={focusStyle}
          onClick={toggleFocusMode}
          role="button"
          tabIndex={0}
          aria-label="Exit focus mode"
          onKeyDown={(e) => { if (e.key === 'Enter') toggleFocusMode() }}
        >
          {/* Animated glow ring behind timer (only with colored bg) */}
          {focusColoredBg && (
            <motion.div
              key={activeMode.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.12 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute rounded-full"
              style={{
                width: 500, height: 500,
                background: `radial-gradient(circle, ${focusColor} 0%, transparent 70%)`,
              }}
            />
          )}

          {/* Timer */}
          <div className="relative z-10">
            <TimerDisplay />
          </div>

          {/* Session + mode/task label below timer */}
          <motion.div
            key={`label-${activeMode.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="mt-4 text-xs font-semibold uppercase tracking-widest text-center px-6"
            style={{ color: focusFgDim }}
          >
            #{sessionCount} {activeTask ? activeTask.title : activeMode.name}
          </motion.div>

          {/* Task Done Toast */}
          <TaskDoneToast text={taskDoneText} />
        </motion.div>
      ) : (
        <motion.div
          key="normal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="app-shell flex flex-col transition-colors duration-300"
          style={{ backgroundColor: 'var(--t-bg)', fontFamily: `'${fontFamily}', 'Noto Sans Thai', sans-serif` }}
        >
      {/* Top bar */}
      <header
        className="flex items-center justify-between gap-2 px-3 sm:px-6 py-3"
        style={{ background: 'var(--t-bg-card)', borderBottom: '1px solid var(--t-border)' }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
            style={{ background: '#3b82f6' }}
          >
            <FontAwesomeIcon icon={faClock} size="sm" />
          </div>
          <h1 className="text-base font-bold truncate" style={{ color: 'var(--t-fg)' }}>
            NoDistractFocus
          </h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggleDarkMode}
            className={iconBtn}
            style={iconBtnStyle}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            <FontAwesomeIcon icon={darkMode ? faSun : faMoon} />
          </button>

          {/* Picture-in-Picture button */}
          <button
            onClick={openPiP}
            className={iconBtn}
            style={{
              ...iconBtnStyle,
              background: isPiP ? '#3b82f6' : 'var(--t-bg-input)',
              color: isPiP ? '#fff' : 'var(--t-fg-muted)',
              borderColor: isPiP ? '#3b82f6' : 'var(--t-border)',
            }}
            aria-label="Picture in Picture"
            aria-pressed={isPiP}
            title="Picture in Picture"
          >
            <svg viewBox="0 0 24 18" width="17" height="13" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="22" height="16" rx="2.5" stroke="currentColor" strokeWidth="2"/>
              <rect x="12" y="8" width="8" height="6" rx="1" fill="currentColor"/>
            </svg>
          </button>

          {/* Focus mode button */}
          <button
            id="btn-focus"
            onClick={toggleFocusMode}
            className={iconBtn}
            style={iconBtnStyle}
            aria-label="Enter focus mode"
            title="Focus Mode (F)"
          >
            <FontAwesomeIcon icon={faExpand} size="sm" />
          </button>

          {/* Settings button */}
          <button
            id="btn-settings"
            onClick={() => setSettingsOpen(true)}
            className={iconBtn}
            style={iconBtnStyle}
            aria-label="Open settings"
            title="Settings (Ctrl+Space)"
          >
            <FontAwesomeIcon icon={faGear} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-4 pb-8 pt-6">
        <ModeSelector />
        <TimerDisplay />
        <Controls />

        {/* Session counter */}
        <div className="text-sm" style={{ color: 'var(--t-fg-dim)' }} title="Completed sessions">
          #{sessionCount}
        </div>

        {/* Active task indicator */}
        <AnimatePresence>
          {activeTask && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm text-center px-4"
              style={{ color: 'var(--t-fg-muted)' }}
            >
              {activeTask.type === 'task' ? 'Time to focus!' : 'Take a break'} · {activeTask.title}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Task list */}
        <div className="w-full max-w-lg">
          <TaskList />
        </div>
      </main>

      {/* Footer hint */}
      <footer className="text-center py-4 pip-footer-hide" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <p className="text-xs mb-2" style={{ color: 'var(--t-fg-dim)' }}>
          Press <Kbd>Space</Kbd> to start · <Kbd>F</Kbd> focus · <Kbd>Ctrl+Space</Kbd> settings
        </p>
        <p className="text-[10px]" style={{ color: 'var(--t-fg-faint)' }}>
          Powered by <span className="font-medium">draftDotDev</span>
        </p>
      </footer>

      {/* Settings Panel */}
      <SettingsPanel />

      {/* Task Done Toast */}
      <TaskDoneToast text={taskDoneText} />
        </motion.div>
      )}
    </AnimatePresence>

    {/* Floating PiP — rendered outside AnimatePresence so it persists in all modes */}
    {floating && (
      <div
        className="pip-widget"
        onPointerDown={onPipPointerDown}
        onPointerMove={onPipPointerMove}
        onPointerUp={onPipPointerUp}
        onPointerCancel={onPipPointerUp}
        style={{
          position: 'fixed',
          ...(pipPos
            ? { left: pipPos.x, top: pipPos.y }
            : { right: 16, bottom: 'max(24px, env(safe-area-inset-bottom))' }),
          width: PIP_W,
          height: PIP_H,
          zIndex: 9999,
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          border: '1px solid var(--t-border)',
          overflow: 'hidden',
          cursor: 'grab',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <PiPTimer onClose={closePiP} />
      </div>
    )}
  </>)
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="px-1.5 py-0.5 rounded font-mono text-[10px]"
      style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', color: 'var(--t-fg-muted)' }}
    >
      {children}
    </kbd>
  )
}

function TaskDoneToast({ text }: { text: string | null }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 40, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl"
          style={{ background: '#22c55e', color: '#fff', bottom: 'max(2rem, env(safe-area-inset-bottom))' }}
        >
          <motion.span
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl"
          >
            🎉
          </motion.span>
          <div className="min-w-0">
            <div className="text-sm font-bold">Task Done!</div>
            <div className="text-xs opacity-80 truncate max-w-[12rem]">{text}</div>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
            className="text-lg"
          >
            ✓
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default App
