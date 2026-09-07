import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|api/mtg-buylist/mate-upload|api/mtg-buylist/mate-ingest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
