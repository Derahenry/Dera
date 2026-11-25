import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Loaded first so the browser's install prompt is caught as soon as it fires.
import './push.js'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
