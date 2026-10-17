import { NextRequest, NextResponse } from "next/server";
import { interviewStore } from "@/lib/interviewStore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = interviewStore.getAll();
    return NextResponse.json({ interviews: list });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch interviews";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = (body.title || "").trim();
    const hostName = (body.hostName || "Host").trim();
    const guestName = (body.guestName || "Guest").trim();
    const id = (body.id || "").trim();
    const passcode = (body.passcode || "").trim();

    if (!title) {
      return NextResponse.json({ error: "Interview title is required." }, { status: 400 });
    }

    const interview = interviewStore.create({
      title,
      hostName,
      guestName,
      id: id || undefined,
      passcode: passcode || undefined,
    });

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.nextUrl.origin ||
      "http://localhost:3000";

    const inviteUrl = `${origin}/?room=${encodeURIComponent(interview.id)}&name=${encodeURIComponent(
      interview.guestName
    )}`;

    return NextResponse.json({
      interview,
      inviteUrl,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create interview";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
