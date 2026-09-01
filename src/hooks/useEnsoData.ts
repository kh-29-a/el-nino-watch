import { useEffect, useState } from 'react'
import { loadEnsoData } from '../data/client'
import type { EnsoResponse } from '../data/enso'

export function useEnsoData() {
  const [data, setData] = useState<EnsoResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    loadEnsoData()
      .then((response) => { if (active) setData(response) })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load data') })
    return () => { active = false }
  }, [])

  return { data, error, loading: !data && !error }
}
