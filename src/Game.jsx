import React, { useEffect, useRef, useState, useCallback } from 'react'
import { playCollect, playCoin, playHit, playShield, playPoo, playHighScore, playGameOver } from './audio'

const LANES = 3
const HEART_START = 3
const SHIELD_DURATION = 6 // seconds

// --- perspective road geometry (measured from public/sprites/road.png) ---
// u = 0 at the horizon (far away, tiny), u = 1 at the player (close, full size)
const VANISH_X = 0.5      // horizon vanishing point, fraction of canvas width
const HORIZON_Y = 0.17     // horizon line, fraction of canvas height
const PLAYER_Y = 0.82      // where the player sits, fraction of canvas height
const ROAD_BOTTOM_LEFT = 0.05
const ROAD_BOTTOM_RIGHT = 0.95
const DEPTH_POW = 1.7      // >1 = spends longer small/far, grows fast near the player (real perspective feel)

function laneBottomFrac(laneIdx) {
  return ROAD_BOTTOM_LEFT + (ROAD_BOTTOM_RIGHT - ROAD_BOTTOM_LEFT) * ((laneIdx + 0.5) / LANES)
}

// f: 0 = left road edge, 1 = right road edge (for placing lane-divider marks, not just lane centers)
function lateralBottomFrac(f) {
  return ROAD_BOTTOM_LEFT + (ROAD_BOTTOM_RIGHT - ROAD_BOTTOM_LEFT) * f
}

function depthEase(u) {
  return Math.pow(Math.max(0, Math.min(1, u)), DEPTH_POW)
}

// screen position + scale (0..1, 1 = full size at the player) for a given lateral fraction + depth u
function perspectiveAtFrac(w, h, f, u) {
  const uu = depthEase(u)
  const xFrac = VANISH_X + (lateralBottomFrac(f) - VANISH_X) * uu
  const yFrac = HORIZON_Y + (PLAYER_Y - HORIZON_Y) * uu
  const scale = 0.08 + 0.92 * uu
  return { x: xFrac * w, y: yFrac * h, scale }
}

// screen position + scale (0..1, 1 = full size at the player) for a given lane + depth u
function perspectiveAt(w, h, lane, u) {
  return perspectiveAtFrac(w, h, (lane + 0.5) / LANES, u)
}

const BASE = import.meta.env.BASE_URL
const SPRITE_SRC = {
  road: `${BASE}sprites/road.png`,
  car: `${BASE}sprites/car.png`,
  coin: `${BASE}sprites/coin.png`,
  football: `${BASE}sprites/football.png`,
  shell: `${BASE}sprites/shell.png`,
  bunny: `${BASE}sprites/bunny.png`,
  poo: `${BASE}sprites/poo.png`,
  heart: `${BASE}sprites/heart.png`,
}

const COLLECTIBLES = [
  { key: 'treat', kind: 'emoji', emoji: '🦴', points: 10, baseSize: 40 },
  { key: 'shell', kind: 'sprite', sprite: 'shell', points: 10, baseSize: 60 },
  { key: 'heartgift', kind: 'sprite', sprite: 'heart', points: 15, baseSize: 54 },
  { key: 'choc', kind: 'emoji', emoji: '🍫', points: 15, baseSize: 40 },
  { key: 'sweet', kind: 'emoji', emoji: '🍬', points: 10, baseSize: 40 },
]
const COIN_DATA = { key: 'coin', kind: 'sprite', sprite: 'coin', points: 5, isCoin: true, baseSize: 48 }
const OBSTACLES = [
  { key: 'football', kind: 'sprite', sprite: 'football', baseSize: 68, bouncy: true },
  { key: 'cheese', kind: 'emoji', emoji: '🧀', baseSize: 46, outline: true },
  { key: 'sour', kind: 'emoji', emoji: '🍋', baseSize: 44, outline: true },
]
const POWERUPS = [
  { key: 'shield', kind: 'sprite', sprite: 'bunny', baseSize: 62 },
  { key: 'poo', kind: 'sprite', sprite: 'poo', baseSize: 62 },
]

