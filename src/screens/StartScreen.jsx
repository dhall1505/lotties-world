import React from 'react'
import { isSoundEnabled, setSoundEnabled } from '../audio'

const BASE = import.meta.env.BASE_URL

export default function StartScreen({ highScore, onPlay }) {
  const [sound, setSound] = React.useState(isSoundEnabled())

  function toggleSound() {
    const next = !sound
    setSound(next)
    setSoundEnabled(next)
    localStorage.setItem('lottiesworld_sound', next ? '1' : '0')
  }

  return (
    <div className="screen start-screen">
      <div className="hero-scene">
        <div className="hero-sun" />
        <div className="hero-rainbow" />
        <img className="hero-car-img" src={`${BASE}sprites/hero.png`} alt="Lottie, Autumn and their pink car" />
      </div>

      <h1 className="title">
        Lottie's <span>World</span>
      </h1>
      <p className="subtitle">Rainbow road adventures with Lottie &amp; Autumn!</p>

      <div className="high-score-pill">🏆 Best score: {highScore}</div>

      <div className="legend-card">
        <div className="legend-row">
          <span className="legend-label good">Collect</span>
          <span className="legend-icons">
            <img src={`${BASE}sprites/coin.png`} alt="coin" />
            <img src={`${BASE}sprites/shell.png`} alt="shell" />
            <img src={`${BASE}sprites/heart.png`} alt="heart" />
            <span>🦴</span>
            <span>🍫</span>
            <span>🍬</span>
          </span>
        </div>
        <div className="legend-row">
          <span className="legend-label bad">Avoid</span>
          <span className="legend-icons">
            <img src={`${BASE}sprites/football.png`} alt="football" />
            <span>🧀</span>
            <span>🍋</span>
          </span>
        </div>
        <div className="legend-row">
          <span className="legend-label power">Power-ups</span>
          <span className="legend-icons">
            <img src={`${BASE}sprites/bunny.png`} alt="bunny comforter shield" />
            <img src={`${BASE}sprites/poo.png`} alt="poo power" />
          </span>
        </div>
      </div>

      <button className="big-button play-button" onClick={onPlay}>
        ▶ Play
      </button>

      <button className="sound-toggle" onClick={toggleSound}>
        {sound ? '🔊 Sound On' : '🔇 Sound Off'}
      </button>

      <p className="hint">Swipe left or right to steer!</p>
    </div>
  )
}
