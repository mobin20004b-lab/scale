import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const IDEMPOTENCY_POLL_INTERVAL_MS = 100;
const IDEMPOTENCY_PROCESSING_WAIT_MS = 5000;

type IdempotentResponse = {
  status: number;
  body: unknown;
};

async function waitForCompletedOperation(
  endpoint: string,
  key: string,
  now: Date,
): Promise<IdempotentResponse | null> {
  const timeoutAt = Date.now() + IDEMPOTENCY_PROCESSING_WAIT_MS;

  while (Date.now() < timeoutAt) {
    await new Promise((resolve) => setTimeout(resolve, IDEMPOTENCY_POLL_INTERVAL_MS));

    const existing = await prisma.idempotencyRecord.findUnique({
      where: {
        key_endpoint: {
          key,
          endpoint,
        },
      },
    });

    if (!existing || existing.expiresAt <= now) {
      return null;
    }

    if (existing.responseStatus !== 0) {
      return {
        status: existing.responseStatus,
        body: existing.responseBody,
      };
    }
  }

  return null;
}

export async function runIdempotentOperation(
  endpoint: string,
  key: string,
  operation: () => Promise<IdempotentResponse>,
): Promise<IdempotentResponse> {
  const now = new Date();

  await prisma.idempotencyRecord.deleteMany({
    where: { expiresAt: { lte: now } },
  });

  try {
    await prisma.idempotencyRecord.create({
      data: {
        endpoint,
        key,
        responseStatus: 0,
        responseBody: { state: "PROCESSING" },
        expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS),
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.idempotencyRecord.findUnique({
        where: {
          key_endpoint: {
            key,
            endpoint,
          },
        },
      });

      if (!existing || existing.expiresAt <= now) {
        throw error;
      }

      if (existing.responseStatus === 0) {
        const completed = await waitForCompletedOperation(endpoint, key, now);
        if (completed) {
          return completed;
        }

        return {
          status: 409,
          body: {
            error: "Request with this idempotency key is currently processing",
          },
        };
      }

      return {
        status: existing.responseStatus,
        body: existing.responseBody,
      };
    }

    throw error;
  }

  try {
    const result = await operation();

    await prisma.idempotencyRecord.update({
      where: {
        key_endpoint: {
          key,
          endpoint,
        },
      },
      data: {
        responseStatus: result.status,
        responseBody: result.body as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
      },
    });

    return result;
  } catch (error) {
    await prisma.idempotencyRecord.delete({
      where: {
        key_endpoint: {
          key,
          endpoint,
        },
      },
    });

    throw error;
  }
}
