// Tiny synthesized sound effects using the Web Audio API.
// No external audio files needed — everything is generated on the fly,
// so the game has zero binary assets to manage in git.

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

export function playCollect() {
  if (!enabled) return
  tone({ freq: 880, duration: 0.09, type: 'triangle', gain: 0.12 })
  tone({ freq: 1320, duration: 0.12, type: 'triangle', gain: 0.1, delay: 0.06 })
}

export function playCoin() {
  if (!enabled) return
  tone({ freq: 1046, duration: 0.08, type: 'square', gain: 0.08 })
  tone({ freq: 1568, duration: 0.1, type: 'square', gain: 0.07, delay: 0.05 })
}

export function playHit() {
  if (!enabled) return
  tone({ freq: 180, duration: 0.22, type: 'sine', gain: 0.16, glideTo: 90 })
}

export function playShield() {
  if (!enabled) return
  tone({ freq: 500, duration: 0.18, type: 'sine', gain: 0.12, glideTo: 900 })
}

export function playPoo() {
  if (!enabled) return
  tone({ freq: 300, duration: 0.12, type: 'sawtooth', gain: 0.1, glideTo: 120 })
  tone({ freq: 260, duration: 0.12, type: 'sawtooth', gain: 0.1, delay: 0.1, glideTo: 90 })
  tone({ freq: 220, duration: 0.15, type: 'sawtooth', gain: 0.1, delay: 0.2, glideTo: 60 })
}

export function playHighScore() {
  if (!enabled) return
  ;[660, 880, 1108, 1320].forEach((f, i) => tone({ freq: f, duration: 0.16, type: 'triangle', gain: 0.13, delay: i * 0.11 }))
}

export function playGameOver() {
  if (!enabled) return
  tone({ freq: 400, duration: 0.3, type: 'sine', gain: 0.14, glideTo: 150 })
}

export function playMilestone() {
  if (!enabled) return
  tone({ freq: 740, duration: 0.1, type: 'triangle', gain: 0.11 })
  tone({ freq: 988, duration: 0.14, type: 'triangle', gain: 0.1, delay: 0.08 })
}

export function playHeal() {
  if (!enabled) return
  tone({ freq: 520, duration: 0.14, type: 'sine', gain: 0.12, glideTo: 780 })
  tone({ freq: 780, duration: 0.18, type: 'sine', gain: 0.1, delay: 0.1 })
}

export function playNearMiss() {
  if (!enabled) return
  tone({ freq: 900, duration: 0.06, type: 'sine', gain: 0.06 })
}
