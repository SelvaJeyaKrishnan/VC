import { NextRequest, NextResponse } from "next/server";
import { authorizeStudioOwner } from "@/lib/studioAuth";
import { interviewStore } from "@/lib/interviewStore";
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
    const body = (await req.json().catch(() => ({}))) as TokenRequestParams & { passcode?: string };
    const room = body.room?.trim();
    const identity = body.identity?.trim();
    const name = body.name?.trim() || identity || "Participant";
    const role = body.role === "host" ? "host" : "guest";

    return await handleTokenRequest({
      room,
      identity,
      name,
      role,
      passcode: body.passcode,
      inviteToken: body.inviteToken,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process token request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json(
    { error: "Use POST to request a studio token." },
    { status: 405, headers: { Allow: "POST" } }
  );
}

async function handleTokenRequest({
  room,
  identity,
  name,
  role,
  passcode,
  inviteToken,
}: {
  room?: string;
  identity?: string;
  name: string;
  role: "host" | "guest";
  passcode?: string;
  inviteToken?: string;
}) {
  const paramCheck = validateTokenParams({ room, identity });
  if (!paramCheck.valid) {
    return NextResponse.json({ error: paramCheck.error }, { status: paramCheck.status || 400 });
  }

  if (role === "host") {
    const authorization = await authorizeStudioOwner(room!);
    if (!authorization.authorized) {
      return NextResponse.json(
        { error: authorization.status === 401 ? "Sign in before entering as host." : "Studio not found." },
        { status: authorization.status }
      );
    }

  } else {
    const access = inviteToken
      ? interviewStore.validateInvitation(inviteToken, passcode)
      : { valid: false, reason: "A valid guest invitation link is required." };
    if (!access.valid || access.interview?.id !== room) {
      return NextResponse.json(
        { error: access.reason || "Guest invitation is invalid or does not match this studio." },
        { status: access.interview ? 403 : 404 }
      );
    }
  }

  const credentials = resolveLiveKitCredentials({
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
    livekitUrl: process.env.LIVEKIT_URL,
  });
  const credCheck = validateTokenCredentials(credentials);
  if (!credCheck.valid) {
    return NextResponse.json({ error: credCheck.error }, { status: credCheck.status || 500 });
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
