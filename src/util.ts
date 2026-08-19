// ─── Shared tiny helpers ─────────────────────────

/** Local YYYY-MM-DD. toISOString() is UTC and files sessions under the wrong day east of Greenwich. */
export const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** mm:ss from seconds. */
export const fmtClock = (secs: number) => {
  const total = Math.max(0, Math.ceil(secs))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Black or white, whichever is readable on `hex`. WCAG relative luminance. */
export function readableOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#ffffff'
  const n = parseInt(m[1], 16)
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const L =
    0.2126 * lin((n >> 16 & 255) / 255) +
    0.7152 * lin((n >> 8 & 255) / 255) +
    0.0722 * lin((n & 255) / 255)
  return L > 0.45 ? '#0b0f19' : '#ffffff'
}

/** A break/rest mode or task shouldn't count toward focus minutes. */
export const isBreakName = (name: string) => /break|rest|พัก/i.test(name)

// ─── Audio ───────────────────────────────────────
// One shared AudioContext. Browsers cap concurrent contexts (~6) and start them
// suspended until a user gesture, so a per-alarm `new AudioContext()` goes silent
// on mobile and leaks on desktop.
let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx ??= new Ctor()
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
    return ctx
  } catch {
    return null
  }
}

/** Call from a real user gesture once so the alarm can sound later on mobile. */
export function unlockAudio() {
  const c = getCtx()
  if (c && c.state === 'suspended') void c.resume().catch(() => {})
}

/** Two-tone chime. volume 0..1. */
export function playChime(volume: number) {
  const c = getCtx()
  if (!c) return
  const now = c.currentTime
  const gain = c.createGain()
  gain.connect(c.destination)
  // Envelope instead of a hard start/stop — avoids the click a raw gate produces.
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.3), now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7)

  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.connect(gain)
  osc.frequency.setValueAtTime(830, now)
  for (const [t, f] of [[0.15, 1046], [0.3, 830], [0.45, 1046]] as const) {
    osc.frequency.setValueAtTime(f, now + t)
  }
  osc.start(now)
  osc.stop(now + 0.72)
  osc.onended = () => { gain.disconnect() }
}

/** Notification without the iOS/insecure-context ReferenceError. */
export function notify(title: string, body: string) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    new Notification(title, { body, tag: 'ndf-session', icon: '/icon.svg' })
  } catch { /* Notification unsupported in this context */ }
}
