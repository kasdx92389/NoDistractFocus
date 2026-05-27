import { useState, useCallback } from 'react'

export function usePiP() {
  const [floating, setFloating] = useState(false)

  const openPiP = useCallback(() => {
    setFloating((prev) => !prev)
  }, [])

  const closePiP = useCallback(() => {
    setFloating(false)
  }, [])

  return {
    openPiP,
    closePiP,
    isPiP: floating,
    floating,
  }
}
