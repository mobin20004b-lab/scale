import { getScaleHealthSnapshot, ScaleHealth } from "@/lib/scale-health";

export interface ScaleLiveUpdate {
  id: string;
  isActive: boolean;
  lastWeight: number | null;
  lastWeightAt: string | Date | null;
  tare: number;
  unit: string;
  precision: number;
  heartbeatIntervalSec: number;
  health: ScaleHealth;
  lastReadingAgeMs: number | null;
}

type ScaleListener = (payload: ScaleLiveUpdate) => void;

class ScaleLiveHub {
  private listenersByScaleId = new Map<string, Set<ScaleListener>>();

  subscribe(scaleIds: string[], listener: ScaleListener) {
    scaleIds.forEach((scaleId) => {
      const listeners = this.listenersByScaleId.get(scaleId) ?? new Set();
      listeners.add(listener);
      this.listenersByScaleId.set(scaleId, listeners);
    });

    return () => {
      scaleIds.forEach((scaleId) => {
        const listeners = this.listenersByScaleId.get(scaleId);
        if (!listeners) {
          return;
        }

        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listenersByScaleId.delete(scaleId);
        }
      });
    };
  }

  publish(scaleUpdate: Omit<ScaleLiveUpdate, "health" | "lastReadingAgeMs">) {
    const snapshot = getScaleHealthSnapshot(scaleUpdate.lastWeightAt, {
      heartbeatIntervalSec: scaleUpdate.heartbeatIntervalSec,
    });
    const payload: ScaleLiveUpdate = {
      ...scaleUpdate,
      health: snapshot.health,
      lastReadingAgeMs: snapshot.lastReadingAgeMs,
    };

    const listeners = this.listenersByScaleId.get(scaleUpdate.id);
    if (!listeners || listeners.size === 0) {
      return;
    }

    listeners.forEach((listener) => listener(payload));
  }
}

declare global {
  var __scaleLiveHub: ScaleLiveHub | undefined;
}

function getScaleLiveHub() {
  if (!globalThis.__scaleLiveHub) {
    globalThis.__scaleLiveHub = new ScaleLiveHub();
  }

  return globalThis.__scaleLiveHub;
}

export const scaleLiveHub = getScaleLiveHub();
