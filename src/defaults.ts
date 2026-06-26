import type { AppSettings, TimerMode, KeyBinding, Preset } from './types'

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

export const defaultSettings: AppSettings = {
  fontFamily: 'Inter',
  timerFontSize: 120,
  fontWeight: 700,
  darkMode: false,
  darkModeWhenRunning: false,

  autoStartNextSession: false,
  autoStartBreaks: false,
  loopMode: true,
  countUp: false,
  soundEnabled: true,
  soundVolume: 0.7,
  desktopNotifications: false,

  focusColoredBackground: true,
  hideCursorAfter: 5,

  timerModes: defaultTimerModes,
  activeModeIndex: 0,
  keyBindings: defaultKeyBindings,
}

// ─── Built-in Presets ────────────────────────────
export const builtInPresets: Preset[] = [
  {
    id: 'preset-minimal',
    name: 'Minimal',
    description: 'Clean, distraction-free timer',
    builtIn: true,
    settings: {
      ...defaultSettings,
      timerFontSize: 140,
      fontWeight: 300,
    },
  },
  {
    id: 'preset-deepwork',
    name: 'Deep Work',
    description: '50-min focus with 10-min breaks',
    builtIn: true,
    settings: {
      ...defaultSettings,
      timerModes: [
        { id: 'deepwork', name: 'Deep Work', duration: 50 * 60, color: '#8b5cf6' },
        { id: 'rest', name: 'Rest', duration: 10 * 60, color: '#10b981' },
      ],
      timerFontSize: 130,
      fontWeight: 600,
    },
  },
  {
    id: 'preset-aesthetic',
    name: 'Aesthetic',
    description: 'Beautiful gradient design',
    builtIn: true,
    settings: {
      ...defaultSettings,
      timerFontSize: 110,
      fontFamily: 'Space Grotesk',
      fontWeight: 500,
    },
  },
  {
    id: 'preset-streamer',
    name: 'Streamer Mode',
    description: 'Bold, visible from a distance',
    builtIn: true,
    settings: {
      ...defaultSettings,
      timerFontSize: 180,
      fontWeight: 900,
    },
  },
]
