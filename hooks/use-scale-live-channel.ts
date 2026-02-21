"use client"

import { useEffect, useMemo, useState } from "react"
import { ScaleHealth } from "@/lib/scale-health"

export interface LiveScaleState {
  id: string
  lastWeight: number | null
  lastWeightAt: string | null
  health: ScaleHealth
  lastReadingAgeMs: number | null
  lastStableWeight: number | null
  unstableFlag: boolean
  spikeFlag: boolean
}

export function useScaleLiveChannel(ids: string[]) {
  const [scales, setScales] = useState<Record<string, LiveScaleState>>({})
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastEventAt, setLastEventAt] = useState<number | null>(null)
  const [clock, setClock] = useState(() => Date.now())

  const normalizedIds = useMemo(
    () => [...new Set(ids)].filter(Boolean).sort(),
    [ids]
  )

  useEffect(() => {
    if (normalizedIds.length === 0) {
      setScales({})
      setError(null)
      setIsConnecting(false)
      return
    }

    let attempt = 0
    let cancelled = false
    let source: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      if (cancelled) return

      setIsConnecting(true)
      const params = new URLSearchParams({ ids: normalizedIds.join(",") })
      source = new EventSource(`/api/scales/stream?${params.toString()}`)

      source.addEventListener("ready", () => {
        attempt = 0
        setError(null)
      })

      source.addEventListener("scale", (event) => {
        const payload = JSON.parse((event as MessageEvent).data) as LiveScaleState
        setScales((prev) => ({ ...prev, [payload.id]: payload }))
        setLastEventAt(Date.now())
        setIsConnecting(false)
        setError(null)
      })

      source.onerror = () => {
        source?.close()
        if (cancelled) return

        const delay = Math.min(10000, 500 * 2 ** attempt)
        attempt += 1
        setIsConnecting(false)
        setError("ارتباط زنده با ترازو قطع شد. تلاش برای اتصال مجدد...")
        reconnectTimer = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      source?.close()
    }
  }, [normalizedIds])

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const isStale = lastEventAt !== null && clock - lastEventAt > 5000

  return {
    scales,
    isConnecting,
    error,
    isStale,
  }
}
