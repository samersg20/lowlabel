import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      unit: string;
      tenantId: string;
      companyName?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    unit: string;
    tenantId: string;
    companyName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    unit: string;
    tenantId: string;
    companyName?: string;
  }
}
