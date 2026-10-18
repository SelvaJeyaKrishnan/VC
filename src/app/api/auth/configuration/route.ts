import { NextResponse } from "next/server";
import { getMissingAuthEnvironment } from "@/lib/authConfiguration";

export const dynamic = "force-dynamic";

export async function GET() {
  const missing = getMissingAuthEnvironment(process.env);
  return NextResponse.json(
    { configured: missing.length === 0, missing },
    { headers: { "Cache-Control": "no-store" } }
  );
}
