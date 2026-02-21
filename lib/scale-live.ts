import { prisma } from "@/lib/prisma"
import { getScaleHealthSnapshot, ScaleHealth } from "@/lib/scale-health"

export interface ScaleLivePayload {
  id: string
  lastWeight: number | null
  lastWeightAt: string | null
  lastHeartbeatAt: string | null
  lastStableWeight: number | null
  unstableFlag: boolean
  spikeFlag: boolean
  health: ScaleHealth
  lastReadingAgeMs: number | null
}

export function toScaleLivePayload(scale: {
  id: string
  lastWeight: number | null
  lastWeightAt: Date | null
  lastHeartbeatAt: Date | null
  lastStableWeight: number | null
  unstableFlag: boolean
  spikeFlag: boolean
  archivedAt: Date | null
}): ScaleLivePayload {
  const healthSnapshot = getScaleHealthSnapshot(scale.lastHeartbeatAt, {
    archivedAt: scale.archivedAt,
  })

  return {
    id: scale.id,
    lastWeight: scale.lastWeight,
    lastWeightAt: scale.lastWeightAt?.toISOString() ?? null,
    lastHeartbeatAt: scale.lastHeartbeatAt?.toISOString() ?? null,
    lastStableWeight: scale.lastStableWeight,
    unstableFlag: scale.unstableFlag,
    spikeFlag: scale.spikeFlag,
    health: healthSnapshot.health,
    lastReadingAgeMs: healthSnapshot.lastReadingAgeMs,
  }
}

export async function fetchScaleLive(ids?: string[]) {
  const scales = await prisma.scale.findMany({
    where: ids?.length
      ? {
          id: {
            in: ids,
          },
        }
      : undefined,
    select: {
      id: true,
      lastWeight: true,
      lastWeightAt: true,
      lastHeartbeatAt: true,
      lastStableWeight: true,
      unstableFlag: true,
      spikeFlag: true,
      archivedAt: true,
    },
  })

  return scales.map(toScaleLivePayload)
}
