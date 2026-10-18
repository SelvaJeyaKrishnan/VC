import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { evaluateGoogleHostAuthorization } from "@/lib/googleHostAuthorization";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ profile }) {
      const result = evaluateGoogleHostAuthorization(profile, process.env.AUTHORIZED_HOST_EMAIL);
      if (!result.authorized) {
        console.warn("Google host sign-in denied by access policy.", {
          reason: result.reason,
        });
      }
      return result.authorized;
    },
    async session({ session, token }) {
      if (session.user && typeof token.email === "string") {
        session.user.email = token.email;
      }
      return session;
    },
  },
};
