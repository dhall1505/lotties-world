import React, { useState } from 'react'
import RainbowRoadApp from './App.jsx'
import CloudJumpApp from './games/cloud-jump/CloudJumpApp.jsx'
import './hub.css'

const BASE = import.meta.env.BASE_URL

function HubHome({ onSelect }) {
  return (
    <div className="hub-root">
      <div className="hub-screen">
        <h1 className="hub-title">Lottie's World</h1>
        <p className="hub-subtitle">Pick a game to play!</p>

        <div className="hub-cards">
          <button className="hub-card" onClick={() => onSelect('rainbow-road')}>
            <img src={`${BASE}sprites/car.png`} alt="Rainbow Road" />
            <div className="hub-card-label">
              <span className="hub-card-title">Rainbow Road</span>
              <span className="hub-card-desc">Drive, dodge & collect!</span>
            </div>
          </button>

          <button className="hub-card" onClick={() => onSelect('cloud-jump')}>
            <img src={`${BASE}sprites-cj/front.png`} alt="Cloud Jump" />
            <div className="hub-card-label">
              <span className="hub-card-title">Cloud Jump</span>
              <span className="hub-card-desc">Bounce through the sky!</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Hub() {
  const [screen, setScreen] = useState('hub') // hub | rainbow-road | cloud-jump

  if (screen === 'rainbow-road') return <RainbowRoadApp onExit={() => setScreen('hub')} />
  if (screen === 'cloud-jump') return <CloudJumpApp onExit={() => setScreen('hub')} />
  return <HubHome onSelect={setScreen} />
}
