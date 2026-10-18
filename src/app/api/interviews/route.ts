import { NextRequest, NextResponse } from "next/server";
import { interviewStore } from "@/lib/interviewStore";
import { getSignedInOwnerEmail } from "@/lib/studioAuth";
import { isValidRoomId } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ownerEmail = await getSignedInOwnerEmail();
    if (!ownerEmail) {
      return NextResponse.json({ error: "Sign in to view studio sessions." }, { status: 401 });
    }

    const list = interviewStore.getAllForOwner(ownerEmail).map(({ passcode: _passcode, ...interview }) => interview);
    return NextResponse.json({ interviews: list });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch interviews";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ownerEmail = await getSignedInOwnerEmail();
    if (!ownerEmail) {
      return NextResponse.json({ error: "Sign in to create a studio session." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const title = (body.title || "").trim();
    const hostName = (body.hostName || "Host").trim();
    const guestName = (body.guestName || "Guest").trim();
    const id = (body.id || "").trim();
    const passcode = (body.passcode || "").trim();

    if (!title) {
      return NextResponse.json({ error: "Interview title is required." }, { status: 400 });
    }

    if (id && !isValidRoomId(id)) {
      return NextResponse.json({ error: "Studio room ID contains unsupported characters." }, { status: 400 });
    }

    if (id && interviewStore.getById(id)) {
      return NextResponse.json({ error: "That studio room ID is already in use." }, { status: 409 });
    }

    const interview = interviewStore.create({
      title,
      hostName,
      guestName,
      id: id || undefined,
      passcode: passcode || undefined,
      ownerEmail,
    });

    const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      (forwardedHost ? `${forwardedProto}://${forwardedHost}` : req.nextUrl.origin);

    const inviteUrl = `${origin}/join/${encodeURIComponent(interview.inviteToken)}`;

    return NextResponse.json({
      interview: (({ passcode: _passcode, ...safeInterview }) => safeInterview)(interview),
      guestPasscode: interview.passcode,
      inviteUrl,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create interview";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
