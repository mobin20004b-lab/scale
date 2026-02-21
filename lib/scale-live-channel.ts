import { fetchScaleLive, ScaleLivePayload } from "@/lib/scale-live"

type Subscriber = (payload: ScaleLivePayload) => void

interface ScaleStreamState {
  subscribers: Set<Subscriber>
  timer: ReturnType<typeof setInterval> | null
}

const streams = new Map<string, ScaleStreamState>()
const POLL_INTERVAL_MS = 1000

async function broadcastScale(scaleId: string) {
  const stream = streams.get(scaleId)
  if (!stream || stream.subscribers.size === 0) {
    return
  }

  const [payload] = await fetchScaleLive([scaleId])
  if (!payload) {
    return
  }

  stream.subscribers.forEach((subscriber) => subscriber(payload))
}

function ensureStream(scaleId: string) {
  const existing = streams.get(scaleId)
  if (existing) {
    return existing
  }

  const state: ScaleStreamState = {
    subscribers: new Set(),
    timer: null,
  }

  state.timer = setInterval(() => {
    void broadcastScale(scaleId)
  }, POLL_INTERVAL_MS)

  streams.set(scaleId, state)
  return state
}

export function subscribeToScale(
  scaleId: string,
  subscriber: Subscriber
): () => void {
  const stream = ensureStream(scaleId)
  stream.subscribers.add(subscriber)

  void broadcastScale(scaleId)

  return () => {
    const activeStream = streams.get(scaleId)
    if (!activeStream) {
      return
    }

    activeStream.subscribers.delete(subscriber)

    if (activeStream.subscribers.size === 0) {
      if (activeStream.timer) {
        clearInterval(activeStream.timer)
      }
      streams.delete(scaleId)
    }
  }
}
