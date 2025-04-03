import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { OnlineStatusProvider } from './contexts/OnlineStatusContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <OnlineStatusProvider>
      <App />
    </OnlineStatusProvider>
  </StrictMode>,
)