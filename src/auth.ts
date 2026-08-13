import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * Phase 1: Dev Login (credentials).
 * Phase 3: add Microsoft Entra provider; keep Dev Login behind DEV_AUTH=true only.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: "dev-login",
      name: "Dev Login",
      credentials: {
        name: { label: "Display name", type: "text" },
      },
      async authorize(credentials) {
        if (process.env.DEV_AUTH !== "true") {
          return null;
        }
        const name =
          typeof credentials?.name === "string" && credentials.name.trim()
            ? credentials.name.trim()
            : "Scriven Owner";
        return {
          id: "dev-owner",
          name,
          email: "owner@scriven.group",
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
        return true;
      }
      return !!session?.user;
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
});
