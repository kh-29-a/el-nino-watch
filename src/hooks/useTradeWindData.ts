import { useEffect, useState } from 'react'
import { loadTradeWindData } from '../data/client'
import type { TradeWindResponse } from '../data/tradeWind'

export function useTradeWindData() {
  const [data, setData] = useState<TradeWindResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    loadTradeWindData()
      .then((response) => { if (active) setData(response) })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load trade-wind indices') })
    return () => { active = false }
  }, [])

  return { data, error, loading: !data && !error }
}
