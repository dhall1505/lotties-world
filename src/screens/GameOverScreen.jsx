import React from 'react'

export default function GameOverScreen({
  score, coins, longestStreak,
  highScore, bestStreak, bestCoins,
  isNewHighScore, isNewStreakBest, isNewCoinsBest,
  onPlayAgain, onHome,
}) {
  const anyNewRecord = isNewHighScore || isNewStreakBest || isNewCoinsBest
  return (
    <div className="screen gameover-screen">
      <div className="gameover-emoji">{anyNewRecord ? '🎉' : '🌈'}</div>
      <h2>{isNewHighScore ? 'New High Score!' : anyNewRecord ? 'New Personal Best!' : 'Great Drive!'}</h2>

      <div className="stat-card">
        <div className="stat-group-label">This Run</div>
        <div className="stat-row">
          <span>Score</span>
          <strong>{score}</strong>
        </div>
        <div className="stat-row">
          <span>Coins Collected</span>
          <strong>🪙 {coins}</strong>
        </div>
        <div className="stat-row">
          <span>Longest Streak</span>
          <strong>🔥 {longestStreak}</strong>
        </div>

        <div className="stat-group-label">Your Bests</div>
        <div className="stat-row">
          <span>Best Score {isNewHighScore && <span className="new-badge">NEW!</span>}</span>
          <strong>🏆 {highScore}</strong>
        </div>
        <div className="stat-row">
          <span>Longest Streak Ever {isNewStreakBest && <span className="new-badge">NEW!</span>}</span>
          <strong>🔥 {bestStreak}</strong>
        </div>
        <div className="stat-row">
          <span>Most Coins in a Run {isNewCoinsBest && <span className="new-badge">NEW!</span>}</span>
          <strong>🪙 {bestCoins}</strong>
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
