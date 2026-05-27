import { useState, useCallback, useEffect } from 'react'
import { useStore } from '../store'

declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow(options?: { width?: number; height?: number; disallowReturnToOpener?: boolean }): Promise<Window>
      window: Window | null
    }
  }
}

export function usePiP() {
  const [pipWindow, setPipWindow] = useState<Window | null>(null)
  const [floating, setFloating] = useState(false)
  const darkMode = useStore((s) => s.settings.darkMode)
  const timerStatus = useStore((s) => s.timerStatus)

  const supportsDocPiP =
    typeof window !== 'undefined' && 'documentPictureInPicture' in window

  // Keep PiP window theme in sync with main app
  useEffect(() => {
    if (!pipWindow) return
    const theme = document.documentElement.getAttribute('data-theme')
    pipWindow.document.documentElement.setAttribute('data-theme', theme ?? 'light')
  }, [pipWindow, darkMode, timerStatus])

  const openPiP = useCallback(async () => {
    // Toggle off if already open
    if (pipWindow) {
      pipWindow.close()
      setPipWindow(null)
      return
    }
    if (floating) {
      setFloating(false)
      return
    }

    if (supportsDocPiP) {
      try {
        const pip = await window.documentPictureInPicture!.requestWindow({
          width: 300,
          height: 200,
          disallowReturnToOpener: false,
        })

        // Copy inline <style> tags (Tailwind + CSS vars)
        document.querySelectorAll('style').forEach((style) => {
          const el = pip.document.createElement('style')
          el.textContent = style.textContent
          pip.document.head.appendChild(el)
        })

        // Copy <link rel="stylesheet"> (Google Fonts etc.)
        document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
          const el = pip.document.createElement('link')
          el.rel = 'stylesheet'
          el.href = (link as HTMLLinkElement).href
          pip.document.head.appendChild(el)
        })

        // Set theme
        const theme = document.documentElement.getAttribute('data-theme')
        pip.document.documentElement.setAttribute('data-theme', theme ?? 'light')
        pip.document.documentElement.style.height = '100%'
        pip.document.body.style.margin = '0'
        pip.document.body.style.height = '100%'

        pip.addEventListener('pagehide', () => setPipWindow(null))
        setPipWindow(pip)
        return
      } catch {
        // API unavailable or user rejected — fall through to floating
      }
    }

    // Fallback: floating widget (mobile or unsupported browsers)
    setFloating(true)
  }, [supportsDocPiP, pipWindow, floating])

  const closePiP = useCallback(() => {
    if (pipWindow) {
      pipWindow.close()
      setPipWindow(null)
    }
    setFloating(false)
  }, [pipWindow])

  return {
    openPiP,
    closePiP,
    isPiP: !!pipWindow || floating,
    pipWindow,
    floating,
  }
}
