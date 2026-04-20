import { useEffect, useRef } from 'react'
import { useStore } from '../store'

export function useCursorHider() {
  const focusMode = useStore((s) => s.focusMode)
  const hideCursorAfter = useStore((s) => s.settings.hideCursorAfter)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!focusMode || hideCursorAfter <= 0) {
      document.body.classList.remove('cursor-hidden')
      return
    }

    const resetTimer = () => {
      document.body.classList.remove('cursor-hidden')
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => {
        document.body.classList.add('cursor-hidden')
      }, hideCursorAfter * 1000)
    }

    resetTimer()
    window.addEventListener('mousemove', resetTimer)
    window.addEventListener('mousedown', resetTimer)

    return () => {
      document.body.classList.remove('cursor-hidden')
      if (timerRef.current) clearTimeout(timerRef.current)
      window.removeEventListener('mousemove', resetTimer)
      window.removeEventListener('mousedown', resetTimer)
    }
  }, [focusMode, hideCursorAfter])
}
