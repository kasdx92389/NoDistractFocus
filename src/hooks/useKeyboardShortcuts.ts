import { useEffect } from 'react'
import { useStore } from '../store'
import { unlockAudio } from '../util'

// Parse a key binding string like "Ctrl+ " or "f" into { ctrl, key }.
function parseBinding(raw: string | undefined): { ctrl: boolean; key: string } | null {
  if (!raw) return null
  if (raw.toLowerCase().startsWith('ctrl+')) return { ctrl: true, key: raw.slice(5) }
  return { ctrl: false, key: raw }
}

// Physical key codes let a binding keep working under a non-Latin keyboard layout
// (Thai, Cyrillic, …) where `e.key` is a different character entirely.
const KEY_TO_CODE: Record<string, string> = {
  a: 'KeyA', b: 'KeyB', c: 'KeyC', d: 'KeyD', e: 'KeyE',
  f: 'KeyF', g: 'KeyG', h: 'KeyH', i: 'KeyI', j: 'KeyJ',
  k: 'KeyK', l: 'KeyL', m: 'KeyM', n: 'KeyN', o: 'KeyO',
  p: 'KeyP', q: 'KeyQ', r: 'KeyR', s: 'KeyS', t: 'KeyT',
  u: 'KeyU', v: 'KeyV', w: 'KeyW', x: 'KeyX', y: 'KeyY',
  z: 'KeyZ', ' ': 'Space',
}

function matchesBinding(e: KeyboardEvent, binding: ReturnType<typeof parseBinding>): boolean {
  if (!binding || !binding.key) return false
  if (binding.ctrl !== (e.ctrlKey || e.metaKey)) return false
  if (e.altKey) return false
  const expectedCode = KEY_TO_CODE[binding.key.toLowerCase()]
  return (
    e.key.toLowerCase() === binding.key.toLowerCase() ||
    e.key === binding.key ||
    (!!expectedCode && e.code === expectedCode)
  )
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el?.tagName) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const s = useStore.getState()
      const bind = (action: string) =>
        parseBinding(s.settings.keyBindings.find((b) => b.action === action)?.key)

      // Escape always works — close one layer at a time.
      if (e.key === 'Escape') {
        if (s.settingsOpen) s.setSettingsOpen(false)
        else if (s.focusMode) s.toggleFocusMode()
        return
      }

      // Ctrl/Cmd combos fire even while typing; a plain letter never can.
      if (matchesBinding(e, bind('settings'))) {
        e.preventDefault()
        s.setSettingsOpen(!s.settingsOpen)
        return
      }

      // Typing a task title must never trigger a shortcut — not even into an empty
      // field, where the first Space or "r" would otherwise be swallowed.
      if (isTypingTarget(e.target)) return

      if (matchesBinding(e, bind('toggle'))) {
        e.preventDefault()
        unlockAudio() // a real gesture: lets the end-of-session chime play on mobile
        s.setTimerStatus(s.timerStatus === 'running' ? 'paused' : 'running')
      } else if (matchesBinding(e, bind('reset'))) {
        e.preventDefault()
        s.resetTimer()
      } else if (matchesBinding(e, bind('focus'))) {
        e.preventDefault()
        s.toggleFocusMode()
      } else if (matchesBinding(e, bind('skip'))) {
        e.preventDefault()
        if (s.activeTaskId) s.skipActiveTask()
        else s.skipToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
