import React from 'react'

export default function PauseScreen({ onContinue, onRestart, onExit }) {
  return (
    <div className="overlay">
      <div className="pause-card">
        <h2>Paused</h2>
        <button className="big-button play-button" onClick={onContinue}>▶ Continue</button>
        <button className="secondary-button" onClick={onRestart}>🔄 Restart</button>
        <button className="secondary-button" onClick={onExit}>🏠 Exit to Start</button>
      </div>
    </div>
  )
}
