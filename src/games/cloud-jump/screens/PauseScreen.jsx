import React from 'react'
import { isSoundEnabled, setSoundEnabled } from '../audio'

export default function PauseScreen({ onContinue, onRestart, onExit }) {
  const [sound, setSound] = React.useState(isSoundEnabled())

  function toggleSound() {
    const next = !sound
    setSound(next)
    setSoundEnabled(next)
    localStorage.setItem('cloudjump_sound', next ? '1' : '0')
  }

  return (
    <div className="cj-overlay">
      <div className="cj-pause-card">
        <h2>Paused</h2>
        <button className="cj-big-button" onClick={onContinue}>▶ Continue</button>
        <button className="cj-secondary-button" onClick={onRestart}>🔄 Restart</button>
        <button className="cj-secondary-button" onClick={toggleSound}>{sound ? '🔊 Sound On' : '🔇 Sound Off'}</button>
        <button className="cj-secondary-button" onClick={onExit}>🏠 Home</button>
      </div>
    </div>
  )
}
