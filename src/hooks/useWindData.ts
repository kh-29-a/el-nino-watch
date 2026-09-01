import { useEffect, useState } from 'react'
import { loadWindData } from '../data/client'
import { healthForWindTimestamp, type WindResponse } from '../data/wind'

export function useWindData() {
  const [data, setData] = useState<WindResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    loadWindData()
      .then((response) => {
        if (!active) return
        if (response.data) response.meta.health = healthForWindTimestamp(response.data.validTimestamp)
        setData(response)
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load wind data') })
    return () => { active = false }
  }, [])

  return { data, error, loading: !data && !error }
}
