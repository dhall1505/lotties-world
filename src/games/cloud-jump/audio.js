// Tiny synthesized sound effects using the Web Audio API — same approach as
// Rainbow Road's audio.js, kept as a separate module so Cloud Jump has zero
// dependency on the other game.

let ctx = null
function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone({ freq = 440, duration = 0.15, type = 'sine', gain = 0.15, delay = 0, glideTo = null }) {
  const c = getCtx()
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  const t0 = c.currentTime + delay
  osc.frequency.setValueAtTime(freq, t0)
  if (glideTo) osc.frequency.linearRampToValueAtTime(glideTo, t0 + duration)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.05)
}

let enabled = true
export function setSoundEnabled(v) { enabled = v }
export function isSoundEnabled() { return enabled }

export function playBounce() {
  if (!enabled) return
  tone({ freq: 320, duration: 0.09, type: 'sine', gain: 0.1, glideTo: 480 })
}

export function playLand() {
  if (!enabled) return
  tone({ freq: 220, duration: 0.08, type: 'sine', gain: 0.08, glideTo: 160 })
}

export function playCollect() {
  if (!enabled) return
  tone({ freq: 900, duration: 0.09, type: 'triangle', gain: 0.12 })
  tone({ freq: 1300, duration: 0.12, type: 'triangle', gain: 0.1, delay: 0.06 })
}

export function playStreakBonus() {
  if (!enabled) return
  ;[880, 1108, 1320].forEach((f, i) => tone({ freq: f, duration: 0.12, type: 'triangle', gain: 0.1, delay: i * 0.08 }))
}

export function playCatHit() {
  if (!enabled) return
  tone({ freq: 500, duration: 0.16, type: 'square', gain: 0.1, glideTo: 260 })
  tone({ freq: 260, duration: 0.14, type: 'square', gain: 0.09, delay: 0.1 })
}

export function playRescue() {
  if (!enabled) return
  tone({ freq: 400, duration: 0.2, type: 'sine', gain: 0.12, glideTo: 900 })
  tone({ freq: 600, duration: 0.25, type: 'sine', gain: 0.1, delay: 0.12, glideTo: 1100 })
}

export function playHighScore() {
  if (!enabled) return
  ;[660, 880, 1108, 1320].forEach((f, i) => tone({ freq: f, duration: 0.16, type: 'triangle', gain: 0.13, delay: i * 0.11 }))
}

export function playGameOver() {
  if (!enabled) return
  tone({ freq: 380, duration: 0.3, type: 'sine', gain: 0.13, glideTo: 150 })
}

export function playButton() {
  if (!enabled) return
  tone({ freq: 700, duration: 0.06, type: 'triangle', gain: 0.08 })
}
