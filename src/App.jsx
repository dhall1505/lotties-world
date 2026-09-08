import React, { useEffect, useState } from 'react'
import StartScreen from './screens/StartScreen.jsx'
import PauseScreen from './screens/PauseScreen.jsx'
import GameOverScreen from './screens/GameOverScreen.jsx'
import Game from './Game.jsx'
import { setSoundEnabled } from './audio'

const HIGH_SCORE_KEY = 'lottiesworld_highscore'

export default function App() {
  const [screen, setScreen] = useState('start') // start | playing | gameover
  const [paused, setPaused] = useState(false)
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem(HIGH_SCORE_KEY) || 0))
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

  function handleGameOver({ score, coins, isNewHighScore }) {
    if (isNewHighScore) {
      localStorage.setItem(HIGH_SCORE_KEY, String(score))
      setHighScore(score)
    }
    setLastResult({ score, coins, isNewHighScore })
    setScreen('gameover')
  }

  return (
    <div className="app-root">
      {screen === 'start' && <StartScreen highScore={highScore} onPlay={startGame} />}

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
          highScore={highScore}
          isNewHighScore={lastResult.isNewHighScore}
          onPlayAgain={startGame}
          onHome={() => setScreen('start')}
        />
      )}
    </div>
  )
}
