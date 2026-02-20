import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")
  const password = process.env.ADMIN_PASSWORD || "admin123"
  const hashedPassword = await bcrypt.hash(password, 10)

  // Upsert the admin user using username and full_name as per schema
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      full_name: "Admin",
      password: hashedPassword,
      role: "ADMIN",
    },
  })

  console.log("Admin user seeded:", admin.username)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
