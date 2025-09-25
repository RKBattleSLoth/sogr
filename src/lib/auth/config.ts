import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
// import MicrosoftProvider from "next-auth/providers/microsoft"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { db } from "@/lib/db"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly",
        },
      },
    }),
    // MicrosoftProvider({
    //   clientId: process.env.MICROSOFT_CLIENT_ID!,
    //   clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    //   authorization: {
    //     params: {
    //       scope: "openid email profile Mail.Read",
    //     },
    //   },
    // }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
}