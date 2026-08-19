import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import type { AppSettings, Task, TaskType, SessionRecord, TimerStatus, TimerMode } from './types'
import { defaultSettings, defaultKeyBindings } from './defaults'
import { todayKey } from './util'

// ─── Helpers ─────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

// A running timer is defined by an absolute deadline, not by accumulated ticks.
// Background tabs throttle intervals and a locked phone stops them entirely, so
// anything derived from tick deltas silently loses time.
const deadline = (seconds: number) => Date.now() + seconds * 1000

/**
 * localStorage writer that coalesces bursts.
 * The ticker updates `timeRemaining` 4x/second; without this, every tick
 * serialised the whole store (settings + tasks + sessions) to disk.
 */
function coalescingStorage(delayMs: number): StateStorage {
  let pending: { key: string; value: string } | null = null
  let handle: ReturnType<typeof setTimeout> | undefined

  const flush = () => {
    clearTimeout(handle)
    handle = undefined
    if (!pending) return
    try { localStorage.setItem(pending.key, pending.value) } catch { /* quota / private mode */ }
    pending = null
  }

  if (typeof window !== 'undefined') {
    // Never lose the last write when the tab is backgrounded or closed.
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush() })
  }

  return {
    getItem: (key) => { try { return localStorage.getItem(key) } catch { return null } },
    setItem: (key, value) => {
      pending = { key, value }
      if (handle === undefined) handle = setTimeout(flush, delayMs)
    },
    removeItem: (key) => { pending = null; try { localStorage.removeItem(key) } catch { /* ignore */ } },
  }
}

// ─── Store Shape ─────────────────────────────────
interface AppStore {
  // Settings
  settings: AppSettings
  updateSettings: (partial: Partial<AppSettings>) => void
  resetSettings: () => void

  // Timer runtime state
  timerStatus: TimerStatus
  timeRemaining: number
  /** Epoch ms the current run ends at. Only meaningful while running. */
  endAt: number
  sessionCount: number
  setTimerStatus: (s: TimerStatus) => void
  setTimeRemaining: (t: number) => void
  incrementSession: () => void
  resetTimer: () => void
  skipToNext: () => void

  // Focus mode
  focusMode: boolean
  toggleFocusMode: () => void

  // Settings panel open
  settingsOpen: boolean
  setSettingsOpen: (v: boolean) => void

  // Tasks
  tasks: Task[]
  addTask: (title: string, type: TaskType, duration: number) => void
  updateTask: (id: string, partial: Partial<Task>) => void
  deleteTask: (id: string) => void
  clearTasks: () => void
  reorderTasks: (from: number, to: number) => void
  activeTaskId: string | null
  setActiveTaskId: (id: string | null) => void
  advanceToNextTask: () => void
  skipActiveTask: () => void
  startTaskQueue: () => void
  startTaskAt: (index: number) => void

  // Session tracking
  sessions: SessionRecord[]
  addSessionRecord: (opts: { minutes: number; modeId: string; isBreak: boolean }) => void
  resetStats: () => void

  // Timer modes management
  addTimerMode: (mode: Omit<TimerMode, 'id'>) => void
  updateTimerMode: (id: string, partial: Partial<TimerMode>) => void
  deleteTimerMode: (id: string) => void
  setActiveModeIndex: (i: number) => void

  // Key bindings
  updateKeyBinding: (action: string, key: string) => void

  // Theme toggle
  toggleDarkMode: () => void

  // Current active mode helper
  activeMode: () => TimerMode
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ─── Settings ──────────────────────────
      settings: { ...defaultSettings },
      updateSettings: (partial) =>
        set((s) => ({ settings: { ...s.settings, ...partial } })),
      resetSettings: () => set({
        settings: { ...defaultSettings },
        timeRemaining: defaultSettings.timerModes[0].duration,
        timerStatus: 'idle' as TimerStatus,
        endAt: 0,
        activeTaskId: null,
      }),

      // ─── Timer State ───────────────────────
      timerStatus: 'idle' as TimerStatus,
      timeRemaining: defaultSettings.timerModes[0].duration,
      endAt: 0,
      sessionCount: 0,

      setTimerStatus: (timerStatus) =>
        set((s) => {
          if (timerStatus === 'running') {
            return { timerStatus, endAt: deadline(s.timeRemaining) }
          }
          // Leaving the running state: settle timeRemaining off the deadline so a
          // pause landing between ticks doesn't round away up to a quarter second.
          const settled = s.timerStatus === 'running' && s.endAt
            ? Math.max(0, (s.endAt - Date.now()) / 1000)
            : s.timeRemaining
          return { timerStatus, timeRemaining: settled, endAt: 0 }
        }),

      setTimeRemaining: (timeRemaining) =>
        set((s) =>
          // While running the deadline is the source of truth. Re-deriving it here
          // is a no-op for the ticker (endAt maps back to itself) but re-anchors it
          // when something external jumps the clock.
          s.timerStatus === 'running'
            ? { timeRemaining, endAt: deadline(timeRemaining) }
            : { timeRemaining }
        ),