function rand(min, max) { return Math.random() * (max - min) + min }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function lerp(a, b, t) { return a + (b - a) * t }

function useSprites() {
  const ref = useRef({})
  if (Object.keys(ref.current).length === 0) {
    for (const [key, src] of Object.entries(SPRITE_SRC)) {
      const img = new Image()
      img.src = src
      ref.current[key] = img
    }
  }
  return ref
}

export default function Game({ highScore, onGameOver, paused, setPaused }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const sprites = useSprites()

  const state = useRef({
    lane: 1,
    laneX: 1,
    travelTime: 2.15, // seconds for a new entity to travel from horizon to player
    elapsed: 0,
    entities: [],
    spawnTimer: 0,
    spawnInterval: 0.85,
    powerupCooldown: 4,
    hearts: HEART_START,
    coins: 0,
    score: 0,
    shieldTime: 0,
    invuln: 0,
    poofs: [],
    over: false,
    hudTimer: 0,
    introTimer: 4.5,
  }).current

  const [hud, setHud] = useState({ hearts: HEART_START, coins: 0, score: 0, shieldTime: 0, intro: true })
  const rafRef = useRef(null)
  const lastTsRef = useRef(null)
  const pausedRef = useRef(paused)
  useEffect(() => { pausedRef.current = paused }, [paused])

  const sizeRef = useRef({ w: 400, h: 700, dpr: 1 })

  const moveLane = useCallback((dir) => {
    if (state.over) return
    state.lane = Math.max(0, Math.min(LANES - 1, state.lane + dir))
  }, [])

  useEffect(() => {
    let touchStartX = null
    const el = wrapRef.current
    function onTouchStart(e) { touchStartX = e.touches[0].clientX }
    function onTouchEnd(e) {
      if (touchStartX == null) return
      const dx = e.changedTouches[0].clientX - touchStartX
      if (Math.abs(dx) > 30) moveLane(dx > 0 ? 1 : -1)
      touchStartX = null
    }
    function onKey(e) {
      if (e.key === 'ArrowLeft') moveLane(-1)
      if (e.key === 'ArrowRight') moveLane(1)
    }
    el?.addEventListener('touchstart', onTouchStart, { passive: true })
    el?.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      el?.removeEventListener('touchstart', onTouchStart)
      el?.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKey)
    }
  }, [moveLane])

  useEffect(() => {
    function resize() {
      const wrap = wrapRef.current
      const canvas = canvasRef.current
      if (!wrap || !canvas) return
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      sizeRef.current = { w, h, dpr }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  function endGame() {
    if (state.over) return
    state.over = true
    const isNew = state.score > highScore
    if (isNew) playHighScore()
    else playGameOver()
    onGameOver({ score: Math.round(state.score), coins: state.coins, isNewHighScore: isNew })
  }

  useEffect(() => {
    function frame(ts) {
      rafRef.current = requestAnimationFrame(frame)
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const { w, h, dpr } = sizeRef.current
      if (lastTsRef.current == null) lastTsRef.current = ts
      let dt = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts
      dt = Math.min(dt, 0.05)

      if (!pausedRef.current && !state.over) update(dt, w, h)
      draw(ctx, w, h, dpr)
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function update(dt, w, h) {
    state.elapsed += dt
    state.travelTime = Math.max(1.0, 2.15 - state.elapsed * 0.012)
    state.spawnInterval = Math.max(0.42, 0.85 - state.elapsed * 0.006)

    state.laneX += (state.lane - state.laneX) * Math.min(dt * 10, 1)
    state.score += dt * (1 / state.travelTime) * 26

    if (state.shieldTime > 0) state.shieldTime = Math.max(0, state.shieldTime - dt)
    if (state.invuln > 0) state.invuln = Math.max(0, state.invuln - dt)
    if (state.introTimer > 0) state.introTimer = Math.max(0, state.introTimer - dt)
    state.powerupCooldown = Math.max(0, state.powerupCooldown - dt)

    state.spawnTimer -= dt
    if (state.spawnTimer <= 0) {
      state.spawnTimer = state.spawnInterval
      spawnEntity()
    }

    for (const e of state.entities) {
      if (!e.resolved) e.u += dt / state.travelTime
    }

    for (const e of state.entities) {
      if (e.resolved) continue
      if (e.lane === state.lane && e.u >= 0.93) {
        resolveEntity(e)
      } else if (e.u >= 1.04) {
        // reached/passed the player without matching lane — missed, not collected.
        // fade it out immediately instead of letting it linger at full size.
        e.resolved = true
        e.missed = true
      }
    }

    state.entities = state.entities.filter((e) => e.u < 1.5 && !(e.resolved && e.fade <= 0))
    for (const e of state.entities) {
      if (e.resolved) e.fade -= dt * (e.missed ? 5 : 3)
    }

    state.poofs = state.poofs.filter((p) => (p.t -= dt) > 0)

    if (state.hearts <= 0) endGame()

    state.hudTimer -= dt
    if (state.hudTimer <= 0 || state.hearts <= 0) {
      state.hudTimer = 0.08
      setHud({ hearts: state.hearts, coins: state.coins, score: Math.round(state.score), shieldTime: state.shieldTime, intro: state.introTimer > 0 })
    }
  }

  function spawnEntity() {
    const lane = Math.floor(rand(0, LANES))
    let type, data
    const canPowerup = state.powerupCooldown <= 0
    const roll = Math.random()
    if (canPowerup && roll < 0.07) {
      type = 'powerup'
      data = pick(POWERUPS)
      state.powerupCooldown = rand(11, 16)
    } else if (roll < 0.30) {
      type = 'obstacle'
      data = pick(OBSTACLES)
    } else {
      type = 'collectible'
      data = Math.random() < 0.45 ? COIN_DATA : pick(COLLECTIBLES)
    }
    const entity = { id: Math.random().toString(36).slice(2), type, data, lane, u: 0, resolved: false, fade: 1 }
    if (data.bouncy) entity.bounce = { phase: rand(0, Math.PI * 2), rate: rand(4.2, 6), amp: rand(0.28, 0.4), spin: rand(-3, 3) }
    state.entities.push(entity)
  }

  function resolveEntity(e) {
    e.resolved = true
    if (e.type === 'collectible') {
      state.score += e.data.points
      if (e.data.isCoin) state.coins += 1
      playCollect()
      if (e.data.isCoin) playCoin()
    } else if (e.type === 'powerup') {
      if (e.data.key === 'shield') {
        state.shieldTime = SHIELD_DURATION
        playShield()
      } else if (e.data.key === 'poo') {
        playPoo()
        const { w, h } = sizeRef.current
        for (const other of state.entities) {
          if (other.type === 'obstacle' && !other.resolved) {
            other.resolved = true
            const p = perspectiveAt(w, h, other.lane, other.u)
            state.poofs.push({ x: p.x, y: p.y, t: 0.5 })
          }
        }
      }
    } else if (e.type === 'obstacle') {
      if (state.shieldTime > 0) {
        state.shieldTime = 0
        playShield()
      } else if (state.invuln <= 0) {
        state.hearts -= 1
        state.invuln = 1.1
        playHit()
      }
    }
  }

  // --- drawing ---
  function draw(ctx, w, h, dpr) {
    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    drawRoad(ctx, w, h)
    drawScrollingLaneMarks(ctx, w, h)
    drawEntities(ctx, w, h)
    drawPoofs(ctx, w, h)
    drawPlayer(ctx, w, h)

    ctx.restore()
  }

  function drawRoad(ctx, w, h) {
    const img = sprites.current.road
    if (!img || !img.complete || img.naturalWidth === 0) {
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, '#aee9ff')
      g.addColorStop(1, '#ffd6ec')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      return
    }

    // A single painted scene can't be scrolled like a tileable texture, but it
    // CAN be zoomed continuously toward the vanishing point — everything
    // (lighthouse, rocks, shells, sunflowers) visibly grows/approaches, which
    // reads as forward motion. Two layers, offset by half a cycle and
    // cross-faded, hide the moment each one resets back to its starting size.
    const cycle = 3.4 * state.travelTime // seconds per loop — speeds up with difficulty
    const zoomMax = 2.6
    const vpx = VANISH_X * w
    const vpy = HORIZON_Y * h

    const drawLayer = (phaseOffset) => {
      const t = (((state.elapsed + phaseOffset) % cycle) / cycle) // 0..1
      const scale = 1 + t * (zoomMax - 1)
      // fully opaque through the middle, fades in/out only at the very ends
      const fade = Math.min(1, t / 0.15, (1 - t) / 0.15)
      if (fade <= 0.001) return
      ctx.save()
      ctx.globalAlpha = fade
      ctx.translate(vpx, vpy)
      ctx.scale(scale, scale)
      ctx.translate(-vpx, -vpy)
      ctx.drawImage(img, 0, 0, w, h)
      ctx.restore()
    }

    drawLayer(0)
    drawLayer(cycle / 2)
  }

  // Animated dashes that stream from the horizon toward the player along the
  // road's actual perspective lines — this is the main "we are moving" cue,
  // since the painted background art itself has to stay still (it's a single
  // static image, not a tileable strip).
  function drawScrollingLaneMarks(ctx, w, h) {
    const scrollSpeed = 1.6 / state.travelTime // loops per second — fast and obvious
    const dashesPerLine = 10
    const boundaries = [1 / LANES, 2 / LANES] // the two lane-divider lines

    ctx.save()
    for (const f of boundaries) {
      for (let k = 0; k < dashesPerLine; k++) {
        const u = ((state.elapsed * scrollSpeed) + k / dashesPerLine) % 1
        const p0 = perspectiveAtFrac(w, h, f, u)
        const p1 = perspectiveAtFrac(w, h, f, Math.min(1, u + 0.045))
        const dashW = Math.max(2.5, 9 * p0.scale)
        const dashLen = Math.max(4, Math.hypot(p1.x - p0.x, p1.y - p0.y) * 1.6)
        const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x)

        ctx.save()
        ctx.translate((p0.x + p1.x) / 2, (p0.y + p1.y) / 2)
        ctx.rotate(angle)
        ctx.globalAlpha = 0.6 + 0.4 * p0.scale
        ctx.fillStyle = '#ffffff'
        ctx.shadowColor = 'rgba(255,255,255,0.9)'
        ctx.shadowBlur = 4 * p0.scale
        roundRect(ctx, -dashLen / 2, -dashW / 2, dashLen, dashW, dashW / 2)
        ctx.fill()
        ctx.restore()
      }
    }
    ctx.restore()

    drawSpeedSparkles(ctx, w, h)
  }

  // A light scattering of sparkles along the road edges — kept out of the
  // lanes themselves so it never competes with what you actually need to see.
  function drawSpeedSparkles(ctx, w, h) {
    const scrollSpeed = 1.1 / state.travelTime
    const count = 10
    ctx.save()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let k = 0; k < count; k++) {
      const rnd = Math.abs(Math.sin(k * 12.9898) * 43758.5453) % 1
      const rnd2 = Math.abs(Math.sin(k * 78.233) * 12543.123) % 1
      // stay near the road edges (outside the 3 lanes), never in the play area
      const f = k % 2 === 0 ? rnd * 0.14 : 0.86 + rnd * 0.14
      const u = ((state.elapsed * scrollSpeed) + rnd2) % 1
      if (u < 0.08) continue
      const p = perspectiveAtFrac(w, h, f, u)
      const twinkle = 0.5 + 0.5 * Math.sin(state.elapsed * 5 + k)
      ctx.globalAlpha = (0.15 + 0.3 * p.scale) * (0.5 + 0.5 * twinkle)
      ctx.font = `${6 + 9 * p.scale}px serif`
      ctx.fillText('✦', p.x, p.y)
    }
    ctx.restore()
  }


  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  function drawEntities(ctx, w, h) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // draw far-to-near so closer items overlap farther ones correctly
    const sorted = [...state.entities].sort((a, b) => a.u - b.u)
    for (const e of sorted) {
      const p = perspectiveAt(w, h, e.lane, e.u)
      const fadeMul = e.resolved ? Math.max(0, e.fade) : 1
      const popScale = (e.resolved && !e.missed) ? 1 + (1 - Math.max(0, e.fade)) * 0.6 : 1
      const size = e.data.baseSize * p.scale * popScale

      ctx.save()
      ctx.globalAlpha = fadeMul

      if (e.type === 'obstacle' && e.data.bouncy) {
        drawBouncySprite(ctx, sprites.current[e.data.sprite], p.x, p.y, size, e)
        ctx.restore()
        continue
      }

      // grounding shadow, scaled with distance
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.beginPath()
      ctx.ellipse(p.x, p.y + size * 0.34, size * 0.42, size * 0.14, 0, 0, Math.PI * 2)
      ctx.fill()

      if (e.type === 'powerup' && !e.resolved) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.beginPath(); ctx.arc(p.x, p.y, size * 0.78, 0, Math.PI * 2); ctx.fill()
      }

      // obstacles that are easy to lose against the rainbow road get a dark
      // warning badge behind them — strong contrast against any hue, and
      // reads as "danger" rather than "look, a highlight" like a white disc did
      if (e.data.outline && !e.resolved) {
        ctx.fillStyle = 'rgba(120,20,20,0.5)'
        ctx.beginPath(); ctx.arc(p.x, p.y, size * 0.66, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = 'rgba(255,200,180,0.55)'
        ctx.lineWidth = Math.max(1, size * 0.03)
        ctx.beginPath(); ctx.arc(p.x, p.y, size * 0.66, 0, Math.PI * 2); ctx.stroke()
      }

      if (e.data.kind === 'sprite') {
        drawSprite(ctx, sprites.current[e.data.sprite], p.x, p.y, size)
      } else {
        ctx.font = `${size}px serif`
        ctx.globalAlpha = fadeMul * 0.35
        ctx.fillText(e.data.emoji, p.x + size * 0.06, p.y + size * 0.08)
        ctx.globalAlpha = fadeMul
        ctx.fillText(e.data.emoji, p.x, p.y)
      }
      ctx.restore()
    }
  }

  function drawSprite(ctx, img, x, y, targetWidth) {
    if (!img || !img.complete || img.naturalWidth === 0) return
    const ratio = img.naturalHeight / img.naturalWidth
    const width = targetWidth
    const height = width * ratio
    ctx.drawImage(img, x - width / 2, y - height / 2, width, height)
  }

  function drawBouncySprite(ctx, img, groundX, groundY, size, e) {
    const b = e.bounce
    const bounceT = e.resolved ? 0 : Math.abs(Math.sin(state.elapsed * b.rate + b.phase))
    const lift = bounceT * size * b.amp
    const squash = e.resolved ? 1 : 1 - bounceT * 0.16

    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.beginPath()
    ctx.ellipse(groundX, groundY + size * 0.32, size * 0.4 * (1 - bounceT * 0.4), size * 0.13 * (1 - bounceT * 0.4), 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.save()
    ctx.translate(groundX, groundY - lift)
    ctx.rotate(state.elapsed * b.spin * 0.4)
    ctx.scale(1, squash)
    drawSprite(ctx, img, 0, 0, size)
    ctx.restore()
  }

  function drawPoofs(ctx, w, h) {
    for (const p of state.poofs) {
      ctx.save()
      ctx.globalAlpha = Math.max(0, p.t / 0.5)
      ctx.font = `${26 + (0.5 - p.t) * 30}px serif`
      ctx.textAlign = 'center'
      ctx.fillText('✨', p.x, p.y)
      ctx.restore()
    }
  }

  function drawPlayer(ctx, w, h) {
    const p = perspectiveAt(w, h, state.laneX, 1)
    const x = p.x, y = h * PLAYER_Y
    const blink = state.invuln > 0 && Math.floor(state.invuln * 12) % 2 === 0
    const bob = Math.sin(state.elapsed * 6) * 2.2
    const laneVel = state.lane - state.laneX
    const tilt = Math.max(-0.14, Math.min(0.14, -laneVel * 0.9))

    const carImg = sprites.current.car
    const carAspect = (carImg && carImg.naturalWidth) ? carImg.naturalHeight / carImg.naturalWidth : 0.75
    const carWidth = w * 0.36
    const carHeight = carWidth * carAspect

    ctx.save()
    if (blink) ctx.globalAlpha = 0.4

    // ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.24)'
    ctx.beginPath()
    ctx.ellipse(x, y + carHeight * 0.42, carWidth * 0.42, carWidth * 0.1, 0, 0, Math.PI * 2)
    ctx.fill()

    if (state.shieldTime > 0) {
      ctx.save()
      ctx.globalAlpha = 0.3 + Math.sin(state.elapsed * 8) * 0.1
      const shieldG = ctx.createRadialGradient(x, y, carWidth * 0.1, x, y, carWidth * 0.65)
      shieldG.addColorStop(0, 'rgba(255,159,214,0.05)')
      shieldG.addColorStop(1, 'rgba(255,159,214,0.55)')
      ctx.fillStyle = shieldG
      ctx.beginPath()
      ctx.arc(x, y + bob, carWidth * 0.62, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    ctx.translate(x, y + bob)
    ctx.rotate(tilt)

    // motion streaks trailing toward the horizon — reinforces forward speed
    // even though the painted background itself can't visibly scroll
    const speedFactor = Math.min(1, (2.15 - state.travelTime) / 1.15) // 0 at game start, 1 at max speed
    ctx.save()
    ctx.globalAlpha = 0.22 + speedFactor * 0.28
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineCap = 'round'
    for (const off of [-carWidth * 0.28, 0, carWidth * 0.28]) {
      const phase = (state.elapsed * 3.5 + off) % 1
      const len = carHeight * (0.35 + speedFactor * 0.35)
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(off, -carHeight * 0.15 - phase * 6)
      ctx.lineTo(off, -carHeight * 0.15 - phase * 6 - len)
      ctx.stroke()
    }
    ctx.restore()

    if (carImg && carImg.complete && carImg.naturalWidth > 0) {
      ctx.drawImage(carImg, -carWidth / 2, -carHeight / 2, carWidth, carHeight)
    } else {
      // simple placeholder while the sprite loads
      ctx.fillStyle = '#ff6fb0'
      ctx.beginPath()
      ctx.roundRect ? ctx.roundRect(-carWidth / 2, -carHeight / 3, carWidth, carHeight / 1.6, 20) : ctx.rect(-carWidth / 2, -carHeight / 3, carWidth, carHeight / 1.6)
      ctx.fill()
    }

    ctx.restore()
  }

  return (
    <div className="game-wrap" ref={wrapRef}>
      <canvas ref={canvasRef} className="game-canvas" />

      <div className="hud-top">
        <div className="hearts">
          {Array.from({ length: HEART_START }).map((_, i) => (
            <span key={i} className={i < hud.hearts ? 'heart on' : 'heart off'}>
              {i < hud.hearts ? '❤️' : '🤍'}
            </span>
          ))}
        </div>
        <div className="score-pill">⭐ {hud.score}</div>
        <div className="coin-pill">🪙 {hud.coins}</div>
        <button className="pause-btn" onClick={() => setPaused(true)} aria-label="Pause">
          ⏸
        </button>
      </div>

      {hud.shieldTime > 0 && (
        <div className="shield-badge">🐰 Shield {Math.ceil(hud.shieldTime)}s</div>
      )}

      {hud.intro && (
        <div className="intro-banner">
          <div>🪙 🐚 💖 🍫 🍬 — collect these!</div>
          <div>⚽ 🧀 🍋 — dodge these!</div>
        </div>
      )}

      <div className="lane-buttons">
        <button className="lane-btn" onClick={() => moveLane(-1)} aria-label="Move left">◀</button>
        <button className="lane-btn" onClick={() => moveLane(1)} aria-label="Move right">▶</button>
      </div>
    </div>
  )
}
