import { auth } from "@/lib/auth"
import { subscribeToScale } from "@/lib/scale-live-channel"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function serializeSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const { searchParams } = new URL(request.url)
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)

  if (ids.length === 0) {
    return new Response(JSON.stringify({ error: "Scale IDs are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(serializeSse("ready", { ids })))

      const unsubscribeFns = ids.map((id) =>
        subscribeToScale(id, (payload) => {
          controller.enqueue(
            new TextEncoder().encode(serializeSse("scale", payload))
          )
        })
      )

      const heartbeat = setInterval(() => {
        controller.enqueue(
          new TextEncoder().encode(serializeSse("heartbeat", { ts: Date.now() }))
        )
      }, 15000)

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        unsubscribeFns.forEach((unsubscribe) => unsubscribe())
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