      incrementSession: () => set((s) => ({ sessionCount: s.sessionCount + 1 })),

      resetTimer: () => {
        const s = get()
        const task = s.activeTaskId ? s.tasks.find((t) => t.id === s.activeTaskId) : undefined
        set({ timerStatus: 'idle', timeRemaining: task ? task.duration : s.activeMode().duration, endAt: 0 })
      },

      skipToNext: () => {
        const s = get()
        const modes = s.settings.timerModes
        const nextIndex = (s.settings.activeModeIndex + 1) % modes.length
        set({
          settings: { ...s.settings, activeModeIndex: nextIndex },
          timeRemaining: modes[nextIndex].duration,
          timerStatus: 'idle',
          endAt: 0,
        })
      },

      // ─── Focus Mode ───────────────────────
      focusMode: false,
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),

      // ─── Settings Panel ────────────────────
      settingsOpen: false,
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

      // ─── Tasks ─────────────────────────────
      tasks: [],
      activeTaskId: null,
      addTask: (title, type, duration) =>
        set((s) => ({
          tasks: [
            ...s.tasks,
            { id: uid(), title, type, duration, completed: false, sessions: 0, createdAt: Date.now() },
          ],
        })),
      updateTask: (id, partial) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...partial } : t)),
        })),
      deleteTask: (id) =>
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
          activeTaskId: s.activeTaskId === id ? null : s.activeTaskId,
          // Deleting the task the clock is counting down would leave it orphaned.
          ...(s.activeTaskId === id ? { timerStatus: 'idle' as TimerStatus, endAt: 0 } : {}),
        })),
      clearTasks: () => set({ tasks: [], activeTaskId: null, timerStatus: 'idle', endAt: 0 }),
      reorderTasks: (from, to) =>
        set((s) => {
          if (from === to || from < 0 || to < 0 || from >= s.tasks.length || to >= s.tasks.length) return s
          const tasks = [...s.tasks]
          const [moved] = tasks.splice(from, 1)
          tasks.splice(to, 0, moved)
          return { tasks }
        }),
      setActiveTaskId: (activeTaskId) => set({ activeTaskId }),

      advanceToNextTask: () => {
        const s = get()
        // The task that just finished is already marked complete, so the first
        // remaining incomplete task is the next one to run.
        const next = s.tasks.find((t) => !t.completed)
        if (!next) {
          set({ activeTaskId: null, timerStatus: 'idle', endAt: 0 })
          return
        }
        set({
          activeTaskId: next.id,
          timeRemaining: next.duration,
          timerStatus: 'running',
          endAt: deadline(next.duration),
        })
      },

      skipActiveTask: () => {
        const { activeTaskId, updateTask, advanceToNextTask } = get()
        // Mark it done first, otherwise advanceToNextTask picks the same task again.
        if (activeTaskId) updateTask(activeTaskId, { completed: true })
        advanceToNextTask()
      },

      startTaskQueue: () => {
        const first = get().tasks.find((t) => !t.completed)
        if (!first) return
        set({
          activeTaskId: first.id,
          timeRemaining: first.duration,
          timerStatus: 'running',
          endAt: deadline(first.duration),
        })
      },

      startTaskAt: (index) =>
        set((s) => {
          const task = s.tasks[index]
          if (!task) return s
          // Everything above the chosen task counts as done, everything from it on doesn't.
          const tasks = s.tasks.map((t, i) => {
            const completed = i < index
            return t.completed === completed ? t : { ...t, completed }
          })
          return {
            tasks,
            activeTaskId: task.id,
            timeRemaining: task.duration,
            timerStatus: 'running' as TimerStatus,
            endAt: deadline(task.duration),
          }
        }),

      // ─── Session Tracking ──────────────────
      sessions: [],
      addSessionRecord: ({ minutes, modeId, isBreak }) => {
        const key = todayKey()
        set((s) => {
          // A break is a completed session but not focus time.
          const focus = isBreak ? 0 : minutes
          const existing = s.sessions.find((r) => r.date === key)
          if (existing) {
            return {
              sessions: s.sessions.map((r) =>
                r.date === key
                  ? {
                      ...r,
                      completedSessions: r.completedSessions + 1,
                      totalFocusMinutes: r.totalFocusMinutes + focus,
                      modes: { ...r.modes, [modeId]: (r.modes[modeId] || 0) + 1 },
                    }
                  : r
              ),
            }
          }
          return {
            sessions: [
              ...s.sessions,
              { date: key, completedSessions: 1, totalFocusMinutes: focus, modes: { [modeId]: 1 } },
            ],
          }
        })
      },
      resetStats: () => set({ sessions: [], sessionCount: 0 }),

      // ─── Timer Modes ──────────────────────
      addTimerMode: (mode) =>
        set((s) => ({
          settings: {
            ...s.settings,
            timerModes: [...s.settings.timerModes, { ...mode, id: uid() }],
          },
        })),
      updateTimerMode: (id, partial) =>
        set((s) => {
          const newModes = s.settings.timerModes.map((m) =>
            m.id === id ? { ...m, ...partial } : m
          )
          const activeMode = newModes[s.settings.activeModeIndex]
          // Sync timeRemaining when the active mode's duration changes while idle.
          const shouldSync =
            activeMode?.id === id && partial.duration !== undefined &&
            s.timerStatus === 'idle' && !s.activeTaskId
          return {
            settings: { ...s.settings, timerModes: newModes },
            ...(shouldSync ? { timeRemaining: partial.duration! } : {}),
          }
        }),
      deleteTimerMode: (id) =>
        set((s) => {
          const modes = s.settings.timerModes.filter((m) => m.id !== id)
          if (modes.length === 0) return s
          const activeModeIndex = Math.min(s.settings.activeModeIndex, modes.length - 1)
          const idle = s.timerStatus === 'idle' && !s.activeTaskId
          return {
            settings: { ...s.settings, timerModes: modes, activeModeIndex },
            ...(idle ? { timeRemaining: modes[activeModeIndex].duration } : {}),
          }
        }),
      setActiveModeIndex: (i) => {
        const modes = get().settings.timerModes
        if (i < 0 || i >= modes.length) return
        set((s) => ({
          settings: { ...s.settings, activeModeIndex: i },
          timeRemaining: modes[i].duration,
          timerStatus: 'idle',
          endAt: 0,
          activeTaskId: null,
        }))
      },

      // ─── Key Bindings ──────────────────────
      updateKeyBinding: (action, key) =>
        set((s) => ({
          settings: {
            ...s.settings,
            keyBindings: s.settings.keyBindings.map((k) =>
              // A key drives one action only; clear it wherever else it was bound.
              k.action === action ? { ...k, key } : k.key === key ? { ...k, key: '' } : k
            ),
          },
        })),

      // ─── Theme Toggle ────────────────────
      toggleDarkMode: () =>
        set((s) => ({ settings: { ...s.settings, darkMode: !s.settings.darkMode } })),

      // ─── Helper ────────────────────────
      activeMode: () => {
        const s = get()
        return s.settings.timerModes[s.settings.activeModeIndex] ?? s.settings.timerModes[0]
      },
    }),
    {
      name: 'nodistractfocus-storage',
      version: 7,
      storage: createJSONStorage(() => coalescingStorage(1000)),
      migrate: (persisted: unknown, version: number) => {
        const data = { ...(persisted as Record<string, any> ?? {}) }
        if (version < 2) {
          data.settings = { ...defaultSettings, ...(data.settings ?? {}) }
        }
        if (version < 3) {
          data.tasks = (data.tasks || []).map((t: any) => ({
            ...t,
            type: t.type || 'task',
            duration: t.duration || 25 * 60,
          }))
        }
        if (version < 4) {
          data.settings = { ...data.settings, darkModeWhenRunning: data.settings?.darkModeWhenRunning ?? false }
        }
        if (version < 5) {
          const kb = data.settings?.keyBindings || []
          data.settings = {
            ...data.settings,
            keyBindings: kb.map((b: any) =>
              b.action === 'settings' && b.key === ',' ? { ...b, key: 'Ctrl+ ' } : b
            ),
          }
        }
        if (version < 7) {
          // Presets never shipped a UI, yet every built-in was serialised on each write.
          delete data.presets
          // countUp was unreachable and its timer path was broken; drop the flag.
          if (data.settings) delete data.settings.countUp
        }
        return data
      },
      partialize: (state) => ({
        settings: state.settings,
        tasks: state.tasks,
        sessions: state.sessions,
        sessionCount: state.sessionCount,
        timeRemaining: state.timeRemaining,
        activeTaskId: state.activeTaskId,
      }),
      merge: (persisted, current) => {
        // Deep-merge settings so a field added in a later release is never `undefined`
        // for someone rehydrating an older payload, and repair anything that would
        // make the app unrenderable.
        const p = (persisted ?? {}) as Partial<AppStore>
        const settings: AppSettings = { ...defaultSettings, ...(p.settings ?? {}) }

        if (!Array.isArray(settings.timerModes) || settings.timerModes.length === 0) {
          settings.timerModes = defaultSettings.timerModes
        }
        settings.activeModeIndex = Math.min(
          Math.max(0, settings.activeModeIndex ?? 0),
          settings.timerModes.length - 1
        )
        const saved = new Map((settings.keyBindings ?? []).map((b) => [b.action, b]))
        settings.keyBindings = defaultKeyBindings.map((d) => ({ ...d, key: saved.get(d.action)?.key ?? d.key }))

        // A corrupted or hand-edited payload must not render an unusable clock.
        const restored = Number(p.timeRemaining)
        const timeRemaining = Number.isFinite(restored) && restored > 0
          ? restored
          : settings.timerModes[settings.activeModeIndex].duration

        return {
          ...current,
          ...p,
          settings,
          timeRemaining,
          // Runtime-only fields never come back from storage.
          timerStatus: 'idle' as TimerStatus,
          endAt: 0,
          focusMode: false,
          settingsOpen: false,
        }
      },
    }
  )
)
