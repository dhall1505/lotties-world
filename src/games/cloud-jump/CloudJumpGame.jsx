import React, { useEffect, useRef, useState } from 'react'
import { playBounce, playCollect, playStreakBonus, playCatHit, playRescue, playHighScore, playGameOver } from './audio'

const BASE = import.meta.env.BASE_URL
const SPRITE_SRC = {
  rear: `${BASE}sprites-cj/rear.png`,
  cloud1: `${BASE}sprites-cj/cloud1.png`,
  cloud2: `${BASE}sprites-cj/cloud2.png`,
  cloud3: `${BASE}sprites-cj/cloud3.png`,
  cat: `${BASE}sprites-cj/cat.png`,
  cat1: `${BASE}sprites-cj/cat1.png`,
  cat2: `${BASE}sprites-cj/cat2.png`,
  cat3: `${BASE}sprites-cj/cat3.png`,
  cat4: `${BASE}sprites-cj/cat4.png`,
}
const CATERPILLAR_KEYS = ['cat1', 'cat2', 'cat3', 'cat4']
const CLOUD_KEYS = ['cloud1', 'cloud2', 'cloud3']

// --- physics tuning ---
const GRAVITY = 1300
const BOUNCE_VY = -950
const MAX_FALL_VY = 900
const H_ACCEL = 1600
const H_MAX_SPEED = 340
const H_RETAIN_PER_SEC = 0.25 // fraction of horizontal speed kept after 1s of no input — the "floaty" glide

const HEART_START = 3

