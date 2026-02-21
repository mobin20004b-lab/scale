import { prisma } from "@/lib/prisma";

export async function authenticateScaleDevice(scaleId: string, authorization: string) {
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const scale = await prisma.scale.findUnique({ where: { id: scaleId } });
  if (!scale) {
    return { error: "Scale not found", status: 404 as const };
  }

  if (scale.apiKey !== token) {
    return { error: "Invalid token", status: 401 as const };
  }

  return { scale };
}
