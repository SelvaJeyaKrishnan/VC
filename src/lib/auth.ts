import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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
      const authorizedHostEmail = process.env.AUTHORIZED_HOST_EMAIL?.trim().toLowerCase();
      if (
        !authorizedHostEmail ||
        !profile ||
        typeof profile.email !== "string" ||
        !("email_verified" in profile)
      ) {
        return false;
      }
      return (
        profile.email.length > 0 &&
        profile.email.trim().toLowerCase() === authorizedHostEmail &&
        profile.email_verified === true
      );
    },
  },
};
