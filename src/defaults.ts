import type { AppSettings, TimerMode, LayoutBlock, KeyBinding, Preset, ColorTheme } from './types'

export const colorThemes: ColorTheme[] = [
  { id: 'pomodo',  name: 'Pomodo',  task: '#ba4949', break: '#38858a', longbreak: '#397097' },
  { id: 'ocean',   name: 'Ocean',   task: '#3b82f6', break: '#22c55e', longbreak: '#8b5cf6' },
  { id: 'sunset',  name: 'Sunset',  task: '#e67e22', break: '#27ae60', longbreak: '#8e44ad' },
  { id: 'mono',    name: 'Mono',    task: '#6b7280', break: '#9ca3af', longbreak: '#4b5563' },
]

export const defaultTimerModes: TimerMode[] = [
  { id: 'pomodoro', name: 'Pomodoro', duration: 25 * 60, color: '#3b82f6' },
  { id: 'short-break', name: 'Short Break', duration: 5 * 60, color: '#22c55e' },
  { id: 'long-break', name: 'Long Break', duration: 15 * 60, color: '#8b5cf6' },
]

export const defaultLayoutBlocks: LayoutBlock[] = [
  { id: 'modeSelector', label: 'Mode Selector', visible: true },
  { id: 'timer', label: 'Timer', visible: true },
  { id: 'controls', label: 'Controls', visible: true },
  { id: 'taskList', label: 'Task List', visible: true },
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
  backgroundColor: '#f0f2f5',
  textColor: '#1e293b',
  accentColor: '#3b82f6',
  colorThemeId: 'pomodo',
  useGradient: false,
  gradientFrom: '#f0f2f5',
  gradientTo: '#dbeafe',
  darkMode: false,
  darkModeWhenRunning: false,
  customCss: '',

  autoStartNextSession: false,
  autoStartBreaks: false,
  loopMode: true,
  countUp: false,
  soundEnabled: true,
  soundVolume: 0.7,
  customSoundUrl: null,
  desktopNotifications: false,

  focusColoredBackground: true,
  focusToggleFullscreen: false,
  focusShowControls: true,
  focusShowModeLabel: true,
  focusShowSessionCounter: true,
  timerPosition: 'center',
  timerOffsetY: 0,
  hideCursorAfter: 5,

  layoutBlocks: defaultLayoutBlocks,
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
      useGradient: false,
      backgroundColor: '#0a0a0e',
      textColor: '#e0e0e8',
      accentColor: '#ffffff',
      layoutBlocks: [
        { id: 'modeSelector', label: 'Mode Selector', visible: false },
        { id: 'timer', label: 'Timer', visible: true },
        { id: 'controls', label: 'Controls', visible: true },
        { id: 'taskList', label: 'Task List', visible: false },
      ],
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
      backgroundColor: '#0c0a1a',
      accentColor: '#8b5cf6',
      useGradient: true,
      gradientFrom: '#0c0a1a',
      gradientTo: '#1a1040',
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
      useGradient: true,
      gradientFrom: '#0f172a',
      gradientTo: '#1e1b4b',
      accentColor: '#f472b6',
      textColor: '#fdf2f8',
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
      backgroundColor: '#000000',
      textColor: '#ffffff',
      accentColor: '#ef4444',
      layoutBlocks: [
        { id: 'modeSelector', label: 'Mode Selector', visible: true },
        { id: 'timer', label: 'Timer', visible: true },
        { id: 'controls', label: 'Controls', visible: false },
        { id: 'taskList', label: 'Task List', visible: false },
      ],
    },
  },
]
