import { useEffect, useRef } from 'react'
import { useStore } from '../store'

const TICK_INTERVAL = 250 // ms — balanced accuracy vs performance

export function useTimer() {
  // Only subscribe to timerStatus reactively — everything else read imperatively
  const timerStatus = useStore((s) => s.timerStatus)

  const lastTickRef = useRef<number>(0)
  const intervalRef = useRef<number | null>(null)
  const autoStartRef = useRef<number | null>(null)

  // Cleanup auto-start timeout on unmount
  useEffect(() => {
    return () => {
      if (autoStartRef.current) clearTimeout(autoStartRef.current)
    }
  }, [])

  useEffect(() => {
    if (timerStatus !== 'running') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    lastTickRef.current = performance.now()

    intervalRef.current = window.setInterval(() => {
      const now = performance.now()
      const delta = (now - lastTickRef.current) / 1000
      lastTickRef.current = now

      const s = useStore.getState()
      const mode = s.activeMode()
      const countUp = s.settings.countUp

      if (countUp) {
        const next = s.timeRemaining + delta
        if (next >= mode.duration) {
          s.setTimeRemaining(mode.duration)
          s.setTimerStatus('idle')
          handleComplete()
        } else {
          s.setTimeRemaining(next)
        }
      } else {
        const next = s.timeRemaining - delta
        if (next <= 0) {
          s.setTimeRemaining(0)
          s.setTimerStatus('idle')
          handleComplete()
        } else {
          s.setTimeRemaining(next)
        }
      }
    }, TICK_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timerStatus])
}

function handleComplete() {
  const s = useStore.getState()

  // Play alarm sound
  if (s.settings.soundEnabled) {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.value = s.settings.soundVolume * 0.3
      osc.frequency.value = 830
      osc.type = 'sine'
      osc.start()
      setTimeout(() => { osc.frequency.value = 1046 }, 150)
      setTimeout(() => { osc.frequency.value = 830 }, 300)
      setTimeout(() => { osc.frequency.value = 1046 }, 450)
      setTimeout(() => { osc.stop(); ctx.close() }, 700)
    } catch { /* Web Audio not available */ }
  }

  // Desktop notification
  if (s.settings.desktopNotifications && Notification.permission === 'granted') {
    new Notification('NoDistractFocus', {
      body: `${s.activeMode().name} session complete!`,
    })
  }

  // Increment session & record
  s.incrementSession()
  s.addSessionRecord()

  // ─── Schedule mode: active task queue ───
  if (s.activeTaskId) {
    const task = s.tasks.find((t) => t.id === s.activeTaskId)
    if (task) {
      s.updateTask(task.id, { completed: true, sessions: task.sessions + 1 })
    }
    // Auto-advance to next incomplete task
    setTimeout(() => useStore.getState().advanceToNextTask(), 100)
    return
  }

  // ─── Normal mode rotation (no schedule) ───
  const modes = s.settings.timerModes
  const currentIdx = s.settings.activeModeIndex
  const nextIdx = (currentIdx + 1) % modes.length

  if (!s.settings.loopMode && nextIdx === 0) {
    s.setTimerStatus('idle')
    s.setTimeRemaining(modes[currentIdx].duration)
    return
  }

  const nextMode = modes[nextIdx]
  const isBreak = nextMode.name.toLowerCase().includes('break') || nextMode.name.toLowerCase().includes('rest')
  const shouldAutoStart = isBreak ? s.settings.autoStartBreaks : s.settings.autoStartNextSession

  s.skipToNext()

  if (shouldAutoStart) {
    setTimeout(() => useStore.getState().setTimerStatus('running'), 50)
  }
}
