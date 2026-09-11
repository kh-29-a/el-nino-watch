import { useEffect, useState } from 'react'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { AboutPage } from './pages/AboutPage'
import { GuidePage } from './pages/GuidePage'
import { HomePage } from './pages/HomePage'
import type { RoutePath } from './types'
import { useEnsoData } from './hooks/useEnsoData'
import { useTradeWindData } from './hooks/useTradeWindData'

function currentRoute(): RoutePath {
  if (window.location.pathname === '/guide') return '/guide'
  if (window.location.pathname === '/about') return '/about'
  return '/'
}

export default function App() {
  const [route, setRoute] = useState<RoutePath>(currentRoute)
  const { data: enso, error: ensoError, loading } = useEnsoData()
  const { data: tradeWind, error: tradeWindError, loading: tradeWindLoading } = useTradeWindData()

  useEffect(() => {
    const handlePopState = () => setRoute(currentRoute())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function navigate(path: RoutePath) {
    if (path !== window.location.pathname) window.history.pushState({}, '', path)
    setRoute(path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <Header route={route} onNavigate={navigate} enso={enso} tradeWind={tradeWind} endpointError={ensoError} tradeWindError={tradeWindError} />
      {route === '/' && <HomePage enso={enso} tradeWind={tradeWind} loading={loading} tradeWindLoading={tradeWindLoading} />}
      {route === '/guide' && <GuidePage />}
      {route === '/about' && <AboutPage />}
      <Footer />
    </>
  )
}
