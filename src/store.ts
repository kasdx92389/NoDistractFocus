import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings, Task, TaskType, Preset, SessionRecord, TimerStatus, TimerMode } from './types'
import { defaultSettings, defaultKeyBindings, builtInPresets } from './defaults'

// ─── Helpers ─────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
const todayKey = () => new Date().toISOString().split('T')[0]

// ─── Store Shape ─────────────────────────────────
interface AppStore {
  // Settings
  settings: AppSettings
  updateSettings: (partial: Partial<AppSettings>) => void
  resetSettings: () => void

  // Timer runtime state
  timerStatus: TimerStatus
  timeRemaining: number
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
  activeTaskId: string | null
  setActiveTaskId: (id: string | null) => void
  advanceToNextTask: () => void
  startTaskQueue: () => void

  // Presets
  presets: Preset[]
  addPreset: (name: string, description: string) => void
  deletePreset: (id: string) => void
  loadPreset: (id: string) => void
  importPreset: (json: string) => void
  exportPreset: (id: string) => string | null

  // Session tracking
  sessions: SessionRecord[]
  addSessionRecord: () => void
  resetStats: () => void

  // Timer modes management
  addTimerMode: (mode: Omit<TimerMode, 'id'>) => void
  updateTimerMode: (id: string, partial: Partial<TimerMode>) => void
  deleteTimerMode: (id: string) => void
  reorderTimerModes: (modes: TimerMode[]) => void
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
      }),

      // ─── Timer State ───────────────────────
      timerStatus: 'idle' as TimerStatus,
      timeRemaining: defaultSettings.timerModes[0].duration,
      sessionCount: 0,
      setTimerStatus: (timerStatus) => set({ timerStatus }),
      setTimeRemaining: (timeRemaining) => set({ timeRemaining }),
      incrementSession: () => set((s) => ({ sessionCount: s.sessionCount + 1 })),
      resetTimer: () => {
        const mode = get().activeMode()
        set({ timerStatus: 'idle', timeRemaining: mode.duration })
      },
      skipToNext: () => {
        const s = get()
        const modes = s.settings.timerModes
        const nextIndex = (s.settings.activeModeIndex + 1) % modes.length
        const nextMode = modes[nextIndex]
        set((prev) => ({
          settings: { ...prev.settings, activeModeIndex: nextIndex },
          timeRemaining: nextMode.duration,
          timerStatus: 'idle',
        }))
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
        })),
      clearTasks: () => set({ tasks: [], activeTaskId: null }),
      setActiveTaskId: (activeTaskId) => set({ activeTaskId }),
      advanceToNextTask: () => {
        const s = get()
        const incomplete = s.tasks.filter((t) => !t.completed)
        const currentIdx = incomplete.findIndex((t) => t.id === s.activeTaskId)
        const nextTask = incomplete[currentIdx + 1]
        if (nextTask) {
          set({
            activeTaskId: nextTask.id,
            timeRemaining: nextTask.duration,
            timerStatus: 'running',
          })
        } else {
          // No more tasks — stop
          set({ activeTaskId: null, timerStatus: 'idle' })
        }
      },
      startTaskQueue: () => {
        const s = get()
        const incomplete = s.tasks.filter((t) => !t.completed)
        if (incomplete.length === 0) return
        const first = incomplete[0]
        set({
          activeTaskId: first.id,
          timeRemaining: first.duration,
          timerStatus: 'running',
        })
      },

      // ─── Presets ───────────────────────────
      presets: [...builtInPresets],
      addPreset: (name, description) => {
        const currentSettings = { ...get().settings }
        set((s) => ({
          presets: [
            ...s.presets,
            { id: uid(), name, description, builtIn: false, settings: currentSettings },
          ],
        }))
      },
      deletePreset: (id) =>
        set((s) => ({
          presets: s.presets.filter((p) => p.id !== id || p.builtIn),
        })),
      loadPreset: (id) => {
        const preset = get().presets.find((p) => p.id === id)
        if (preset) {
          set({
            settings: { ...preset.settings },
            timeRemaining: preset.settings.timerModes[preset.settings.activeModeIndex]?.duration ?? 25 * 60,
            timerStatus: 'idle',
          })
        }
      },
      importPreset: (json) => {
        try {
          const data = JSON.parse(json)
          if (data.name && data.settings) {
            set((s) => ({
              presets: [
                ...s.presets,
                { id: uid(), name: data.name, description: data.description || '', builtIn: false, settings: data.settings },
              ],
            }))
          }
        } catch {
          // Invalid JSON, ignore
        }
      },
      exportPreset: (id) => {
        const preset = get().presets.find((p) => p.id === id)
        if (!preset) return null
        return JSON.stringify({ name: preset.name, description: preset.description, settings: preset.settings }, null, 2)
      },

      // ─── Session Tracking ──────────────────
      sessions: [],
      addSessionRecord: () => {
        const key = todayKey()
        const mode = get().activeMode()
        set((s) => {
          const existing = s.sessions.find((r) => r.date === key)
          if (existing) {
            return {
              sessions: s.sessions.map((r) =>
                r.date === key
                  ? {
                      ...r,
                      completedSessions: r.completedSessions + 1,
                      totalFocusMinutes: r.totalFocusMinutes + mode.duration / 60,
                      modes: { ...r.modes, [mode.id]: (r.modes[mode.id] || 0) + 1 },
                    }
                  : r
              ),
            }
          }
          return {
            sessions: [
              ...s.sessions,
              {
                date: key,
                completedSessions: 1,
                totalFocusMinutes: mode.duration / 60,
                modes: { [mode.id]: 1 },
              },
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
            timerModes: [
              ...s.settings.timerModes,
              { ...mode, id: uid() },
            ],
          },
        })),
      updateTimerMode: (id, partial) =>
        set((s) => {
          const newModes = s.settings.timerModes.map((m) =>
            m.id === id ? { ...m, ...partial } : m
          )
          const activeMode = newModes[s.settings.activeModeIndex]
          // Sync timeRemaining when active mode duration changes and timer is idle
          const shouldSync = activeMode && activeMode.id === id && partial.duration !== undefined && s.timerStatus === 'idle'
          return {
            settings: { ...s.settings, timerModes: newModes },
            ...(shouldSync ? { timeRemaining: partial.duration! } : {}),
          }
        }),
      deleteTimerMode: (id) =>
        set((s) => {
          const modes = s.settings.timerModes.filter((m) => m.id !== id)
          if (modes.length === 0) return s
          return {
            settings: {
              ...s.settings,
              timerModes: modes,
              activeModeIndex: Math.min(s.settings.activeModeIndex, modes.length - 1),
            },
          }
        }),
      reorderTimerModes: (modes) =>
        set((s) => ({ settings: { ...s.settings, timerModes: modes } })),
      setActiveModeIndex: (i) => {
        const modes = get().settings.timerModes
        if (i >= 0 && i < modes.length) {
          set((s) => ({
            settings: { ...s.settings, activeModeIndex: i },
            timeRemaining: modes[i].duration,
            timerStatus: 'idle',
          }))
        }
      },

      // ─── Key Bindings ──────────────────────
      updateKeyBinding: (action, key) =>
        set((s) => ({
          settings: {
            ...s.settings,
            keyBindings: s.settings.keyBindings.map((k) =>
              k.action === action ? { ...k, key } : k
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
      version: 6,
      migrate: (persisted: any, version: number) => {
        let data = persisted ?? {}
        if (version < 2) {
          data = {
            ...data,
            settings: { ...defaultSettings, ...(data?.settings ?? {}) },
          }
        }
        if (version < 3) {
          data.tasks = (data.tasks || []).map((t: any) => ({
            ...t,
            type: t.type || 'task',
            duration: t.duration || 25 * 60,
          }))
        }
        if (version < 4) {
          const s = data.settings || {}
          data.settings = {
            ...s,
            darkModeWhenRunning: s.darkModeWhenRunning ?? false,
          }
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
        // Ensure all default keybindings exist (fill missing ones)
        if (data.settings?.keyBindings) {
          const existing = data.settings.keyBindings as any[]
          const defaults = [
            { action: 'toggle', label: 'Start / Pause', key: ' ' },
            { action: 'reset', label: 'Reset Timer', key: 'r' },
            { action: 'focus', label: 'Focus Mode', key: 'f' },
            { action: 'skip', label: 'Skip to Next', key: 'n' },
            { action: 'settings', label: 'Open Settings', key: 'Ctrl+ ' },
          ]
          for (const d of defaults) {
            if (!existing.find((b: any) => b.action === d.action)) {
              existing.push(d)
            }
          }
          data.settings.keyBindings = existing
        }
        return data
      },
      partialize: (state) => ({
        settings: state.settings,
        tasks: state.tasks,
        presets: state.presets,
        sessions: state.sessions,
        sessionCount: state.sessionCount,
        timeRemaining: state.timeRemaining,
        activeTaskId: state.activeTaskId,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // Ensure all default keybindings exist at runtime
        const kb = state.settings.keyBindings
        let changed = false
        for (const d of defaultKeyBindings) {
          if (!kb.find((b) => b.action === d.action)) {
            kb.push(d)
            changed = true
          }
        }
        if (changed) {
          useStore.setState((s) => ({
            settings: { ...s.settings, keyBindings: [...kb] },
          }))
        }
      },
    }
  )
)
