import { useState, useCallback, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { fmtClock, readableOn } from '../util'

const CANVAS_W = 1920
const CANVAS_H = 1080
const SCALE = CANVAS_H / 240
// A seconds clock needs ~4 redraws/sec, not 60. requestAnimationFrame is also the
// wrong driver here: it stops entirely once the tab is hidden, which is precisely
// when the PiP window is the only thing the user can see.
const DRAW_INTERVAL = 250

function supportsVideoPiP(): boolean {
  return (
    typeof document !== 'undefined' &&
    'pictureInPictureEnabled' in document &&
    document.pictureInPictureEnabled &&
    typeof HTMLVideoElement !== 'undefined' &&
    'requestPictureInPicture' in HTMLVideoElement.prototype
  )
}

function clearMediaSession() {
  if (!('mediaSession' in navigator)) return
  navigator.mediaSession.playbackState = 'none'
  navigator.mediaSession.metadata = null
  for (const action of ['play', 'pause', 'seekbackward', 'seekforward', 'previoustrack', 'nexttrack'] as MediaSessionAction[]) {
    try { navigator.mediaSession.setActionHandler(action, null) } catch { /* unsupported action */ }
  }
}

export function usePiP() {
  const [floating, setFloating] = useState(false)
  const [videoPiP, setVideoPiP] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const prevTitleRef = useRef('')
  const prevFrameRef = useRef('')

  // ─── Canvas drawing loop ───────────────────────
  const startDrawing = useCallback(() => {
    const draw = () => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return

      const s = useStore.getState()
      // While running, read straight off the deadline: the store's timeRemaining
      // is only refreshed on the app's own tick, which throttles in a hidden tab.
      const secs = s.timerStatus === 'running' && s.endAt
        ? (s.endAt - Date.now()) / 1000
        : s.timeRemaining
      const timeStr = fmtClock(secs)

      const fontFam = s.settings.fontFamily || 'Inter'
      const fontW = s.settings.fontWeight ?? 700
      const dark = s.settings.darkMode
      const running = s.timerStatus === 'running'
      const useFocusColor = s.focusMode && s.settings.focusColoredBackground
      const modeColor = s.activeMode().color || '#3b82f6'

      const bgColor = useFocusColor ? modeColor : (dark ? '#0f1117' : '#f0f2f5')
      // A light mode colour (yellow, amber) with white text is unreadable.
      const textColor = useFocusColor ? readableOn(modeColor) : (dark ? '#ffffff' : '#1e293b')

      // Repainting 1920x1080 four times a second for an unchanged frame is pure
      // battery burn, and the captured stream holds the last frame anyway.
      const signature = `${timeStr}|${bgColor}|${textColor}|${fontFam}|${fontW}`
      if (signature !== prevFrameRef.current) {
        prevFrameRef.current = signature
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
        const c2d = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
        c2d.letterSpacing = `${Math.round(-3 * SCALE)}px`
        ctx.fillStyle = textColor
        ctx.font = `${fontW} ${Math.round(90 * SCALE)}px "${fontFam}", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(timeStr, CANVAS_W / 2, CANVAS_H / 2 + Math.round(4 * SCALE))
        c2d.letterSpacing = '0px'
      }

      // Sync Media Session playback state + metadata
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = running ? 'playing' : 'paused'
        const task = s.tasks.find((t) => t.id === s.activeTaskId)
        const title = task ? task.title : s.activeMode().name
        if (prevTitleRef.current !== title) {
          prevTitleRef.current = title
          navigator.mediaSession.metadata = new MediaMetadata({
            title,
            artist: 'NoDistractFocus',
            album: 'Focus Timer',
          })
        }
      }
    }

    if (timerRef.current) clearInterval(timerRef.current)
    prevFrameRef.current = ''
    draw()
    timerRef.current = window.setInterval(draw, DRAW_INTERVAL)
  }, [])

  const stopDrawing = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // ─── Open / Toggle ─────────────────────────────
  const openPiP = useCallback(async () => {
    if (videoPiP) {
      await document.exitPictureInPicture().catch(() => {})
      stopDrawing()
      clearMediaSession()
      setVideoPiP(false)
      return
    }
    if (floating) { setFloating(false); return }

    if (supportsVideoPiP()) {
      try {
        if (!canvasRef.current) {
          const canvas = document.createElement('canvas')
          canvas.width = CANVAS_W
          canvas.height = CANVAS_H
          canvasRef.current = canvas
        }

        if (!videoRef.current) {
          const video = document.createElement('video')
          video.muted = true
          video.playsInline = true
          video.setAttribute('playsinline', '')

          // Keep the canvas stream playing while in PiP so the timer keeps updating.
          video.addEventListener('pause', () => {
            if (document.pictureInPictureElement) video.play().catch(() => {})
          })

          video.addEventListener('leavepictureinpicture', () => {
            stopDrawing()
            clearMediaSession()
            setVideoPiP(false)
          })

          videoRef.current = video
        }

        startDrawing()
        // 4fps is all a seconds clock needs and keeps the encoder near idle.
        const stream = canvasRef.current.captureStream(4)
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        // ── Media Session: native PiP controls → timer ──
        if ('mediaSession' in navigator) {
          navigator.mediaSession.setActionHandler('play', () => {
            useStore.getState().setTimerStatus('running')
            navigator.mediaSession.playbackState = 'playing'
          })
          navigator.mediaSession.setActionHandler('pause', () => {
            useStore.getState().setTimerStatus('paused')
            navigator.mediaSession.playbackState = 'paused'
          })
          for (const action of ['seekbackward', 'seekforward', 'previoustrack', 'nexttrack'] as MediaSessionAction[]) {
            try { navigator.mediaSession.setActionHandler(action, null) } catch { /* unsupported action */ }
          }
        }

        await videoRef.current.requestPictureInPicture()
        setVideoPiP(true)
        return
      } catch (err) {
        console.warn('Video PiP failed, falling back to floating widget:', err)
        stopDrawing()
        clearMediaSession()
      }
    }

    setFloating(true)
  }, [videoPiP, floating, startDrawing, stopDrawing])

  // ─── Close ─────────────────────────────────────
  const closePiP = useCallback(() => {
    if (document.pictureInPictureElement) void document.exitPictureInPicture().catch(() => {})
    stopDrawing()
    clearMediaSession()
    setVideoPiP(false)
    setFloating(false)
  }, [stopDrawing])

  // ─── Cleanup on unmount ────────────────────────
  useEffect(() => {
    return () => {
      stopDrawing()
      clearMediaSession()
      const video = videoRef.current
      if (video) {
        // Release the capture stream, or the tab keeps a live encoder around.
        for (const track of (video.srcObject as MediaStream | null)?.getTracks() ?? []) track.stop()
        video.srcObject = null
      }
      if (document.pictureInPictureElement) void document.exitPictureInPicture().catch(() => {})
    }
  }, [stopDrawing])

  return {
    openPiP,
    closePiP,
    isPiP: videoPiP || floating,
    floating,
  }
}
