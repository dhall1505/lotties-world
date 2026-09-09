import React from 'react'

export default function GameOverScreen({ score, bestScore, caterpillars, height, isNewHighScore, onPlayAgain, onHome }) {
  return (
    <div className="cj-screen cj-gameover-screen">
      <div className="cj-gameover-emoji">{isNewHighScore ? '🎉' : '☁️'}</div>
      <h2>{isNewHighScore ? 'New High Score!' : 'Great Jumping!'}</h2>

      <div className="cj-stat-card">
        <div className="cj-stat-row">
          <span>Final Score</span>
          <strong>{score}</strong>
        </div>
        <div className="cj-stat-row">
          <span>Caterpillars Collected</span>
          <strong>🐛 {caterpillars}</strong>
        </div>
        <div className="cj-stat-row">
          <span>Height Reached</span>
          <strong>{height}</strong>
        </div>
        <div className="cj-stat-row">
          <span>Best Score</span>
          <strong>🏆 {bestScore}</strong>
        </div>
      </div>

      <button className="cj-big-button" onClick={onPlayAgain}>▶ Play Again</button>
      <button className="cj-secondary-button" onClick={onHome}>🏠 Home</button>
    </div>
  )
}
