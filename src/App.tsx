import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useStore } from './store'
import { useTimer } from './hooks/useTimer'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useCursorHider } from './hooks/useCursorHider'
import { usePiP } from './hooks/usePiP'
import { TimerDisplay } from './components/TimerDisplay'
import { Controls } from './components/Controls'
import { ModeSelector } from './components/ModeSelector'
import { TaskList } from './components/TaskList'
import { SettingsPanel } from './components/SettingsPanel'
import { PiPTimer } from './components/PiPTimer'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClock, faExpand, faGear, faSun, faMoon } from '@fortawesome/free-solid-svg-icons'

function App() {
  useTimer()
  useKeyboardShortcuts()
  useCursorHider()
  const { openPiP, closePiP, isPiP, floating } = usePiP()

  // ─── Draggable PiP ───────────────────────────
  const PIP_W = 220
  const PIP_H = 130
  const [pipPos, setPipPos] = useState<{ x: number; y: number } | null>(null)
  const dragData = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null)

  useEffect(() => {
    if (!floating) setPipPos(null)
  }, [floating])

  const getDefaultPos = () => ({
    x: window.innerWidth - PIP_W - 16,
    y: window.innerHeight - PIP_H - 24,
  })

  const onPipPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const pos = pipPos ?? getDefaultPos()
    dragData.current = { startX: e.clientX, startY: e.clientY, initX: pos.x, initY: pos.y }
  }

  const onPipPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragData.current) return
    const x = Math.max(0, Math.min(window.innerWidth - PIP_W, dragData.current.initX + e.clientX - dragData.current.startX))
    const y = Math.max(0, Math.min(window.innerHeight - PIP_H, dragData.current.initY + e.clientY - dragData.current.startY))
    setPipPos({ x, y })
  }

  const onPipPointerUp = () => { dragData.current = null }

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

  const activeMode = useStore((s) => s.activeMode())
  const activeTask = useMemo(() => tasks.find((t) => t.id === activeTaskId), [tasks, activeTaskId])

  // Focus mode
  const focusColoredBg = useStore((s) => s.settings.focusColoredBackground)
  const timerModes = useStore((s) => s.settings.timerModes)

  // Pick color based on active task type (break/longbreak use different timer mode colors)
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
  const focusFg = focusColoredBg ? 'rgba(255,255,255,0.9)' : 'var(--t-fg)'

  const darkModeWhenRunning = useStore((s) => s.settings.darkModeWhenRunning)

  // Set data-theme on html element + auto dark when running
  useEffect(() => {
    const shouldBeDark = darkMode || (darkModeWhenRunning && timerStatus === 'running')
    document.documentElement.setAttribute('data-theme', shouldBeDark ? 'dark' : 'light')
  }, [darkMode, darkModeWhenRunning, timerStatus])

  // Fullscreen on focus mode
  useEffect(() => {
    if (focusMode) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [focusMode])

  // Document title update
  useEffect(() => {
    if (timerStatus === 'running' || timerStatus === 'paused') {
      const total = Math.ceil(timeRemaining)
      const mins = Math.floor(total / 60)
      const secs = total % 60
      document.title = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} — ${activeMode.name}`
    } else {
      document.title = 'NoDistractFocus'
    }
  }, [timerStatus, timeRemaining, activeMode.name])

  // Task done toast
  const [taskDoneText, setTaskDoneText] = useState<string | null>(null)
  const prevTasksRef = useRef(tasks)
  useEffect(() => {
    const prev = prevTasksRef.current
    prevTasksRef.current = tasks
    for (const t of tasks) {
      const old = prev.find((p) => p.id === t.id)
      if (old && !old.completed && t.completed) {
        setTaskDoneText(t.title)
        const timer = setTimeout(() => setTaskDoneText(null), 2000)
        return () => clearTimeout(timer)
      }
    }
  }, [tasks])

  // Background
  const bgStyle: React.CSSProperties = { backgroundColor: 'var(--t-bg)' }

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
          style={{ fontFamily: `'${fontFamily}', 'Noto Sans Thai', sans-serif`, ['--t-fg' as string]: focusFg }}
          onClick={toggleFocusMode}
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
            className="mt-4 text-xs font-semibold uppercase tracking-widest"
            style={{ color: focusColoredBg ? 'rgba(255,255,255,0.4)' : 'var(--t-fg-dim)' }}
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
          className="min-h-screen flex flex-col transition-colors duration-300"
          style={{ ...bgStyle, fontFamily: `'${fontFamily}', 'Noto Sans Thai', sans-serif` }}
        >
      {/* Top bar - clean like reference */}
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
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: 'var(--t-bg-input)',
              color: 'var(--t-fg-muted)',
              border: '1px solid var(--t-border)',
            }}
          >
            <FontAwesomeIcon icon={darkMode ? faSun : faMoon} />
          </button>

          {/* Picture-in-Picture button */}
          <button
            onClick={openPiP}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: isPiP ? '#3b82f6' : 'var(--t-bg-input)',
              color: isPiP ? '#fff' : 'var(--t-fg-muted)',
              border: `1px solid ${isPiP ? '#3b82f6' : 'var(--t-border)'}`,
            }}
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
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: 'var(--t-bg-input)',
              color: 'var(--t-fg-muted)',
              border: '1px solid var(--t-border)',
            }}
            title="Focus Mode (F)"
          >
            <FontAwesomeIcon icon={faExpand} size="sm" />
          </button>

          {/* Settings button */}
          <button
            id="btn-settings"
            onClick={() => setSettingsOpen(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
            style={{
              background: 'var(--t-bg-input)',
              color: 'var(--t-fg-muted)',
              border: '1px solid var(--t-border)',
            }}
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
        <div className="text-sm" style={{ color: 'var(--t-fg-dim)' }}>
          #{sessionCount}
        </div>

        {/* Active task indicator */}
        <AnimatePresence>
          {activeTask && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm"
              style={{ color: 'var(--t-fg-muted)' }}
            >
              Time to focus!
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
          Press <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px]" style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', color: 'var(--t-fg-muted)' }}>Space</kbd> to start · <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px]" style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', color: 'var(--t-fg-muted)' }}>F</kbd> focus · <kbd className="px-1.5 py-0.5 rounded font-mono text-[10px]" style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', color: 'var(--t-fg-muted)' }}>Ctrl+Space</kbd> settings
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

function TaskDoneToast({ text }: { text: string | null }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3 rounded-2xl shadow-2xl"
          style={{ background: '#22c55e', color: '#fff' }}
        >
          <motion.span
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl"
          >
            🎉
          </motion.span>
          <div>
            <div className="text-sm font-bold">Task Done!</div>
            <div className="text-xs opacity-80">{text}</div>
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
