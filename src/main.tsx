import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme.css' // 追加
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)