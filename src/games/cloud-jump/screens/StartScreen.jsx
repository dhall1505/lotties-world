import React from 'react'
import { isSoundEnabled, setSoundEnabled, playButton } from '../audio'

const BASE = import.meta.env.BASE_URL

export default function StartScreen({ bestScore, onPlay, onHowToPlay, onExit }) {
  const [sound, setSound] = React.useState(isSoundEnabled())

  function toggleSound() {
    const next = !sound
    setSound(next)
    setSoundEnabled(next)
    localStorage.setItem('cloudjump_sound', next ? '1' : '0')
  }

  return (
    <div className="cj-screen cj-start-screen">
      <button className="cj-home-link" onClick={onExit}>← All Games</button>

      <img className="cj-hero-img" src={`${BASE}sprites-cj/front.png`} alt="Lottie and Autumn" />

      <h1 className="cj-title">Lottie's Marshmallow Adventure</h1>

      <div className="cj-best-pill">🏆 Best: {bestScore}</div>

      <button className="cj-big-button" onClick={() => { playButton(); onPlay() }}>
        ▶ Play
      </button>

      <div className="cj-start-row">
        <button className="cj-secondary-button" onClick={() => { playButton(); onHowToPlay() }}>
          ❓ How to Play
        </button>
        <button className="cj-sound-toggle" onClick={toggleSound}>
          {sound ? '🔊' : '🔇'}
        </button>
      </div>
    </div>
  )
}
