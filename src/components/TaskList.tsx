import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '../store'
import type { Task } from '../types'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheck, faPlus, faPlay, faCoffee, faMugHot, faXmark, faKeyboard,
  faChevronUp, faChevronDown,
} from '@fortawesome/free-solid-svg-icons'

const MAX_DURATION = 24 * 60 * 60 // a task longer than a day is a typo

const fmtDur = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return sec > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${m}m`
}

/** "25" -> 1500s, "1:30" -> 90s. Clamped to [1 minute, 24 hours]. */
const parseDur = (str: string): number => {
  const clean = str.replace(/[^0-9:]/g, '')
  const raw = clean.includes(':')
    ? (Number(clean.split(':')[0]) || 0) * 60 + (Number(clean.split(':')[1]) || 0)
    : (Number(clean) || 0) * 60
  return Math.min(MAX_DURATION, Math.max(60, raw))
}

const TASK_COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#ec4899', '#f43f5e', '#6b7280', '#1e293b',
]

export const TaskList = React.memo(function TaskList() {
  const tasks = useStore((s) => s.tasks)
  const addTask = useStore((s) => s.addTask)
  const updateTask = useStore((s) => s.updateTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const reorderTasks = useStore((s) => s.reorderTasks)
  const activeTaskId = useStore((s) => s.activeTaskId)
  const startTaskQueue = useStore((s) => s.startTaskQueue)
  const startTaskAt = useStore((s) => s.startTaskAt)
  const clearTasks = useStore((s) => s.clearTasks)
  const timerStatus = useStore((s) => s.timerStatus)

  const [newTitle, setNewTitle] = useState('')
  const [newDur, setNewDur] = useState('25')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [colorPickerId, setColorPickerId] = useState<string | null>(null)
  const [colorPickerPos, setColorPickerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [confirmClear, setConfirmClear] = useState(false)
  // Keyboard navigation: index into the full tasks array
  const [kbIndex, setKbIndex] = useState<number | null>(null)
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const editFormRef = useRef<HTMLDivElement>(null)
  const taskListRef = useRef<HTMLDivElement>(null)
  // Long-press → open color picker on touch (no right-click on mobile)
  const longPressTimer = useRef<number | null>(null)
  const longPressFired = useRef(false)
  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }

  useEffect(() => {
    if (!colorPickerId) return
    const handler = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) setColorPickerId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [colorPickerId])

  // Cancel edit when clicking anywhere outside the form or a task row
  useEffect(() => {
    if (!editingTaskId) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (editFormRef.current?.contains(target)) return
      if ((target as HTMLElement).closest?.('[data-interactive="task"]')) return
      handleCancelEdit()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [editingTaskId])

  // "Clear all" is destructive and the confirm shouldn't linger forever.
  useEffect(() => {
    if (!confirmClear) return
    const t = setTimeout(() => setConfirmClear(false), 4000)
    return () => clearTimeout(t)
  }, [confirmClear])

  const handleAdd = () => {
    const title = newTitle.trim() || 'Task'
    if (editingTaskId) {
      updateTask(editingTaskId, { title, duration: parseDur(newDur) })
      setEditingTaskId(null)
    } else {
      addTask(title, 'task', parseDur(newDur))
    }
    setNewTitle('')
    setNewDur('25')
    ;(document.activeElement as HTMLElement)?.blur()
  }

  const handleTaskClick = (task: Task) => {
    setNewTitle(task.title)
    setNewDur(String(Math.floor(task.duration / 60)))
    setEditingTaskId(task.id)
    setTimeout(() => document.getElementById('task-input')?.focus(), 0)
  }

  const handleCancelEdit = () => {
    setEditingTaskId(null)
    setNewTitle('')
    setNewDur('25')
  }

  const incomplete = tasks.filter((t) => !t.completed)
  const totalMin = Math.ceil(incomplete.reduce((a, t) => a + t.duration, 0) / 60)
  const isQueueRunning = timerStatus === 'running' && activeTaskId != null

  // ── Keyboard navigation ────────────────────────────────────────────────
  const handleKeyNav = useCallback((e: KeyboardEvent) => {
    const el = e.target as HTMLElement
    if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable) return
    if (e.ctrlKey || e.metaKey || e.altKey) return

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // Only capture the arrows once this list is the thing being navigated,
      // otherwise the page can never be scrolled with the keyboard.
      if (tasks.length === 0) return
      if (kbIndex === null && !e.shiftKey) return
      e.preventDefault()
      setKbIndex((prev) => {
        if (prev === null) return e.key === 'ArrowDown' ? 0 : tasks.length - 1
        return e.key === 'ArrowDown'
          ? Math.min(prev + 1, tasks.length - 1)
          : Math.max(prev - 1, 0)
      })
      return
    }

    if (e.key === 'Enter' && kbIndex !== null) {
      e.preventDefault()
      startTaskAt(kbIndex)
      setKbIndex(null)
      return
    }

    if (e.key === 'Escape' && kbIndex !== null) setKbIndex(null)
  }, [tasks.length, kbIndex, startTaskAt])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyNav)
    return () => window.removeEventListener('keydown', handleKeyNav)
  }, [handleKeyNav])

  // Keep the highlighted task in view
  useEffect(() => {
    if (kbIndex === null || !taskListRef.current) return
    const rows = taskListRef.current.querySelectorAll('[data-interactive="task"]')
    ;(rows[kbIndex] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [kbIndex])

  return (
    <div
      id="task-list"
      className="w-full max-w-lg mx-auto px-5 py-4 rounded-2xl"
      style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)' }}
    >
      {/* Summary */}
      {incomplete.length > 0 && (
        <div className="flex justify-end mb-3">
          <span className="text-xs" style={{ color: 'var(--t-fg-dim)' }}>
            {incomplete.length} items · {totalMin} min
          </span>
        </div>
      )}

      {/* Add / edit task row */}
      <div ref={editFormRef} className="flex gap-2 mb-2" data-interactive="form">
        <input
          type="text"
          id="task-input"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd()
            if (e.key === 'Escape' && editingTaskId) handleCancelEdit()
          }}
          placeholder="Add a task…"
          aria-label="Task name"
          maxLength={120}
          className="flex-1 t-input rounded-xl px-4 py-2.5 text-sm min-w-0"
        />
        <input
          type="text"
          value={newDur}
          onChange={(e) => setNewDur(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          onFocus={(e) => e.target.select()}
          placeholder="min"
          aria-label="Duration in minutes"
          // Numeric soft keyboard on mobile, but still accepts "25:30".
          inputMode="numeric"
          className="w-16 t-input px-2 text-sm text-center shrink-0"
          style={{ borderRadius: '10px' }}
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleAdd}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-1.5 shrink-0"
          style={{ backgroundColor: '#3b82f6' }}
        >
          <FontAwesomeIcon icon={faPlus} size="xs" />
          {editingTaskId ? 'Save' : 'Add'}
        </motion.button>
      </div>

      {/* Quick-add breaks */}
      <div className={`flex gap-2 ${tasks.length > 0 ? 'mb-3' : ''}`}>
        <button
          onClick={() => { addTask('Break', 'break', parseDur(newDur || '5')); setNewDur('25') }}
          className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          style={{ background: 'var(--t-bg-input)', color: 'var(--t-fg-muted)', border: '1px solid var(--t-border)' }}
        >
          <FontAwesomeIcon icon={faCoffee} size="xs" /> Break {newDur || '5'}m
        </button>
        <button
          onClick={() => { addTask('Long Break', 'longbreak', parseDur(newDur || '20')); setNewDur('25') }}
          className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          style={{ background: 'var(--t-bg-input)', color: 'var(--t-fg-muted)', border: '1px solid var(--t-border)' }}
        >
          <FontAwesomeIcon icon={faMugHot} size="xs" /> Long Break {newDur || '20'}m
        </button>
      </div>

      {/* Run button */}
      {incomplete.length > 0 && !isQueueRunning && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.97 }}
          onClick={startTaskQueue}
          className="w-full mb-4 py-2.5 rounded-xl text-white flex items-center justify-center gap-2 text-sm font-medium"
          style={{ background: '#3b82f6' }}
          aria-label="Run task queue"
        >
          <FontAwesomeIcon icon={faPlay} size="xs" />
        </motion.button>
      )}

      {/* Keyboard hint */}
      {tasks.length > 0 && kbIndex === null && !isQueueRunning && (
        <div className="flex items-center justify-center gap-1.5 mb-2 py-1 rounded-lg text-[10px]" style={{ color: 'var(--t-fg-dim)', opacity: 0.55 }}>
          <FontAwesomeIcon icon={faKeyboard} style={{ fontSize: 9 }} />
          <span>Shift + ↑↓ เลือก · Enter เริ่ม</span>
        </div>
      )}
      {kbIndex !== null && (
        <div className="flex items-center justify-center gap-1.5 mb-2 py-1.5 rounded-lg text-[11px] font-medium" style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <span>↑↓ เลื่อน · Enter เริ่มจาก task นี้ · Esc ยกเลิก</span>
        </div>
      )}

      {/* Task list */}
      <div ref={taskListRef} className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: '22rem' }}>
        <AnimatePresence initial={false}>
          {tasks.map((task, idx) => {
            const isActive = activeTaskId === task.id
            const isBreak = task.type !== 'task'

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: task.completed ? 0.45 : 1, y: 0 }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                // Tween, not the default spring: a spring overshoots past its
                // target and the bottom row briefly pokes out of the scroll
                // container, flashing a scrollbar.
                transition={{ type: 'tween', duration: 0.18 }}
                className="group flex items-center gap-2.5 px-3 py-3 rounded-xl cursor-pointer transition-colors"
                data-interactive="task"
                style={{
                  background: isActive ? 'var(--t-bg-hover)' : 'var(--t-bg-input)',
                  border: kbIndex === idx
                    ? '2px solid #f59e0b'
                    : isActive
                    ? `2px solid ${task.color || '#3b82f6'}`
                    : '2px solid transparent',
                  boxShadow: kbIndex === idx ? '0 0 0 3px rgba(245,158,11,0.15)' : undefined,
                }}
                onClick={(e) => { e.stopPropagation(); handleTaskClick(task) }}
              >
                {/* Step number / completion toggle (long-press or right-click = color) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // Swallow the click that ends a long-press so it doesn't also toggle.
                    if (longPressFired.current) { longPressFired.current = false; return }
                    updateTask(task.id, { completed: !task.completed })
                  }}
                  onPointerDown={(e) => {
                    if (isBreak) return
                    longPressFired.current = false
                    const rect = e.currentTarget.getBoundingClientRect()
                    longPressTimer.current = window.setTimeout(() => {
                      longPressFired.current = true
                      setColorPickerPos({ x: rect.left, y: rect.bottom + 6 })
                      setColorPickerId((cur) => (cur === task.id ? null : task.id))
                    }, 450)
                  }}
                  onPointerUp={cancelLongPress}
                  onPointerLeave={cancelLongPress}
                  onPointerCancel={cancelLongPress}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (isBreak) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    setColorPickerPos({ x: rect.left, y: rect.bottom + 6 })
                    setColorPickerId(colorPickerId === task.id ? null : task.id)
                  }}
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold transition-all"
                  style={{
                    background: task.completed ? '#22c55e' : isBreak ? 'var(--t-bg-hover)' : (task.color || '#3b82f6'),
                    color: task.completed || !isBreak ? '#fff' : 'var(--t-fg-dim)',
                  }}
                  aria-label={task.completed ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
                  aria-pressed={task.completed}
                >
                  {task.completed ? <FontAwesomeIcon icon={faCheck} style={{ fontSize: 10 }} /> : idx + 1}
                </button>

                {/* Break icon */}
                {isBreak && (
                  <FontAwesomeIcon
                    icon={task.type === 'longbreak' ? faMugHot : faCoffee}
                    style={{ color: 'var(--t-fg-muted)', fontSize: 12 }}
                  />
                )}

                {/* Title */}
                <span
                  className={`flex-1 text-[13px] min-w-0 truncate ${isBreak ? '' : 'font-medium'}`}
                  style={{
                    color: isBreak ? 'var(--t-fg-muted)' : 'var(--t-fg)',
                    textDecoration: task.completed ? 'line-through' : 'none',
                  }}
                >
                  {task.title}
                </span>

                {/* Reorder — tasks run in list order, and phones have no drag affordance. */}
                <div className="flex flex-col shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => reorderTasks(idx, idx - 1)}
                    disabled={idx === 0}
                    className="h-3.5 px-1 flex items-center disabled:opacity-20"
                    style={{ color: 'var(--t-fg-dim)' }}
                    aria-label={`Move "${task.title}" up`}
                  >
                    <FontAwesomeIcon icon={faChevronUp} style={{ fontSize: 8 }} />
                  </button>
                  <button
                    onClick={() => reorderTasks(idx, idx + 1)}
                    disabled={idx === tasks.length - 1}
                    className="h-3.5 px-1 flex items-center disabled:opacity-20"
                    style={{ color: 'var(--t-fg-dim)' }}
                    aria-label={`Move "${task.title}" down`}
                  >
                    <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 8 }} />
                  </button>
                </div>

                {/* Duration & delete */}
                <span className="text-[12px] font-medium shrink-0" style={{ color: 'var(--t-fg-dim)' }}>
                  {fmtDur(task.duration)}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTask(task.id) }}
                  className="opacity-50 hover:opacity-100 transition-opacity flex items-center shrink-0 px-1"
                  style={{ color: 'var(--t-fg-dim)' }}
                  aria-label={`Delete "${task.title}"`}
                >
                  <FontAwesomeIcon icon={faXmark} style={{ fontSize: 12 }} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Clear all — two-step, it wipes the whole queue */}
      {tasks.length > 0 && (
        <button
          onClick={() => (confirmClear ? (clearTasks(), setConfirmClear(false)) : setConfirmClear(true))}
          className="mt-3 w-full py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          style={confirmClear
            ? { color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }
            : { color: 'var(--t-fg-dim)' }}
        >
          <FontAwesomeIcon icon={faXmark} size="xs" />
          {confirmClear ? `Delete all ${tasks.length} tasks?` : 'Clear all'}
        </button>
      )}

      {/* Color picker (fixed, outside the scroll container) */}
      {colorPickerId && (() => {
        const task = tasks.find((t) => t.id === colorPickerId)
        if (!task || task.type !== 'task') return null
        return (
          <div
            ref={colorPickerRef}
            className="fixed z-50 p-2 rounded-xl shadow-lg grid grid-cols-4 gap-1.5"
            style={{
              background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', width: 130,
              // Keep the popover on screen when the row sits near the right edge.
              left: Math.min(colorPickerPos.x, window.innerWidth - 138),
              top: Math.min(colorPickerPos.y, window.innerHeight - 130),
            }}
          >
            {TASK_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => { updateTask(colorPickerId, { color: c }); setColorPickerId(null) }}
                className="w-6 h-6 rounded-md transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  outline: c === (task.color || '#3b82f6') ? '2px solid var(--t-fg)' : 'none',
                  outlineOffset: 1,
                }}
                aria-label={`Set color ${c}`}
              />
            ))}
          </div>
        )
      })()}
    </div>
  )
})
