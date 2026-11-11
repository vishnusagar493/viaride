import React from 'react'
import './LoadingSpinner.css'

const LoadingSpinner = ({ fullPage = false, text = '' }) => {
  if (fullPage) {
    return (
      <div className="spinner-fullpage">
        <div className="spinner-wrap">
          <div className="spinner-ring"></div>
          <span className="spinner-logo">VR</span>
        </div>
        {text && <p className="spinner-text">{text}</p>}
      </div>
    )
  }

  return (
    <div className="spinner-inline">
      <div className="spinner"></div>
    </div>
  )
}

export default LoadingSpinner
