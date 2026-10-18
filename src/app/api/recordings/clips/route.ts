import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function unavailable() {
  return NextResponse.json(
    { error: "Clip suggestions and rendered exports are unavailable; no transcription or rendering service is configured." },
    { status: 501 }
  );
}

export async function GET() {
  return unavailable();
}

export async function POST() {
  return unavailable();
}
