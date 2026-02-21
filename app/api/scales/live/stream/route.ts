import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScaleHealthSnapshot } from "@/lib/scale-health";
import { scaleLiveHub } from "@/lib/scale-live-hub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function createSseEvent(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids") || "";
  const scaleIds = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (scaleIds.length === 0) {
    return Response.json({ error: "Scale ids are required" }, { status: 400 });
  }

  const scales = await prisma.scale.findMany({
    where: {
      id: { in: scaleIds },
    },
    select: {
      id: true,
      isActive: true,
      lastWeight: true,
      lastWeightAt: true,
      tare: true,
      unit: true,
      precision: true,
      heartbeatIntervalSec: true,
    },
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          createSseEvent(
            "snapshot",
            scales.map((scale) => {
              const health = getScaleHealthSnapshot(scale.lastWeightAt, {
                heartbeatIntervalSec: scale.heartbeatIntervalSec,
              });
              return {
                ...scale,
                health: health.health,
                lastReadingAgeMs: health.lastReadingAgeMs,
              };
            })
          )
        )
      );

      const unsubscribe = scaleLiveHub.subscribe(scaleIds, (payload) => {
        controller.enqueue(
          encoder.encode(createSseEvent("scale-update", payload))
        );
      });

      const keepAliveTimer = setInterval(() => {
        controller.enqueue(
          encoder.encode(createSseEvent("heartbeat", { ts: Date.now() }))
        );
      }, 15000);

      const handleAbort = () => {
        clearInterval(keepAliveTimer);
        unsubscribe();
        controller.close();
      };

      request.signal.addEventListener("abort", handleAbort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
