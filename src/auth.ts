import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

const providers: Provider[] = [];

const entraConfigured =
  !!process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
  !!process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
  !!process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER;

const sharePassword = process.env.MRT_SHARE_PASSWORD || "";
const shareConfigured = sharePassword.length > 0;

function secretsEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

if (entraConfigured) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
  );
}

if (process.env.DEV_AUTH === "true") {
  providers.push(
    Credentials({
      id: "dev-login",
      name: "Dev Login",
      credentials: {
        name: { label: "Display name", type: "text" },
      },
      async authorize(credentials) {
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
  );
}

if (shareConfigured) {
  providers.push(
    Credentials({
      id: "mrt-share",
      name: "MRT view",
      credentials: {
        name: { label: "Your name", type: "text" },
        password: { label: "Share password", type: "password" },
        ip: { label: "ip", type: "text" },
      },
      async authorize(credentials) {
        const name =
          typeof credentials?.name === "string" ? credentials.name.trim() : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        const ip =
          typeof credentials?.ip === "string" && credentials.ip.trim()
            ? credentials.ip.trim()
            : "unknown";
        if (name.length < 3) return null;
        if (!secretsEqual(password, sharePassword)) return null;
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
        const ipKey = ip.replace(/[^a-zA-Z0-9.:-]/g, "").slice(0, 40) || "unknown";
        return {
          id: `mrt-guest-${slug || "guest"}-${ipKey}`,
          name,
          email: "mrt-guest@local",
          role: "mrt-guest",
        };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (typeof token.role === "string") session.user.role = token.role;
        if (token.sub) session.user.id = token.sub;
      }
      return session;
    },
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

export const authFlags = {
  entraConfigured,
  devAuth: process.env.DEV_AUTH === "true",
  shareConfigured,
};

export function isMrtGuest(session: { user?: { role?: string } } | null) {
  return session?.user?.role === "mrt-guest";
}
