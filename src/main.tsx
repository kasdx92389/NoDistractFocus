import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Dev is excluded on purpose: the worker would cache Vite's dev modules and
// fight HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // An installed PWA can stay open for days; look for a new build whenever
      // the user comes back to it.
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) reg.update().catch(() => {})
      })
    }).catch(() => {})
  })
}
