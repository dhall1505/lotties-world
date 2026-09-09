import React, { useEffect, useState } from 'react'
import StartScreen from './screens/StartScreen.jsx'
import HowToPlay from './screens/HowToPlay.jsx'
import PauseScreen from './screens/PauseScreen.jsx'
import GameOverScreen from './screens/GameOverScreen.jsx'
import CloudJumpGame from './CloudJumpGame.jsx'
import { setSoundEnabled } from './audio'
import './cloudjump.css'

const BEST_SCORE_KEY = 'cloudjump_best_score'
const BASE = import.meta.env.BASE_URL

const ALL_IMAGE_PATHS = [
  'front.png', 'rear.png', 'cloud1.png', 'cloud2.png', 'cloud3.png',
  'cat.png', 'cat1.png', 'cat2.png', 'cat3.png', 'cat4.png',
].map((f) => `${BASE}sprites-cj/${f}`)

function preloadAll(paths) {
  return Promise.all(paths.map((src) => new Promise((resolve) => {
    const img = new Image()
    img.onload = resolve
    img.onerror = resolve // don't block the game forever on one bad asset
    img.src = src
  })))
}

export default function CloudJumpApp({ onExit }) {
  const [assetsReady, setAssetsReady] = useState(false)
  const [screen, setScreen] = useState('start') // start | howtoplay | playing | gameover
  const [paused, setPaused] = useState(false)
  const [bestScore, setBestScore] = useState(() => Number(localStorage.getItem(BEST_SCORE_KEY) || 0))
  const [lastResult, setLastResult] = useState(null)
  const [gameKey, setGameKey] = useState(0)

  useEffect(() => {
    const savedSound = localStorage.getItem('cloudjump_sound')
    if (savedSound !== null) setSoundEnabled(savedSound === '1')
    preloadAll(ALL_IMAGE_PATHS).then(() => setAssetsReady(true))
  }, [])

  function startGame() {
    setPaused(false)
    setLastResult(null)
    setGameKey((k) => k + 1)
    setScreen('playing')
  }

  function handleGameOver({ score, caterpillars, height, isNewHighScore }) {
    if (isNewHighScore) {
      localStorage.setItem(BEST_SCORE_KEY, String(score))
      setBestScore(score)
    }
    setLastResult({ score, caterpillars, height, isNewHighScore })
    setScreen('gameover')
  }

  if (!assetsReady) {
    return (
      <div className="cj-root">
        <div className="cj-screen cj-loading-screen">
          <div className="cj-loading-cloud">☁️</div>
          <p>Getting the clouds ready...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="cj-root">
      {screen === 'start' && (
        <StartScreen bestScore={bestScore} onPlay={startGame} onHowToPlay={() => setScreen('howtoplay')} onExit={onExit} />
      )}

      {screen === 'howtoplay' && <HowToPlay onBack={() => setScreen('start')} />}

      {screen === 'playing' && (
        <>
          <CloudJumpGame
            key={gameKey}
            bestScore={bestScore}
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
          caterpillars={lastResult.caterpillars}
          height={lastResult.height}
          bestScore={bestScore}
          isNewHighScore={lastResult.isNewHighScore}
          onPlayAgain={startGame}
          onHome={() => setScreen('start')}
        />
      )}
    </div>
  )
}
