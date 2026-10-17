import { NextRequest, NextResponse } from "next/server";
import {
  resolveLiveKitCredentials,
  validateTokenCredentials,
  validateTokenParams,
  createLiveKitToken,
  type TokenRequestParams,
} from "@/lib/tokenService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as TokenRequestParams;
    const room = body.room?.trim();
    const identity = body.identity?.trim();
    const name = body.name?.trim() || identity || "Participant";
    const role = body.role || "guest";

    return await handleTokenRequest({ room, identity, name, role });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process token request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const room = searchParams.get("room")?.trim();
    const identity = searchParams.get("identity")?.trim();
    const name = searchParams.get("name")?.trim() || identity || "Participant";
    const role = (searchParams.get("role") as "host" | "guest") || "guest";

    return await handleTokenRequest({ room, identity, name, role });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process token request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleTokenRequest({
  room,
  identity,
  name,
  role,
}: {
  room?: string;
  identity?: string;
  name: string;
  role: "host" | "guest";
}) {
  const credentials = resolveLiveKitCredentials({
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
    livekitUrl: process.env.LIVEKIT_URL,
  });

  const credCheck = validateTokenCredentials(credentials);
  if (!credCheck.valid) {
    return NextResponse.json({ error: credCheck.error }, { status: credCheck.status || 500 });
  }

  const paramCheck = validateTokenParams({ room, identity });
  if (!paramCheck.valid) {
    return NextResponse.json({ error: paramCheck.error }, { status: paramCheck.status || 400 });
  }

  const tokenData = await createLiveKitToken({
    apiKey: credentials.apiKey,
    apiSecret: credentials.apiSecret,
    livekitUrl: credentials.livekitUrl,
    room: room!,
    identity: identity!,
    name,
    role,
  });

  return NextResponse.json(tokenData);
}
