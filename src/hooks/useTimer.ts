import { useEffect } from 'react'
import { useStore } from '../store'
import { playChime, notify, isBreakName } from '../util'

const TICK_INTERVAL = 250 // ms — smooth enough for a seconds display, cheap enough to ignore

export function useTimer() {
  // Only subscribe to timerStatus reactively; everything else is read imperatively.
  const timerStatus = useStore((s) => s.timerStatus)

  useEffect(() => {
    if (timerStatus !== 'running') return

    let done = false

    const tick = () => {
      if (done) return
      const s = useStore.getState()
      if (s.timerStatus !== 'running') return
      if (!s.endAt) {
        // Running without a deadline should be unreachable, but treating it as
        // "already expired" would fire the alarm instantly. Re-anchor instead.
        s.setTimerStatus('running')
        return
      }

      // Read the deadline, never accumulate deltas: background tabs throttle
      // intervals to ~1/s and a locked phone suspends them entirely, so a
      // delta-summing timer drifts by exactly the time it was asleep.
      const left = (s.endAt - Date.now()) / 1000
      if (left > 0) {
        // Write straight to state, not through setTimeRemaining: that action
        // re-derives endAt from the value it is handed, which would push the
        // deadline forward by the microseconds between the two Date.now()
        // readings on every single tick.
        useStore.setState({ timeRemaining: left })
        return
      }
      done = true
      s.setTimeRemaining(0)
      s.setTimerStatus('idle')
      handleComplete()
    }

    const id = window.setInterval(tick, TICK_INTERVAL)
    // Coming back to a throttled or frozen tab: settle up immediately rather
    // than showing a stale time until the next tick.
    const onVisible = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      done = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [timerStatus])
}

function handleComplete() {
  const s = useStore.getState()
  const mode = s.activeMode()
  const task = s.activeTaskId ? s.tasks.find((t) => t.id === s.activeTaskId) : undefined

  // What just finished — a task run overrides the mode rotation.
  const finishedLabel = task ? task.title : mode.name
  const finishedMinutes = (task ? task.duration : mode.duration) / 60
  const finishedIsBreak = task ? task.type !== 'task' : isBreakName(mode.name)

  if (s.settings.soundEnabled) playChime(s.settings.soundVolume)
  if (s.settings.desktopNotifications) {
    notify('NoDistractFocus', `${finishedLabel} — ${finishedIsBreak ? 'break over' : 'session complete'}!`)
  }

  s.incrementSession()
  s.addSessionRecord({ minutes: finishedMinutes, modeId: mode.id, isBreak: finishedIsBreak })

  // ─── Schedule mode: active task queue ───
  if (task) {
    s.updateTask(task.id, { completed: true, sessions: task.sessions + 1 })
    // Let the completion state land before picking the next task off the queue.
    setTimeout(() => useStore.getState().advanceToNextTask(), 100)
    return
  }

  // ─── Normal mode rotation (no schedule) ───
  const modes = s.settings.timerModes
  const currentIdx = s.settings.activeModeIndex
  const nextIdx = (currentIdx + 1) % modes.length

  if (!s.settings.loopMode && nextIdx === 0) {
    s.setTimeRemaining(modes[currentIdx].duration)
    return
  }

  const nextIsBreak = isBreakName(modes[nextIdx].name)
  const shouldAutoStart = nextIsBreak ? s.settings.autoStartBreaks : s.settings.autoStartNextSession

  s.skipToNext()
  if (shouldAutoStart) {
    setTimeout(() => useStore.getState().setTimerStatus('running'), 50)
  }
}
