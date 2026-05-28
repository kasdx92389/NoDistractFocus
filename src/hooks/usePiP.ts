import { useState, useCallback, useRef, useEffect } from 'react'
import { useStore } from '../store'

const CANVAS_W = 400
const CANVAS_H = 240

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
    try { navigator.mediaSession.setActionHandler(action, null) } catch { /* ignored */ }
  }
}

export function usePiP() {
  const [floating, setFloating] = useState(false)
  const [videoPiP, setVideoPiP] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const prevTitleRef = useRef('')

  // ─── Canvas drawing loop ───────────────────────
  const startDrawing = useCallback(() => {
    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const s = useStore.getState()
      const total = Math.ceil(s.timeRemaining)
      const mins = Math.floor(total / 60)
      const secs = total % 60
      const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
      const fontFam = s.settings.fontFamily || 'Inter'
      const fontW = s.settings.fontWeight ?? 700
      const dark = s.settings.darkMode
      const running = s.timerStatus === 'running'

      const bgColor   = dark ? '#0f1117' : '#f0f2f5'
      const textColor = dark ? '#ffffff' : '#1e293b'

      const W = CANVAS_W
      const H = CANVAS_H

      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, W, H)

      ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '-3px'
      ctx.fillStyle = textColor
      ctx.font = `${fontW} 90px "${fontFam}", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(timeStr, W / 2, H / 2 + 4)
      ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px'

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

      rafRef.current = requestAnimationFrame(draw)
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    draw()
  }, [])

  const stopDrawing = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
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

          // Keep canvas stream playing while in PiP so the timer keeps updating
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
        const stream = canvasRef.current.captureStream(30)
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
          // Disable irrelevant seek controls
          for (const action of ['seekbackward', 'seekforward', 'previoustrack', 'nexttrack'] as MediaSessionAction[]) {
            try { navigator.mediaSession.setActionHandler(action, null) } catch { /* ignored */ }
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
    document.exitPictureInPicture().catch(() => {})
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
      document.exitPictureInPicture().catch(() => {})
    }
  }, [stopDrawing])

  return {
    openPiP,
    closePiP,
    isPiP: videoPiP || floating,
    floating,
  }
}
