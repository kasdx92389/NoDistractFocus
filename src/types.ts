// ─── Timer Mode ──────────────────────────────────
export interface TimerMode {
  id: string
  name: string
  duration: number // in seconds
  color: string    // hex color for this mode
}

// ─── Task ────────────────────────────────────────
export type TaskType = 'task' | 'break' | 'longbreak'

export interface Task {
  id: string
  title: string
  type: TaskType
  duration: number // in seconds
  completed: boolean
  sessions: number
  color?: string // custom color for task dot & focus bg
  createdAt: number
}

// ─── Session Record ──────────────────────────────
export interface SessionRecord {
  date: string // YYYY-MM-DD, local time
  completedSessions: number
  totalFocusMinutes: number // breaks excluded
  modes: Record<string, number>
}

// ─── Keyboard Shortcut ───────────────────────────
export interface KeyBinding {
  action: string
  label: string
  key: string // '' = unbound
}

// ─── App Settings ────────────────────────────────
export interface AppSettings {
  // Visual
  fontFamily: string
  timerFontSize: number   // px
  fontWeight: number
  darkMode: boolean
  darkModeWhenRunning: boolean
  showProgressRing: boolean

  // Behavior
  autoStartNextSession: boolean
  autoStartBreaks: boolean
  loopMode: boolean
  soundEnabled: boolean
  soundVolume: number
  desktopNotifications: boolean
  keepScreenAwake: boolean

  // Focus Mode
  focusColoredBackground: boolean
  hideCursorAfter: number // seconds, 0 = disabled

  // Timer Modes
  timerModes: TimerMode[]
  activeModeIndex: number

  // Key Bindings
  keyBindings: KeyBinding[]
}

// ─── Timer State (runtime, not persisted) ────────
export type TimerStatus = 'idle' | 'running' | 'paused'
