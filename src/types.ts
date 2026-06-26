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

// ─── Preset ──────────────────────────────────────
export interface Preset {
  id: string
  name: string
  description: string
  builtIn: boolean
  settings: AppSettings
}

// ─── Session Record ──────────────────────────────
export interface SessionRecord {
  date: string // YYYY-MM-DD
  completedSessions: number
  totalFocusMinutes: number
  modes: Record<string, number>
}

// ─── Keyboard Shortcut ───────────────────────────
export interface KeyBinding {
  action: string
  label: string
  key: string
}

// ─── App Settings ────────────────────────────────
export interface AppSettings {
  // Visual
  fontFamily: string
  timerFontSize: number   // px
  fontWeight: number
  darkMode: boolean
  darkModeWhenRunning: boolean

  // Behavior
  autoStartNextSession: boolean
  autoStartBreaks: boolean
  loopMode: boolean
  countUp: boolean
  soundEnabled: boolean
  soundVolume: number
  desktopNotifications: boolean

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
