"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getScaleHealthSnapshot, ScaleHealth } from "@/lib/scale-health";

export interface ScaleLiveState {
  id: string;
  isActive: boolean;
  lastWeight: number | null;
  lastWeightAt: string | Date | null;
  tare: number;
  unit: string;
  precision: number;
  health: ScaleHealth;
  lastReadingAgeMs: number | null;
}

interface UseScaleLiveOptions {
  staleAfterMs?: number;
}

export function useScaleLive(
  scaleIds: string[],
  options: UseScaleLiveOptions = {}
) {
  const [scales, setScales] = useState<Record<string, ScaleLiveState>>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const idsKey = scaleIds.join(",");
  const stableIds = useMemo(() => Array.from(new Set(scaleIds)).sort(), [idsKey]);
  const stableIdsKey = stableIds.join(",");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const staleAfterMs = options.staleAfterMs ?? 15000;

    const clearStaleTimer = () => {
      if (staleTimerRef.current) {
        clearTimeout(staleTimerRef.current);
        staleTimerRef.current = null;
      }
    };

    const scheduleStale = () => {
      clearStaleTimer();
      staleTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setIsStale(true);
        }
      }, staleAfterMs);
    };

    const cleanup = () => {
      clearStaleTimer();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      setIsConnecting(false);
    };

    if (stableIds.length === 0) {
      cleanup();
      setScales({});
      setIsStale(false);
      setError(null);
      return;
    }

    let closed = false;

    const connect = () => {
      if (closed) {
        return;
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setIsConnecting(true);
      setIsStale(false);

      const params = new URLSearchParams({ ids: stableIds.join(",") });
      const source = new EventSource(`/api/scales/live/stream?${params.toString()}`);
      eventSourceRef.current = source;

      source.addEventListener("snapshot", (event) => {
        const payload = JSON.parse((event as MessageEvent).data) as ScaleLiveState[];
        if (!mountedRef.current) {
          return;
        }

        const next: Record<string, ScaleLiveState> = {};
        payload.forEach((scale) => {
          const snapshot = getScaleHealthSnapshot(scale.lastWeightAt);
          next[scale.id] = {
            ...scale,
            health: snapshot.health,
            lastReadingAgeMs: snapshot.lastReadingAgeMs,
          };
        });

        setScales(next);
        setError(null);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        scheduleStale();
      });

      source.addEventListener("scale-update", (event) => {
        const payload = JSON.parse((event as MessageEvent).data) as ScaleLiveState;
        if (!mountedRef.current) {
          return;
        }

        const snapshot = getScaleHealthSnapshot(payload.lastWeightAt);

        setScales((previous) => ({
          ...previous,
          [payload.id]: {
            ...payload,
            health: snapshot.health,
            lastReadingAgeMs: snapshot.lastReadingAgeMs,
          },
        }));
        setError(null);
        setIsStale(false);
        scheduleStale();
      });

      source.addEventListener("heartbeat", () => {
        if (!mountedRef.current) {
          return;
        }

        setError(null);
        setIsStale(false);
        scheduleStale();
      });

      source.onerror = () => {
        source.close();

        if (!mountedRef.current || closed) {
          return;
        }

        setIsConnecting(false);
        setIsStale(true);
        setError("اتصال زنده با ترازو قطع شد. تلاش برای اتصال مجدد...");

        const attempt = reconnectAttemptsRef.current + 1;
        reconnectAttemptsRef.current = attempt;
        const waitMs = Math.min(1000 * 2 ** (attempt - 1), 15000);

        reconnectTimerRef.current = setTimeout(connect, waitMs);
      };
    };

    connect();

    return () => {
      closed = true;
      cleanup();
    };
  }, [options.staleAfterMs, refreshKey, stableIds, stableIdsKey]);

  return {
    scales,
    isConnecting,
    isStale,
    error,
    refresh: () => setRefreshKey((previous) => previous + 1),
  };
}
