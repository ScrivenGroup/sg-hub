import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { authConfig } from "@/auth.config";

const providers: Provider[] = [];

const entraConfigured =
  !!process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
  !!process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
  !!process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER;

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

providers.push(
  Credentials({
    id: "mrt-share",
    name: "MRT view",
    credentials: {
      name: { label: "Your name", type: "text" },
      password: { label: "Share password", type: "password" },
      shareId: { label: "s", type: "text" },
      ip: { label: "ip", type: "text" },
    },
    async authorize(credentials) {
      const { authorizeMrtShare } = await import("@/core/store/mrt-share");
      const name =
        typeof credentials?.name === "string" ? credentials.name : undefined;
      const password =
        typeof credentials?.password === "string"
          ? credentials.password
          : undefined;
      const shareId =
        typeof credentials?.shareId === "string"
          ? credentials.shareId
          : undefined;
      const ip = typeof credentials?.ip === "string" ? credentials.ip : undefined;
      return authorizeMrtShare({ name, password, shareId, ip });
    },
  }),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
});

export const authFlags = {
  entraConfigured,
  devAuth: process.env.DEV_AUTH === "true",
};

export { isMrtGuest } from "@/auth.config";
