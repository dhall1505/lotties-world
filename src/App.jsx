import React, { useEffect, useState } from 'react'
import StartScreen from './screens/StartScreen.jsx'
import PauseScreen from './screens/PauseScreen.jsx'
import GameOverScreen from './screens/GameOverScreen.jsx'
import Game from './Game.jsx'
import { setSoundEnabled } from './audio'

const HIGH_SCORE_KEY = 'lottiesworld_highscore'
const BEST_STREAK_KEY = 'lottiesworld_best_streak'
const BEST_COINS_KEY = 'lottiesworld_best_coins'

export default function App({ onExit }) {
  const [screen, setScreen] = useState('start') // start | playing | gameover
  const [paused, setPaused] = useState(false)
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem(HIGH_SCORE_KEY) || 0))
  const [bestStreak, setBestStreak] = useState(() => Number(localStorage.getItem(BEST_STREAK_KEY) || 0))
  const [bestCoins, setBestCoins] = useState(() => Number(localStorage.getItem(BEST_COINS_KEY) || 0))
  const [lastResult, setLastResult] = useState(null)
  const [gameKey, setGameKey] = useState(0) // bump to fully reset Game component state

  useEffect(() => {
    const savedSound = localStorage.getItem('lottiesworld_sound')
    if (savedSound !== null) setSoundEnabled(savedSound === '1')
  }, [])

  function startGame() {
    setPaused(false)
    setLastResult(null)
    setGameKey((k) => k + 1)
    setScreen('playing')
  }

  function handleGameOver({ score, coins, isNewHighScore, longestStreak }) {
    if (isNewHighScore) {
      localStorage.setItem(HIGH_SCORE_KEY, String(score))
      setHighScore(score)
    }
    const isNewStreakBest = longestStreak > bestStreak
    if (isNewStreakBest) {
      localStorage.setItem(BEST_STREAK_KEY, String(longestStreak))
      setBestStreak(longestStreak)
    }
    const isNewCoinsBest = coins > bestCoins
    if (isNewCoinsBest) {
      localStorage.setItem(BEST_COINS_KEY, String(coins))
      setBestCoins(coins)
    }
    setLastResult({ score, coins, isNewHighScore, longestStreak, isNewStreakBest, isNewCoinsBest })
    setScreen('gameover')
  }

  return (
    <div className="app-root">
      {screen === 'start' && <StartScreen highScore={highScore} onPlay={startGame} onExit={onExit} />}

      {screen === 'playing' && (
        <>
          <Game
            key={gameKey}
            highScore={highScore}
            onGameOver={handleGameOver}
            paused={paused}
            setPaused={setPaused}
          />
          {paused && (
            <PauseScreen
              onContinue={() => setPaused(false)}
              onRestart={startGame}
              onExit={() => { setPaused(false); setScreen('start') }}
            />
          )}
        </>
      )}

      {screen === 'gameover' && lastResult && (
        <GameOverScreen
          score={lastResult.score}
          coins={lastResult.coins}
          longestStreak={lastResult.longestStreak}
          highScore={highScore}
          bestStreak={bestStreak}
          bestCoins={bestCoins}
          isNewHighScore={lastResult.isNewHighScore}
          isNewStreakBest={lastResult.isNewStreakBest}
          isNewCoinsBest={lastResult.isNewCoinsBest}
          onPlayAgain={startGame}
          onHome={() => setScreen('start')}
        />
      )}
    </div>
  )
}
