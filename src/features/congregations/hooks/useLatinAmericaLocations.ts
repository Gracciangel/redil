import { useEffect, useState } from 'react'

export const LATAM_COUNTRIES = [
  { label: 'Argentina', apiName: 'Argentina' },
  { label: 'Bolivia', apiName: 'Bolivia' },
  { label: 'Chile', apiName: 'Chile' },
  { label: 'México', apiName: 'Mexico' },
  { label: 'Perú', apiName: 'Peru' },
  { label: 'Uruguay', apiName: 'Uruguay' },
] as const

function getApiCountryName(country: string) {
  const selected = LATAM_COUNTRIES.find((c) => c.label === country || c.apiName === country)
  return selected?.apiName ?? country
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as T & { error?: boolean; msg?: string }
  if (!res.ok || (json as { error?: boolean }).error) {
    throw new Error((json as { msg?: string }).msg || 'No se pudieron cargar los datos.')
  }
  return json
}

export function useCountryProvinces(country: string) {
  const [provinces, setProvinces] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!country) {
      setProvinces([])
      setError(null)
      setLoading(false)
      return
    }

    const apiCountry = getApiCountryName(country)
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const json = await postJson<{ data?: { states?: { name: string }[] } }>(
          'https://countriesnow.space/api/v0.1/countries/states',
          { country: apiCountry },
        )
        if (!cancelled) {
          const list = (json.data?.states ?? []).map((s) => s.name).sort((a, b) => a.localeCompare(b, 'es'))
          setProvinces(list)
        }
      } catch (e) {
        if (!cancelled) {
          setProvinces([])
          setError(e instanceof Error ? e.message : 'No se pudieron cargar las provincias.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [country])

  return { provinces, loading, error }
}

export function useProvinceCities(country: string, province: string) {
  const [cities, setCities] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!country || !province) {
      setCities([])
      setError(null)
      setLoading(false)
      return
    }

    const apiCountry = getApiCountryName(country)
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const json = await postJson<{ data?: string[] }>(
          'https://countriesnow.space/api/v0.1/countries/state/cities',
          { country: apiCountry, state: province },
        )
        if (!cancelled) {
          const list = Array.isArray(json.data) ? [...json.data].sort((a, b) => a.localeCompare(b, 'es')) : []
          setCities(list)
        }
      } catch (e) {
        if (!cancelled) {
          setCities([])
          setError(e instanceof Error ? e.message : 'No se pudieron cargar las ciudades.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [country, province])

  return { cities, loading, error }
}