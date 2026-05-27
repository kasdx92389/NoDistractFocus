import React, { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faPlus, faPlay, faCoffee, faMugHot, faXmark, faChevronUp, faChevronDown } from '@fortawesome/free-solid-svg-icons'

const fmtDur = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return sec > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${m}m`
}

const parseDur = (str: string): number => {
  const clean = str.replace(/[^0-9:]/g, '')
  if (clean.includes(':')) {
    const [m, s] = clean.split(':')
    return Math.max(60, Number(m) * 60 + Number(s || 0))
  }
  return Math.max(60, Number(clean) * 60)
}

export const TaskList = React.memo(function TaskList() {
  const tasks = useStore((s) => s.tasks)
  const addTask = useStore((s) => s.addTask)
  const updateTask = useStore((s) => s.updateTask)
  const deleteTask = useStore((s) => s.deleteTask)
  const activeTaskId = useStore((s) => s.activeTaskId)
  const setActiveTaskId = useStore((s) => s.setActiveTaskId)
  const startTaskQueue = useStore((s) => s.startTaskQueue)
  const clearTasks = useStore((s) => s.clearTasks)
  const timerStatus = useStore((s) => s.timerStatus)
  const setTimeRemaining = useStore((s) => s.setTimeRemaining)

  const [newTitle, setNewTitle] = useState('')
  const [newDur, setNewDur] = useState('25')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [colorPickerId, setColorPickerId] = useState<string | null>(null)
  const [colorPickerPos, setColorPickerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const colorPickerRef = useRef<HTMLDivElement>(null)

  const TASK_COLORS = [
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
    '#ec4899', '#f43f5e', '#6b7280', '#1e293b',
  ]

  useEffect(() => {
    if (!colorPickerId) return
    const handler = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) setColorPickerId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [colorPickerId])

  const handleAdd = () => {
    const title = newTitle.trim() || 'Task'
    addTask(title, 'task', parseDur(newDur))
    setNewTitle('')
    setNewDur('25')
    ;(document.activeElement as HTMLElement)?.blur()
  }

  const saveEdit = (id: string) => {
    if (editText.trim()) updateTask(id, { title: editText.trim() })
    setEditingId(null)
  }

  const incomplete = tasks.filter((t) => !t.completed)
  const totalSecs = incomplete.reduce((a, t) => a + t.duration, 0)
  const totalMin = Math.ceil(totalSecs / 60)
  const isQueueRunning = timerStatus === 'running' && activeTaskId != null

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

      {/* Add task row */}
      <div className="flex gap-2 mb-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            id="task-input"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Task name..."
            className="flex-1 t-input rounded-xl px-4 py-2.5 text-sm"
          />
          <div className="flex items-stretch h-10">
            <input
              type="text"
              value={newDur}
              onChange={(e) => setNewDur(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="min"
              className="w-9 t-input px-1 text-xs text-center"
              style={{ borderRadius: '10px 0 0 10px', borderRight: 'none' }}
            />
            <div className="flex flex-col w-5" style={{ border: '1px solid var(--t-border)', borderLeft: 'none', borderRadius: '0 10px 10px 0', overflow: 'hidden' }}>
              <button
                onClick={() => setNewDur(String((parseInt(newDur) || 0) + 1))}
                className="flex-1 flex items-center justify-center transition-colors"
                style={{ background: 'var(--t-bg-input)', color: 'var(--t-fg-dim)' }}
              >
                <FontAwesomeIcon icon={faChevronUp} style={{ fontSize: 7 }} />
              </button>
              <div style={{ height: 1, background: 'var(--t-border)' }} />
              <button
                onClick={() => setNewDur(String(Math.max(1, (parseInt(newDur) || 0) - 1)))}
                className="flex-1 flex items-center justify-center transition-colors"
                style={{ background: 'var(--t-bg-input)', color: 'var(--t-fg-dim)' }}
              >
                <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 7 }} />
              </button>
            </div>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleAdd}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-1.5"
          style={{ backgroundColor: '#3b82f6' }}
        >
          <FontAwesomeIcon icon={faPlus} size="xs" />
          Add
        </motion.button>
      </div>

      {/* Quick-add breaks — full width matching above row */}
      <div className={`flex gap-2 ${incomplete.length > 0 || tasks.length > 0 ? 'mb-3' : ''}`}>
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
          className="w-full mb-4 py-2.5 rounded-xl text-white flex items-center justify-center"
          style={{ background: '#3b82f6' }}
        >
          <FontAwesomeIcon icon={faPlay} size="xs" />
        </motion.button>
      )}

      {/* Task list */}
      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
        <AnimatePresence>
          {tasks.map((task, idx) => {
            const isActive = activeTaskId === task.id
            const isBreak = task.type === 'break' || task.type === 'longbreak'

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                className="group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
                style={{
                  background: isActive ? 'var(--t-bg-hover)' : 'var(--t-bg-input)',
                  border: isActive ? `2px solid ${task.color || '#3b82f6'}` : '2px solid transparent',
                  opacity: task.completed ? 0.45 : 1,
                }}
                onClick={() => {
                  if (task.completed) {
                    updateTask(task.id, { completed: false })
                    setActiveTaskId(task.id)
                    setTimeRemaining(task.duration)
                  } else {
                    setActiveTaskId(isActive ? null : task.id)
                  }
                }}
              >
                {/* Step number / check + color picker */}
                <div className="relative flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateTask(task.id, { completed: !task.completed })
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (!isBreak) {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setColorPickerPos({ x: rect.left, y: rect.bottom + 6 })
                        setColorPickerId(colorPickerId === task.id ? null : task.id)
                      }
                    }}
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold transition-all"
                    style={{
                      background: task.completed ? '#22c55e' : isBreak ? 'var(--t-bg-hover)' : (task.color || '#3b82f6'),
                      color: task.completed || !isBreak ? '#fff' : 'var(--t-fg-dim)',
                    }}
                  >
                    {task.completed ? <FontAwesomeIcon icon={faCheck} style={{ fontSize: 10 }} /> : idx + 1}
                  </button>
                </div>

                {/* Break icon */}
                {isBreak && (
                  <FontAwesomeIcon
                    icon={task.type === 'longbreak' ? faMugHot : faCoffee}
                    style={{ color: 'var(--t-fg-muted)', fontSize: 12 }}
                  />
                )}

                {/* Title */}
                {editingId === task.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => saveEdit(task.id)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(task.id)}
                    className="flex-1 bg-transparent text-[13px] py-0.5 focus:outline-none"
                    style={{ color: 'var(--t-fg)', borderBottom: '1px solid var(--t-border)' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className={`flex-1 text-[13px] ${isBreak ? '' : 'font-medium'}`}
                    style={{
                      color: isBreak ? 'var(--t-fg-muted)' : 'var(--t-fg)',
                      textDecoration: task.completed ? 'line-through' : 'none',
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      setEditingId(task.id)
                      setEditText(task.title)
                    }}
                  >
                    {task.title}
                  </span>
                )}

                {/* Duration & Delete */}
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[12px] font-medium" style={{ color: 'var(--t-fg-dim)' }}>
                    {fmtDur(task.duration)}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTask(task.id) }}
                    className="opacity-50 hover:opacity-100 transition-opacity flex items-center"
                    style={{ color: 'var(--t-fg-dim)', height: 16 }}
                  >
                    <FontAwesomeIcon icon={faXmark} style={{ fontSize: 12, verticalAlign: 'middle' }} />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Clear all */}
      {tasks.length > 0 && (
        <button
          onClick={clearTasks}
          className="mt-3 w-full py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          style={{ color: 'var(--t-fg-dim)' }}
        >
          <FontAwesomeIcon icon={faXmark} size="xs" /> Clear all
        </button>
      )}

      {/* Color picker (fixed, outside scroll) */}
      {colorPickerId && (() => {
        const task = tasks.find((t) => t.id === colorPickerId)
        if (!task || task.type !== 'task') return null
        return (
          <div
            ref={colorPickerRef}
            className="fixed z-50 p-2 rounded-xl shadow-lg grid grid-cols-4 gap-1.5"
            style={{ background: 'var(--t-bg-card)', border: '1px solid var(--t-border)', width: 130, left: colorPickerPos.x, top: colorPickerPos.y }}
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
              />
            ))}
          </div>
        )
      })()}
    </div>
  )
})
