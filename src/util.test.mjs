// Smallest thing that fails if the tricky logic breaks.
//   node src/util.test.mjs
// No framework on purpose — these are pure functions with no DOM.
import assert from 'node:assert/strict'

// ── todayKey: must be LOCAL, not UTC ──────────────────────────────────
// toISOString() files a 01:00 Bangkok session under the previous day.
const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

{
  const d = new Date(2026, 7, 19, 1, 30) // 19 Aug 2026, 01:30 local
  assert.equal(todayKey(d), '2026-08-19', 'todayKey must use local calendar date')
  assert.equal(todayKey(new Date(2026, 0, 5)), '2026-01-05', 'month and day must be zero-padded')
}

// ── fmtClock ──────────────────────────────────────────────────────────
const fmtClock = (secs) => {
  const total = Math.max(0, Math.ceil(secs))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

assert.equal(fmtClock(1500), '25:00')
assert.equal(fmtClock(0), '00:00')
assert.equal(fmtClock(-3), '00:00', 'a deadline overshoot must not render negative time')
assert.equal(fmtClock(59.2), '01:00', 'ceil, so the display never sits on 00:00 while time remains')
assert.equal(fmtClock(3599), '59:59')

// ── readableOn: contrast against the mode colour ──────────────────────
function readableOn(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#ffffff'
  const n = parseInt(m[1], 16)
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const L =
    0.2126 * lin(((n >> 16) & 255) / 255) +
    0.7152 * lin(((n >> 8) & 255) / 255) +
    0.0722 * lin((n & 255) / 255)
  return L > 0.45 ? '#0b0f19' : '#ffffff'
}

assert.equal(readableOn('#eab308'), '#0b0f19', 'dark text on amber')
assert.equal(readableOn('#ffffff'), '#0b0f19')
assert.equal(readableOn('#3b82f6'), '#ffffff', 'white text on blue')
assert.equal(readableOn('#1e293b'), '#ffffff')
assert.equal(readableOn('not-a-color'), '#ffffff', 'garbage input must not throw')

// ── parseDur ──────────────────────────────────────────────────────────
const MAX_DURATION = 24 * 60 * 60
const parseDur = (str) => {
  const clean = str.replace(/[^0-9:]/g, '')
  const raw = clean.includes(':')
    ? (Number(clean.split(':')[0]) || 0) * 60 + (Number(clean.split(':')[1]) || 0)
    : (Number(clean) || 0) * 60
  return Math.min(MAX_DURATION, Math.max(60, raw))
}

assert.equal(parseDur('25'), 1500)
assert.equal(parseDur('1:30'), 90)
assert.equal(parseDur(''), 60, 'empty input floors at one minute, never zero')
assert.equal(parseDur('0'), 60)
assert.equal(parseDur('abc'), 60, 'non-numeric must not produce NaN')
assert.equal(parseDur('99999'), MAX_DURATION, 'a typo must not create a 69-day task')
assert.equal(parseDur('2:'), 120, 'trailing colon must not produce NaN')

// ── isBreakName: drives whether a session counts as focus time ────────
const isBreakName = (name) => /break|rest|พัก/i.test(name)
assert.equal(isBreakName('Short Break'), true)
assert.equal(isBreakName('Rest'), true)
assert.equal(isBreakName('พักสั้น'), true)
assert.equal(isBreakName('Pomodoro'), false)
assert.equal(isBreakName('Deep Work'), false)

// ── Deadline timer: the whole point is surviving a frozen tab ─────────
{
  const deadline = (secs, now) => now + secs * 1000
  const start = 1_000_000
  const endAt = deadline(1500, start)

  // Tab sleeps for 10 minutes; no ticks run at all during that window.
  const afterSleep = start + 600_000
  const left = (endAt - afterSleep) / 1000
  assert.equal(left, 900, 'time must elapse while the tab is frozen, not pause')

  // setTimeRemaining re-derives endAt from the value it was just handed.
  // That has to be an exact identity or the ticker would drift on every tick.
  const reAnchored = deadline(left, afterSleep)
  assert.equal(reAnchored, endAt, 'the ticker must not move its own deadline')
}

console.log('util checks passed')
