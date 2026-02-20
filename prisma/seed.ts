import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const password = process.env.ADMIN_PASSWORD || "admin123"
  const hashedPassword = await bcrypt.hash(password, 10)

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

  const mainWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH-001" },
    update: {},
    create: {
      name: "انبار مرکزی",
      code: "WH-001",
      location: "کارخانه - سالن اصلی",
    },
  })

  await prisma.scale.upsert({
    where: { serialNumber: "SCALE-001" },
    update: { warehouseId: mainWarehouse.id },
    create: {
      name: "باسکول خط 1",
      serialNumber: "SCALE-001",
      warehouseId: mainWarehouse.id,
      unit: "kg",
    },
  })

  console.log("Admin user seeded:", admin.username)
  console.log("Warehouse and default scale seeded")
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
