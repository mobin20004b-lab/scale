import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

function safeTokenEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function authenticateScaleDevice(scaleId: string, authorization: string) {
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const scale = await prisma.scale.findUnique({ where: { id: scaleId } });
  if (!scale) {
    return { error: "Scale not found", status: 404 as const };
  }

  if (scale.retiredAt) {
    return { error: "Scale retired", status: 403 as const };
  }

  if (!safeTokenEqual(scale.apiKey, token)) {
    return { error: "Invalid token", status: 401 as const };
  }

  return { scale };
}
