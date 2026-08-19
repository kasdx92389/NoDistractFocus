import type { AppSettings, TimerMode, KeyBinding } from './types'

export const defaultTimerModes: TimerMode[] = [
  { id: 'pomodoro', name: 'Pomodoro', duration: 25 * 60, color: '#3b82f6' },
  { id: 'short-break', name: 'Short Break', duration: 5 * 60, color: '#22c55e' },
  { id: 'long-break', name: 'Long Break', duration: 15 * 60, color: '#8b5cf6' },
]

export const defaultKeyBindings: KeyBinding[] = [
  { action: 'toggle', label: 'Start / Pause', key: ' ' },
  { action: 'reset', label: 'Reset Timer', key: 'r' },
  { action: 'focus', label: 'Focus Mode', key: 'f' },
  { action: 'skip', label: 'Skip to Next', key: 'n' },
  { action: 'settings', label: 'Open Settings', key: 'Ctrl+ ' },
]

/** Fonts offered in Settings — each is preloaded in index.html. */
export const fontChoices = ['Inter', 'Space Grotesk', 'JetBrains Mono', 'Noto Sans Thai'] as const

export const defaultSettings: AppSettings = {
  fontFamily: 'Inter',
  timerFontSize: 120,
  fontWeight: 700,
  darkMode: false,
  darkModeWhenRunning: false,
  showProgressRing: true,

  autoStartNextSession: false,
  autoStartBreaks: false,
  loopMode: true,
  soundEnabled: true,
  soundVolume: 0.7,
  desktopNotifications: false,
  keepScreenAwake: true,

  focusColoredBackground: true,
  hideCursorAfter: 5,

  timerModes: defaultTimerModes,
  activeModeIndex: 0,
  keyBindings: defaultKeyBindings,
}
