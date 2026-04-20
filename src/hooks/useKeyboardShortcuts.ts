import { useEffect } from 'react'
import { useStore } from '../store'

// Parse a key binding string like "Ctrl+ " or "f" into { ctrl, key }
function parseBinding(raw: string | undefined): { ctrl: boolean; key: string } | null {
  if (!raw) return null
  const lower = raw.toLowerCase()
  if (lower.startsWith('ctrl+')) {
    return { ctrl: true, key: raw.slice(5) }
  }
  return { ctrl: false, key: raw }
}

// Map key to physical key code for language-independent matching
const KEY_TO_CODE: Record<string, string> = {
  'a': 'KeyA', 'b': 'KeyB', 'c': 'KeyC', 'd': 'KeyD', 'e': 'KeyE',
  'f': 'KeyF', 'g': 'KeyG', 'h': 'KeyH', 'i': 'KeyI', 'j': 'KeyJ',
  'k': 'KeyK', 'l': 'KeyL', 'm': 'KeyM', 'n': 'KeyN', 'o': 'KeyO',
  'p': 'KeyP', 'q': 'KeyQ', 'r': 'KeyR', 's': 'KeyS', 't': 'KeyT',
  'u': 'KeyU', 'v': 'KeyV', 'w': 'KeyW', 'x': 'KeyX', 'y': 'KeyY',
  'z': 'KeyZ', ' ': 'Space',
}

function matchesBinding(e: KeyboardEvent, binding: ReturnType<typeof parseBinding>): boolean {
  if (!binding) return false
  if (binding.ctrl && !e.ctrlKey && !e.metaKey) return false
  if (!binding.ctrl && (e.ctrlKey || e.metaKey)) return false
  // Match by e.key (for current language) OR by e.code (physical key — works across languages)
  const expectedCode = KEY_TO_CODE[binding.key.toLowerCase()]
  return e.key.toLowerCase() === binding.key.toLowerCase() || e.key === binding.key || (!!expectedCode && e.code === expectedCode)
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable || target.tagName === 'SELECT'

      const s = useStore.getState()
      const bindings = s.settings.keyBindings
      const bind = (action: string) => parseBinding(bindings.find((b) => b.action === action)?.key)

      // Escape always works — close one thing at a time
      if (e.key === 'Escape') {
        if (s.settingsOpen) {
          s.setSettingsOpen(false)
        } else if (s.focusMode) {
          s.toggleFocusMode()
        }
        return
      }

      // Ctrl combos always work (even in inputs)
      if (matchesBinding(e, bind('settings'))) {
        e.preventDefault()
        s.setSettingsOpen(!s.settingsOpen)
        return
      }

      // Block shortcuts in inputs — but allow single-key shortcuts if input is empty
      if (inInput) {
        const inputVal = (target as HTMLInputElement).value ?? ''
        if (inputVal.length > 0) return
      }

      if (matchesBinding(e, bind('toggle'))) {
        e.preventDefault()
        s.setTimerStatus(s.timerStatus === 'running' ? 'paused' : 'running')
      } else if (matchesBinding(e, bind('reset'))) {
        e.preventDefault()
        s.resetTimer()
      } else if (matchesBinding(e, bind('focus'))) {
        e.preventDefault()
        s.toggleFocusMode()
      } else if (matchesBinding(e, bind('skip'))) {
        e.preventDefault()
        const hasTasks = s.tasks.filter((t) => !t.completed).length > 0
        if (hasTasks && s.activeTaskId) {
          s.advanceToNextTask()
        } else {
          s.skipToNext()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
