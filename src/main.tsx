import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

const root = document.getElementById('root')
if (!root) {
  document.body.innerHTML =
    '<p style="font-family:sans-serif;padding:24px">No se encontró #root. Abre Tocks con <code>npm run dev</code>, no el HTML crudo.</p>'
} else {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>,
  )
}
