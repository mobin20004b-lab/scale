import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string
    email?: string
    role?: UserRole
    password?: string
  }

  if (!body.name?.trim() || !body.email?.trim() || !body.password?.trim()) {
    return NextResponse.json({ error: "name, email and password are required" }, { status: 400 })
  }

  const role = body.role && Object.values(UserRole).includes(body.role) ? body.role : UserRole.USER
  const hashedPassword = await bcrypt.hash(body.password, 10)

  const created = await prisma.user.create({
    data: {
      full_name: body.name.trim(),
      username: body.email.trim().toLowerCase(),
      role,
      password: hashedPassword
    },
    select: {
      id: true,
      full_name: true,
      username: true,
      role: true
    }
  })

  return NextResponse.json({
    user: {
      id: created.id,
      name: created.full_name,
      email: created.username,
      role: created.role,
      active: true
    }
  })
}
