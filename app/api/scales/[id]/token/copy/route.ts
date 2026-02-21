import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasValidRecentReauth, recentReauthCookieName } from "@/lib/security-reauth";

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
    const scale = await prisma.scale.findUnique({
      where: { id },
      select: { id: true, name: true, apiKey: true },
    });

    if (!scale) {
      return NextResponse.json({ error: "Scale not found" }, { status: 404 });
    }

    await prisma.activity.create({
      data: {
        userId,
        action: "کپی توکن ترازو",
        entity: "Scale",
        entityId: scale.id,
        details: `توکن ترازو «${scale.name}» کپی شد`,
      },
    });

    return NextResponse.json({ token: scale.apiKey });
  } catch (error) {
    console.error("[v0] Error copying scale token:", error);
    return NextResponse.json(
      { error: "Failed to copy scale token" },
      { status: 500 }
    );
  }
}
