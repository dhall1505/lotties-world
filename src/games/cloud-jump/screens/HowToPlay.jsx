import React from 'react'

export default function HowToPlay({ onBack }) {
  return (
    <div className="cj-screen cj-howto-screen">
      <h2>How to Play</h2>
      <div className="cj-howto-list">
        <div className="cj-howto-row"><span className="cj-howto-emoji">👈👉</span> Move left and right</div>
        <div className="cj-howto-row"><span className="cj-howto-emoji">☁️</span> Land on marshmallow clouds</div>
        <div className="cj-howto-row"><span className="cj-howto-emoji">🐛</span> Collect caterpillar toys</div>
        <div className="cj-howto-row"><span className="cj-howto-emoji">🐱</span> Avoid the cat</div>
      </div>
      <button className="cj-big-button" onClick={onBack}>Got it!</button>
    </div>
  )
}
