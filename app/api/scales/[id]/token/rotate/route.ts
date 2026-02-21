import crypto from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasValidRecentReauth, recentReauthCookieName } from "@/lib/security-reauth";

const createScaleToken = () =>
  `sk_scale_${crypto.randomUUID().replaceAll("-", "")}${crypto
    .randomUUID()
    .replaceAll("-", "")}`;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const reauthToken = cookieStore.get(recentReauthCookieName)?.value;
    if (!hasValidRecentReauth(reauthToken, userId)) {
      return NextResponse.json(
        { error: "Recent re-authentication required" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const currentScale = await prisma.scale.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!currentScale) {
      return NextResponse.json({ error: "Scale not found" }, { status: 404 });
    }

    const nextToken = createScaleToken();
    await prisma.scale.update({
      where: { id },
      data: { apiKey: nextToken },
    });

    await prisma.activity.create({
      data: {
        userId,
        action: "چرخش توکن ترازو",
        entity: "Scale",
        entityId: id,
        details: `توکن ترازو «${currentScale.name}» چرخش یافت`,
      },
    });

    return NextResponse.json({ token: nextToken });
  } catch (error) {
    console.error("[v0] Error rotating scale token:", error);
    return NextResponse.json(
      { error: "Failed to rotate scale token" },
      { status: 500 }
    );
  }
}
