import { useEffect } from 'react'

interface Sentinel { released: boolean; release(): Promise<void> }
interface WakeLockNav { wakeLock?: { request(type: 'screen'): Promise<Sentinel> } }

/**
 * Keeps the screen on while `active`. Without this a phone dims and locks
 * mid-session, which is exactly when the user is looking at the timer.
 * The lock is dropped by the browser whenever the tab hides, so it has to be
 * re-requested on every return to visibility.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    const api = (navigator as Navigator & WakeLockNav).wakeLock
    if (!active || !api) return

    let sentinel: Sentinel | null = null
    let cancelled = false

    const acquire = async () => {
      if (cancelled || document.hidden || sentinel) return
      try {
        sentinel = await api.request('screen')
        if (cancelled) { void sentinel.release().catch(() => {}); sentinel = null }
      } catch { /* denied, low battery, or not permitted here */ }
    }

    const onVisibility = () => {
      if (document.hidden) sentinel = null // browser already released it
      else void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibility)
      void sentinel?.release().catch(() => {})
      sentinel = null
    }
  }, [active])
}
