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

export function usePiP() {
  const [floating, setFloating] = useState(false)
  const [videoPiP, setVideoPiP] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)

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
      const mode = s.activeMode()
      const running = s.timerStatus === 'running'
      const accent = mode.color || '#3b82f6'

      const W = CANVAS_W
      const H = CANVAS_H

      // Background
      ctx.fillStyle = '#0f1117'
      ctx.fillRect(0, 0, W, H)

      // Accent line at top (mode color)
      ctx.fillStyle = accent
      ctx.fillRect(0, 0, W, 5)

      // Status dot — top-left, minimal
      ctx.fillStyle = running ? '#22c55e' : '#4b5563'
      ctx.beginPath()
      ctx.arc(18, 22, 5, 0, Math.PI * 2)
      ctx.fill()

      // Timer digits — large, centered
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold 96px "Courier New", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(timeStr, W / 2, H / 2 + 4)

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
    // Toggle off
    if (videoPiP) {
      await document.exitPictureInPicture().catch(() => {})
      stopDrawing()
      setVideoPiP(false)
      return
    }
    if (floating) {
      setFloating(false)
      return
    }

    // Try Video PiP (works cross-app on mobile & desktop)
    if (supportsVideoPiP()) {
      try {
        // Create canvas once
        if (!canvasRef.current) {
          const canvas = document.createElement('canvas')
          canvas.width = CANVAS_W
          canvas.height = CANVAS_H
          canvasRef.current = canvas
        }

        // Create video once
        if (!videoRef.current) {
          const video = document.createElement('video')
          video.muted = true
          video.playsInline = true
          video.setAttribute('playsinline', '')
          video.addEventListener('leavepictureinpicture', () => {
            stopDrawing()
            setVideoPiP(false)
          })
          videoRef.current = video
        }

        // Start drawing to canvas
        startDrawing()

        // Feed canvas stream → video → PiP
        const stream = canvasRef.current.captureStream(30)
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        await videoRef.current.requestPictureInPicture()
        setVideoPiP(true)
        return
      } catch (err) {
        console.warn('Video PiP failed, falling back to floating widget:', err)
        stopDrawing()
        // fall through
      }
    }

    // Fallback: floating widget (within browser)
    setFloating(true)
  }, [videoPiP, floating, startDrawing, stopDrawing])

  // ─── Close ─────────────────────────────────────
  const closePiP = useCallback(() => {
    document.exitPictureInPicture().catch(() => {})
    stopDrawing()
    setVideoPiP(false)
    setFloating(false)
  }, [stopDrawing])

  // ─── Cleanup on unmount ────────────────────────
  useEffect(() => {
    return () => {
      stopDrawing()
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
