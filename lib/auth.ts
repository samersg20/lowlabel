import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        identifier: { label: "E-mail", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials.password) return null;

        const identifier = credentials.identifier.trim().toLowerCase();
        const user = await prisma.user.findFirst({
          where: {
            OR: [{ email: identifier }, { username: identifier }],
          },
          include: { tenant: true },
        });

        if (!user) return null;
        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          unit: user.unit,
          tenantId: user.tenantId,
          companyName: user.tenant?.tradeName || user.tenant?.companyName || undefined,
        } as any;
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.unit = (user as any).unit;
        token.tenantId = (user as any).tenantId;
        token.companyName = (user as any).companyName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.unit = token.unit as string;
        session.user.tenantId = token.tenantId as string;
        session.user.companyName = token.companyName as string | undefined;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};

export function auth() {
  return getServerSession(authOptions);
}
