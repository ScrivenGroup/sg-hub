import type { NextAuthConfig } from "next-auth";

export function isMrtGuest(session: { user?: { role?: string } } | null) {
  return session?.user?.role === "mrt-guest";
}

function guestPathAllowed(pathname: string) {
  return (
    pathname === "/w/sunwater-mrt" || pathname.startsWith("/w/sunwater-mrt/")
  );
}

function invalidateGuest(token: {
  role?: string;
  shareV?: string;
  shareId?: string;
  shareExp?: string;
  sub?: string;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  guestInvalid?: boolean;
}) {
  token.role = undefined;
  token.shareV = undefined;
  token.shareId = undefined;
  token.shareExp = undefined;
  token.sub = undefined;
  token.name = undefined;
  token.email = undefined;
  token.picture = undefined;
  token.guestInvalid = true;
}

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.guestInvalid = undefined;
        token.role = user.role;
        token.sub = user.id;
        if (user.role === "mrt-guest") {
          token.shareId = user.shareId;
          token.shareExp = user.shareExp;
          token.shareV = user.shareV;
        } else {
          token.shareId = undefined;
          token.shareExp = undefined;
          token.shareV = undefined;
        }
      }
      if (token.role === "mrt-guest") {
        const exp =
          typeof token.shareExp === "string" ? Date.parse(token.shareExp) : NaN;
        if (!Number.isFinite(exp) || Date.now() > exp) {
          invalidateGuest(token);
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token.guestInvalid) {
        session.user = undefined as unknown as typeof session.user;
        return session;
      }
      if (session.user) {
        if (typeof token.role === "string") session.user.role = token.role;
        if (token.sub) session.user.id = token.sub;
        if (typeof token.shareId === "string") session.user.shareId = token.shareId;
        if (typeof token.shareV === "string") session.user.shareV = token.shareV;
      }
      return session;
    },
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      if (
        pathname.startsWith("/login") ||
        pathname.startsWith("/api/auth") ||
        pathname === "/w/sunwater-mrt/guest" ||
        pathname === "/api/mtg-buylist/mate-ingest"
      ) {
        return true;
      }
      if (!session?.user) return false;
      if (isMrtGuest(session)) return guestPathAllowed(pathname);
      return true;
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;
