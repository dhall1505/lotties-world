import React from 'react'

export default function GameOverScreen({ score, coins, highScore, isNewHighScore, onPlayAgain, onHome }) {
  return (
    <div className="screen gameover-screen">
      <div className="gameover-emoji">{isNewHighScore ? '🎉' : '🌈'}</div>
      <h2>{isNewHighScore ? 'New High Score!' : 'Great Drive!'}</h2>

      <div className="stat-card">
        <div className="stat-row">
          <span>Final Score</span>
          <strong>{score}</strong>
        </div>
        <div className="stat-row">
          <span>Coins Collected</span>
          <strong>🪙 {coins}</strong>
        </div>
        <div className="stat-row">
          <span>Best Score</span>
          <strong>🏆 {highScore}</strong>
        </div>
      </div>

      <button className="big-button play-button" onClick={onPlayAgain}>
        ▶ Play Again
      </button>
      <button className="secondary-button" onClick={onHome}>
        🏠 Home
      </button>
    </div>
  )
}
