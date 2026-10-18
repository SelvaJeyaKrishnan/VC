import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { getMissingAuthEnvironment } from "@/lib/authConfiguration";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

type AuthHandlerContext = {
  params: Promise<{ nextauth: string[] }>;
};

async function handleAuth(request: NextRequest, context: AuthHandlerContext) {
  const missing = getMissingAuthEnvironment(process.env);
  if (missing.length > 0) {
    const { nextauth } = await context.params;
    if (request.method === "GET" && nextauth.join("/") === "session") {
      return NextResponse.json({}, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json(
      {
        error: "Google sign-in is not configured.",
        missing,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  return handler(request, context);
}

export const GET = handleAuth;
export const POST = handleAuth;
