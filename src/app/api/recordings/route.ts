import { NextRequest, NextResponse } from "next/server";
import { recordingStore } from "@/lib/recordingStore";
import { authorizeStudioOwner, getSignedInOwnerEmail } from "@/lib/studioAuth";
import { interviewStore } from "@/lib/interviewStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const roomId = req.nextUrl.searchParams.get("roomId");
    if (roomId) {
      const authorization = await authorizeStudioOwner(roomId);
      if (!authorization.authorized) {
        return NextResponse.json(
          { error: authorization.status === 401 ? "Sign in to view recordings." : "Recording not found." },
          { status: authorization.status }
        );
      }

      const manifest = recordingStore.getManifest(roomId);
      return NextResponse.json({ session: manifest });
    }

    const ownerEmail = await getSignedInOwnerEmail();
    if (!ownerEmail) {
      return NextResponse.json({ error: "Sign in to view recordings." }, { status: 401 });
    }

    const ownedRoomIds = new Set(interviewStore.getAllForOwner(ownerEmail).map((interview) => interview.id));
    const sessions = recordingStore.getAllSessions().filter((session) => ownedRoomIds.has(session.roomId));
    return NextResponse.json({ sessions });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to retrieve recordings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