function rand(min, max) { return Math.random() * (max - min) + min }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }
function rid() { return Math.random().toString(36).slice(2) }
function hash(n) {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function getDifficulty(score) {
  if (score < 300) return { gapMin: 70, gapMax: 120, maxDX: 100, movingChance: 0, catChance: 0, collectChance: 0.55 }
  if (score < 1200) return { gapMin: 100, gapMax: 170, maxDX: 140, movingChance: 0.15, catChance: 0.10, collectChance: 0.45 }
  return { gapMin: 130, gapMax: 220, maxDX: 175, movingChance: 0.28, catChance: 0.18, collectChance: 0.4 }
}

function useSprites() {
  const ref = useRef({})
  if (Object.keys(ref.current).length === 0) {
    for (const [k, src] of Object.entries(SPRITE_SRC)) {
      const img = new Image()
      img.src = src
      ref.current[k] = img
    }
  }
  return ref
}

export default function CloudJumpGame({ bestScore, onGameOver, paused, setPaused }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const sprites = useSprites()

  const state = useRef({
    elapsed: 0,
    camY: 0,
    char: { x: 0, y: 0, vx: 0, vy: 0, prevFootY: 0, invuln: 0 },
    platforms: [],
    nextPlatformY: 0,
    lastHadCat: false,
    lastLandedPlatform: null,
    hearts: HEART_START,
    maxClimb: 0,
    itemScore: 0,
    caterpillars: 0,
    landings: 0,
    streak: 0,
    rescueUsed: false,
    rescueMsgTimer: 0,
    particles: [],
    popups: [],
    over: false,
    started: false,
    hudTimer: 0,
  }).current

  const [hud, setHud] = useState({ hearts: HEART_START, score: 0, caterpillars: 0, streakMult: 1, rescueMsg: false })
  const rafRef = useRef(null)
  const lastTsRef = useRef(null)
  const pausedRef = useRef(paused)
  useEffect(() => { pausedRef.current = paused }, [paused])
  const sizeRef = useRef({ w: 400, h: 700, dpr: 1 })
  const inputRef = useRef({ pointerActive: false, targetX: null, keyLeft: false, keyRight: false })

  function currentScore() {
    return Math.floor(state.maxClimb / 8) + state.itemScore
  }

  function initGame(w, h) {
    state.started = true
    state.camY = 0
    state.char.x = w / 2
    state.char.y = h * 0.72
    state.char.vx = 0
    state.char.vy = BOUNCE_VY
    state.char.prevFootY = state.char.y
    const startPlatform = { id: rid(), x: w / 2, y: h * 0.82, type: 1, vx: 0, hasCollectible: false, hasCat: false, collected: false, squash: 0, wobble: rand(0, 10) }
    state.platforms = [startPlatform]
    state.nextPlatformY = startPlatform.y
    state.lastLandedPlatform = startPlatform
    generateAhead(w, h)
  }

  // --- input: unified pointer (touch/mouse/pen) drag-to-target + keyboard arrows ---
  useEffect(() => {
    const el = wrapRef.current
    function targetFromEvent(e) {
      const rect = el.getBoundingClientRect()
      inputRef.current.targetX = e.clientX - rect.left
    }
    function onPointerDown(e) { inputRef.current.pointerActive = true; targetFromEvent(e) }
    function onPointerMove(e) { if (inputRef.current.pointerActive) targetFromEvent(e) }
    function onPointerUp() { inputRef.current.pointerActive = false; inputRef.current.targetX = null }
    function onKeyDown(e) {
      if (e.key === 'ArrowLeft') inputRef.current.keyLeft = true
      if (e.key === 'ArrowRight') inputRef.current.keyRight = true
    }
    function onKeyUp(e) {
      if (e.key === 'ArrowLeft') inputRef.current.keyLeft = false
      if (e.key === 'ArrowRight') inputRef.current.keyRight = false
    }
    el?.addEventListener('pointerdown', onPointerDown)
    el?.addEventListener('pointermove', onPointerMove)
    el?.addEventListener('pointerup', onPointerUp)
    el?.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      el?.removeEventListener('pointerdown', onPointerDown)
      el?.removeEventListener('pointermove', onPointerMove)
      el?.removeEventListener('pointerup', onPointerUp)
      el?.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // --- pause automatically if tab loses focus ---
  useEffect(() => {
    function onVis() { if (document.hidden) setPaused(true) }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [setPaused])

  // --- canvas sizing ---
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
      if (!state.started) initGame(w, h)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  function endGame() {
    if (state.over) return
    state.over = true
    const finalScore = currentScore()
    const isNew = finalScore > bestScore
    if (isNew) playHighScore()
    else playGameOver()
    onGameOver({
      score: finalScore,
      caterpillars: state.caterpillars,
      height: Math.floor(state.maxClimb),
      landings: state.landings,
      isNewHighScore: isNew,
    })
  }

  // --- main loop ---
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

      if (!pausedRef.current && !state.over && state.started) update(dt, w, h)
      draw(ctx, w, h, dpr)
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ============================== UPDATE ==============================

  function update(dt, w, h) {
    state.elapsed += dt
    const char = state.char
    const platformWidth = w * 0.34
    const platformHeight = platformWidth * (466 / 700)
    const charWidth = w * 0.24
    const charHeight = charWidth * (1050 / 700)
    const charHalfW = charWidth * 0.26
    const charHalfH = charHeight * 0.32

    // --- horizontal input ---
    const input = inputRef.current
    if (input.pointerActive && input.targetX != null) {
      const dx = input.targetX - char.x
      if (Math.abs(dx) > 6) char.vx += Math.sign(dx) * H_ACCEL * dt
      else char.vx *= 0.8
    } else if (input.keyLeft && !input.keyRight) {
      char.vx -= H_ACCEL * dt
    } else if (input.keyRight && !input.keyLeft) {
      char.vx += H_ACCEL * dt
    } else {
      char.vx *= Math.pow(H_RETAIN_PER_SEC, dt)
    }
    char.vx = clamp(char.vx, -H_MAX_SPEED, H_MAX_SPEED)

    // --- vertical physics ---
    char.vy += GRAVITY * dt
    char.vy = Math.min(char.vy, MAX_FALL_VY)

    // move
    char.x += char.vx * dt
    char.y += char.vy * dt

    // soft walls
    if (char.x < charHalfW) { char.x = charHalfW; if (char.vx < 0) char.vx = 0 }
    if (char.x > w - charHalfW) { char.x = w - charHalfW; if (char.vx > 0) char.vx = 0 }

    if (char.invuln > 0) char.invuln = Math.max(0, char.invuln - dt)

    // --- moving platforms ---
    for (const p of state.platforms) {
      if (p.vx !== 0) {
        p.x += p.vx * dt
        const halfW = platformWidth * 0.42
        if (p.x < halfW + 16) { p.x = halfW + 16; p.vx *= -1 }
        if (p.x > w - halfW - 16) { p.x = w - halfW - 16; p.vx *= -1 }
      }
      if (p.squash > 0) p.squash = Math.max(0, p.squash - dt * 3.2)
    }

    // --- platform landing (only while falling) ---
    const footY = char.y + charHalfH
    if (char.vy > 0) {
      for (const p of state.platforms) {
        const landHalfW = platformWidth * 0.42
        const landY = p.y - platformHeight * 0.32
        if (char.prevFootY <= landY && footY >= landY && Math.abs(char.x - p.x) <= landHalfW) {
          char.y = landY - charHalfH
          char.vy = BOUNCE_VY
          p.squash = 1
          state.landings += 1
          state.lastLandedPlatform = p
          playBounce()
          spawnParticles('land', p.x, landY)
          if (p.hasCollectible && !p.collected) collectCaterpillar(p, platformHeight)
          break
        }
      }
    }
    char.prevFootY = footY

    // --- cat collisions (continuous, not just on landing) ---
    if (char.invuln <= 0) {
      for (const p of state.platforms) {
        if (!p.hasCat || p.catDefeated) continue
        const catX = p.x + p.catOffsetX
        const catY = p.y - platformHeight * 0.5
        const catHalfW = platformWidth * 0.5 * 0.28
        const catHalfH = platformWidth * 0.5 * 0.28
        if (Math.abs(char.x - catX) < charHalfW * 0.6 + catHalfW && Math.abs(char.y - catY) < charHalfH * 0.6 + catHalfH) {
          state.hearts -= 1
          char.invuln = 2.0
          char.vy = -400
          char.vx = (char.x < catX ? -220 : 220)
          state.streak = 0
          playCatHit()
          spawnParticles('poof', char.x, char.y)
          if (state.hearts <= 0) { endGame(); return }
          break
        }
      }
    }

    // --- height score ---
    if (!state.startY) state.startY = char.y
    const climb = state.startY - char.y
    if (climb > state.maxClimb) state.maxClimb = climb

    // --- camera follow ---
    const screenY = char.y - state.camY
    const threshold = h * 0.45
    if (screenY < threshold) state.camY = char.y - threshold

    // --- fall / rescue check ---
    const charScreenY = char.y - state.camY
    if (charScreenY > h + 150) {
      if (!state.rescueUsed) {
        state.rescueUsed = true
        const target = state.lastLandedPlatform || state.platforms[0]
        const platformHeight2 = platformWidth * (466 / 700)
        char.x = target.x
        char.y = target.y - platformHeight2 * 0.32 - charHalfH
        char.vy = BOUNCE_VY
        char.invuln = 2.0
        state.hearts -= 1
        state.rescueMsgTimer = 2.5
        playRescue()
        spawnParticles('rescue', char.x, char.y)
        if (state.hearts <= 0) { endGame(); return }
      } else {
        endGame()
        return
      }
    }

    // --- generate / cull platforms ---
    generateAhead(w, h)
    state.platforms = state.platforms.filter((p) => (p.y - state.camY) < h + 250)

    // --- particles & popups ---
    state.particles = state.particles.filter((pt) => {
      pt.life -= dt
      pt.x += pt.vx * dt
      pt.y += pt.vy * dt
      pt.vy += 120 * dt
      return pt.life > 0
    })
    state.popups = state.popups.filter((p) => (p.t -= dt) > 0)
    if (state.rescueMsgTimer > 0) state.rescueMsgTimer = Math.max(0, state.rescueMsgTimer - dt)

    // --- HUD throttle ---
    state.hudTimer -= dt
    if (state.hudTimer <= 0 || state.hearts <= 0) {
      state.hudTimer = 0.08
      setHud({
        hearts: state.hearts,
        score: currentScore(),
        caterpillars: state.caterpillars,
        streakMult: 1 + Math.floor(Math.min(state.streak, 15) / 3),
        rescueMsg: state.rescueMsgTimer > 0,
      })
    }
  }

  function collectCaterpillar(p, platformHeight) {
    p.collected = true
    state.caterpillars += 1
    state.streak += 1
    const mult = 1 + Math.floor(Math.min(state.streak, 15) / 3)
    let pts = 100 * mult
    let bonus = false
    if (state.caterpillars % 5 === 0) { pts += 250; bonus = true }
    state.itemScore += pts
    playCollect()
    if (mult > 1 || bonus) playStreakBonus()
    const py = p.y - platformHeight * 0.55
    spawnParticles('sparkle', p.x, py)
    state.popups.push({ x: p.x, y: py, t: 1, text: mult > 1 ? `+${pts} x${mult}` : `+${pts}` })
  }

  function spawnParticles(kind, x, y) {
    const configs = {
      land: { n: 5, spread: 60, speed: [30, 90], life: [0.3, 0.5], glyphs: ['·', '·', '✦'] },
      sparkle: { n: 8, spread: 40, speed: [50, 140], life: [0.4, 0.7], glyphs: ['✨', '⭐', '💫'] },
      poof: { n: 6, spread: 50, speed: [60, 150], life: [0.3, 0.5], glyphs: ['💫', '·'] },
      rescue: { n: 12, spread: 70, speed: [60, 170], life: [0.5, 0.9], glyphs: ['✨', '☁️', '💗'] },
      highscore: { n: 16, spread: 90, speed: [70, 200], life: [0.6, 1.1], glyphs: ['🎉', '✨', '⭐', '🌈'] },
    }
    const c = configs[kind]
    if (!c) return
    for (let i = 0; i < c.n; i++) {
      const angle = rand(0, Math.PI * 2)
      const speed = rand(c.speed[0], c.speed[1])
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: rand(c.life[0], c.life[1]),
        maxLife: c.life[1],
        glyph: pick(c.glyphs),
      })
    }
  }

  function generateAhead(w, h) {
    while (state.nextPlatformY > state.camY - h * 1.6) {
      const prevX = state.platforms.length ? state.platforms[state.platforms.length - 1].x : w / 2
      const diff = getDifficulty(currentScore())
      const gap = rand(diff.gapMin, diff.gapMax)
      const newY = state.nextPlatformY - gap
      const platformWidth = w * 0.34
      const halfW = platformWidth * 0.42
      let newX = prevX + rand(-diff.maxDX, diff.maxDX)
      newX = clamp(newX, halfW + 16, w - halfW - 16)
      const type = pick([1, 2, 3])
      const p = { id: rid(), x: newX, y: newY, type, vx: 0, hasCollectible: false, collectibleType: null, hasCat: false, catOffsetX: 0, collected: false, squash: 0, wobble: rand(0, 10) }
      if (diff.movingChance > 0 && Math.random() < diff.movingChance) {
        p.vx = (Math.random() < 0.5 ? -1 : 1) * rand(30, 65)
      }
      if (Math.random() < diff.collectChance) {
        p.hasCollectible = true
        p.collectibleType = pick(CATERPILLAR_KEYS)
      }
      if (diff.catChance > 0 && !state.lastHadCat && state.platforms.length > 5 && Math.random() < diff.catChance) {
        p.hasCat = true
        p.catOffsetX = (Math.random() < 0.5 ? -1 : 1) * rand(platformWidth * 0.14, platformWidth * 0.26)
        state.lastHadCat = true
      } else {
        state.lastHadCat = false
      }
      state.platforms.push(p)
      state.nextPlatformY = newY
    }
  }

  // ============================== DRAW ==============================

  function draw(ctx, w, h, dpr) {
    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    drawSky(ctx, w, h)
    drawDecor(ctx, w, h)
    drawPlatforms(ctx, w, h)
    drawCharacter(ctx, w, h)
    drawParticles(ctx)
    drawPopups(ctx)

    ctx.restore()
  }

  function drawSky(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#bfe8ff')
    g.addColorStop(0.55, '#ecf6ff')
    g.addColorStop(1, '#ffe3f2')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }

  function drawDecor(ctx, w, h) {
    const camY = state.camY
    // distant soft blobs
    drawDecorLayer(ctx, w, h, camY, 0.15, 260, 1, (x, y, r) => {
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.beginPath()
      ctx.arc(x, y, 26 + r * 20, 0, Math.PI * 2)
      ctx.arc(x + 28 + r * 10, y + 6, 20 + r * 14, 0, Math.PI * 2)
      ctx.arc(x - 26 - r * 10, y + 6, 18 + r * 12, 0, Math.PI * 2)
      ctx.fill()
    })
    // rainbows (rare, large)
    drawDecorLayer(ctx, w, h, camY, 0.08, 900, 7, (x, y, r) => {
      ctx.save()
      ctx.globalAlpha = 0.35
      const colors = ['#ff9fd0', '#ffd39f', '#fff6a8', '#b8f0c2', '#a8d8ff', '#d3b8ff']
      for (let i = 0; i < colors.length; i++) {
        ctx.strokeStyle = colors[i]
        ctx.lineWidth = 7
        ctx.beginPath()
        ctx.arc(x, y + 60, 70 - i * 9, Math.PI, 0)
        ctx.stroke()
      }
      ctx.restore()
    })
    // sparkles
    drawDecorLayer(ctx, w, h, camY, 0.35, 100, 3, (x, y, r) => {
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(state.elapsed * 3 + r * 10))
      ctx.globalAlpha = 0.4 * tw
      ctx.fillStyle = '#ffffff'
      ctx.font = `${8 + r * 8}px serif`
      ctx.textAlign = 'center'
      ctx.fillText('✦', x, y)
      ctx.globalAlpha = 1
    })
    // floating hearts
    drawDecorLayer(ctx, w, h, camY, 0.5, 220, 42, (x, y, r) => {
      ctx.globalAlpha = 0.35
      ctx.font = `${12 + r * 10}px serif`
      ctx.textAlign = 'center'
      ctx.fillText('💗', x + Math.sin(state.elapsed * 1.5 + r * 6) * 10, y)
      ctx.globalAlpha = 1
    })
  }

  function drawDecorLayer(ctx, w, h, camY, factor, period, seedBase, drawFn) {
    const camP = camY * factor
    const topWorld = camP - 100
    const bottomWorld = camP + h + 100
    const startIndex = Math.floor(topWorld / period)
    const endIndex = Math.ceil(bottomWorld / period)
    for (let i = startIndex; i <= endIndex; i++) {
      const r1 = hash(seedBase + i)
      const r2 = hash(seedBase + i + 0.37)
      const worldY = i * period + r1 * period * 0.6
      const screenY = worldY - camP
      const x = 20 + r2 * (w - 40)
      drawFn(x, screenY, r1)
    }
  }

  function drawPlatforms(ctx, w, h) {
    const platformWidth = w * 0.34
    const platformHeight = platformWidth * (466 / 700)
    const itemSize = platformWidth * 0.42
    const catSize = platformWidth * 0.56

    for (const p of state.platforms) {
      const screenY = p.y - state.camY
      if (screenY < -150 || screenY > h + 150) continue
      const bob = Math.sin(state.elapsed * 1.6 + p.wobble) * 4

      const img = sprites.current[CLOUD_KEYS[p.type - 1]]
      ctx.save()
      ctx.translate(p.x, screenY + bob + platformHeight * 0.5)
      const squashAmt = p.squash * 0.22
      ctx.scale(1 + squashAmt * 0.5, 1 - squashAmt)
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, -platformWidth / 2, -platformHeight, platformWidth, platformHeight)
      } else {
        ctx.fillStyle = '#ffd6ec'
        ctx.beginPath()
        ctx.ellipse(0, -platformHeight / 2, platformWidth / 2, platformHeight / 2, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()

      if (p.hasCat && !p.catDefeated) {
        const catImg = sprites.current.cat
        const catX = p.x + p.catOffsetX
        const catY = screenY + bob - platformHeight * 0.5
        const proximity = clamp(1 - Math.abs(state.char.y - p.y) / 260, 0, 1)
        const wiggle = Math.sin(state.elapsed * 15) * proximity * 0.18
        const idleSway = Math.sin(state.elapsed * 1.8 + p.wobble) * 0.06
        ctx.save()
        ctx.translate(catX, catY)
        ctx.rotate(wiggle + idleSway)
        if (catImg && catImg.complete && catImg.naturalWidth > 0) {
          ctx.drawImage(catImg, -catSize * 0.42, -catSize - 4, catSize * 0.84, catSize)
        }
        ctx.restore()
      }

      if (p.hasCollectible && !p.collected) {
        const cImg = sprites.current[p.collectibleType]
        const cx = p.x
        const cy = screenY + bob - platformHeight * 0.44
        const bobY = Math.sin(state.elapsed * 3 + p.wobble) * 5
        const rot = Math.sin(state.elapsed * 2 + p.wobble) * 0.12
        ctx.save()
        ctx.translate(cx, cy + bobY)
        ctx.rotate(rot)
        if (cImg && cImg.complete && cImg.naturalWidth > 0) {
          const ratio = cImg.naturalHeight / cImg.naturalWidth
          ctx.drawImage(cImg, -itemSize / 2, -itemSize * ratio / 2, itemSize, itemSize * ratio)
        }
        ctx.restore()
        // sparkle twinkle beside the collectible
        ctx.save()
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(state.elapsed * 5 + p.wobble)
        ctx.font = '12px serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = '#fff6c9'
        ctx.fillText('✦', cx + itemSize * 0.4, cy + bobY - itemSize * 0.25)
        ctx.restore()
      }
    }
  }

  function drawCharacter(ctx, w, h) {
    const char = state.char
    const screenY = char.y - state.camY
    const charWidth = w * 0.24
    const charHeight = charWidth * (1050 / 700)
    const tilt = clamp(-char.vx / H_MAX_SPEED, -1, 1) * 0.12
    const blink = char.invuln > 0 && Math.floor(char.invuln * 14) % 2 === 0

    ctx.save()
    ctx.globalAlpha = blink ? 0.4 : 1
    ctx.translate(char.x, screenY)
    ctx.rotate(tilt)

    // soft shadow
    ctx.globalAlpha *= 0.9
    ctx.fillStyle = 'rgba(0,0,0,0.12)'
    ctx.beginPath()
    ctx.ellipse(0, charHeight * 0.42, charWidth * 0.28, charWidth * 0.09, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = blink ? 0.4 : 1

    const img = sprites.current.rear
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -charWidth / 2, -charHeight / 2, charWidth, charHeight)
    } else {
      ctx.fillStyle = '#ffb3d9'
      ctx.beginPath()
      ctx.ellipse(0, 0, charWidth * 0.3, charHeight * 0.4, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  function drawParticles(ctx) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const pt of state.particles) {
      const screenY = pt.y - state.camY
      ctx.save()
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife)
      ctx.font = '14px serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(pt.glyph, pt.x, screenY)
      ctx.restore()
    }
  }

  function drawPopups(ctx) {
    ctx.textAlign = 'center'
    for (const p of state.popups) {
      const screenY = p.y - state.camY - (1 - p.t) * 26
      ctx.save()
      ctx.globalAlpha = Math.max(0, p.t)
      ctx.font = "800 14px 'Trebuchet MS', sans-serif"
      ctx.fillStyle = '#ff6fb0'
      ctx.fillText(p.text, p.x, screenY)
      ctx.restore()
    }
  }

  return (
    <div className="cj-game-wrap" ref={wrapRef}>
      <canvas ref={canvasRef} className="cj-canvas" />

      <div className="cj-hud-top">
        <div className="cj-hearts">
          {Array.from({ length: HEART_START }).map((_, i) => (
            <span key={i}>{i < hud.hearts ? '❤️' : '🤍'}</span>
          ))}
        </div>
        <div className="cj-score-pill">⭐ {hud.score}</div>
        <div className="cj-cat-pill">🐛 {hud.caterpillars}</div>
        <button className="cj-pause-btn" onClick={() => setPaused(true)} aria-label="Pause">⏸</button>
      </div>

      {hud.streakMult > 1 && (
        <div className="cj-streak-badge">🔥 x{hud.streakMult}</div>
      )}

      {hud.rescueMsg && (
        <div className="cj-rescue-banner">☁️ Cloud rescue!</div>
      )}
    </div>
  )
}
