import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaClient, type UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"
import { isUserActive } from "@/lib/system-settings"
import { getUserDashboardAccess } from "@/lib/user-access"

const prisma = new PrismaClient()

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string }
        })

        if (!user) {
          return null
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isValidPassword) {
          return null
        }

        const active = await isUserActive(user.id)
        if (!active) {
          return null
        }

        const access = await getUserDashboardAccess(user.id, user.role)

        return {
          id: user.id.toString(),
          name: user.full_name,
          email: user.username,
          role: user.role,
          access
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.access = (user as any).access
      }

      if (!token.id) {
        return token
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { id: true, full_name: true, username: true, role: true }
      })

      if (!dbUser) {
        return {}
      }

      const active = await isUserActive(dbUser.id)
      if (!active) {
        return {}
      }

      token.name = dbUser.full_name
      token.email = dbUser.username
      token.role = dbUser.role
      token.access = await getUserDashboardAccess(dbUser.id, dbUser.role as UserRole)

      return token
    },
    async session({ session, token }) {
      if (!token?.id) {
        return null
      }

      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role
        (session.user as any).access = token.access
      }
      return session
    }
  },
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt"
  }
})
