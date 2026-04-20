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
  linkedModeId?: string
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

// ─── Layout Block ────────────────────────────────
export type LayoutBlockType = 'timer' | 'controls' | 'modeSelector' | 'taskList'

export interface LayoutBlock {
  id: LayoutBlockType
  label: string
  visible: boolean
}

// ─── Color Theme ────────────────────────────────
export interface ColorTheme {
  id: string
  name: string
  task: string       // color for focus/task
  break: string      // color for break
  longbreak: string  // color for long break
}

// ─── App Settings ────────────────────────────────
export interface AppSettings {
  // Visual
  fontFamily: string
  timerFontSize: number   // px
  fontWeight: number
  backgroundColor: string
  textColor: string
  accentColor: string
  colorThemeId: string
  useGradient: boolean
  gradientFrom: string
  gradientTo: string
  darkMode: boolean
  darkModeWhenRunning: boolean
  customCss: string

  // Behavior
  autoStartNextSession: boolean
  autoStartBreaks: boolean
  loopMode: boolean
  countUp: boolean
  soundEnabled: boolean
  soundVolume: number
  customSoundUrl: string | null
  desktopNotifications: boolean

  // Focus Mode
  focusColoredBackground: boolean
  focusToggleFullscreen: boolean
  focusShowControls: boolean
  focusShowModeLabel: boolean
  focusShowSessionCounter: boolean
  timerPosition: 'center' | 'top' | 'custom'
  timerOffsetY: number
  hideCursorAfter: number // seconds, 0 = disabled

  // Layout
  layoutBlocks: LayoutBlock[]

  // Timer Modes
  timerModes: TimerMode[]
  activeModeIndex: number

  // Key Bindings
  keyBindings: KeyBinding[]
}

// ─── Timer State (runtime, not persisted) ────────
export type TimerStatus = 'idle' | 'running' | 'paused'
