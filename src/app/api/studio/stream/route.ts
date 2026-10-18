import { NextResponse } from "next/server";
import { STREAMING_UNAVAILABLE } from "@/lib/streamingAvailability";

export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(STREAMING_UNAVAILABLE);
}

export async function POST() {
  return NextResponse.json(STREAMING_UNAVAILABLE, { status: 501 });
}
