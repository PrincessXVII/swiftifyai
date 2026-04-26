import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './sf-hosted-fonts.css'
import './index.css'
import App from './App.tsx'

function maybeRedirectToCanonicalOrigin() {
  const canonicalRaw = import.meta.env.VITE_SITE_URL?.trim()
  if (!canonicalRaw || typeof window === 'undefined') return

  const canonical = canonicalRaw.replace(/\/$/, '')
  let target: URL
  try {
    target = new URL(canonical)
  } catch {
    return
  }

  const current = window.location
  const isLocalDev =
    current.hostname === 'localhost' ||
    current.hostname === '127.0.0.1' ||
    current.hostname === '0.0.0.0'
  if (isLocalDev) return

  // Избегаем случайного "размножения" сессий между pages.dev / www / apex доменом.
  if (current.origin !== target.origin) {
    const nextUrl = `${target.origin}${current.pathname}${current.search}${current.hash}`
    window.location.replace(nextUrl)
  }
}

maybeRedirectToCanonicalOrigin()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
