import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    shareId?: string;
    shareExp?: string;
    shareV?: string;
  }
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      role?: string;
      shareId?: string;
      shareV?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    shareId?: string;
    shareExp?: string;
    shareV?: string;
    guestInvalid?: boolean;
  }
}
