import { NextRequest, NextResponse } from "next/server";
import { interviewStore } from "@/lib/interviewStore";
import { authorizeStudioOwner } from "@/lib/studioAuth";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const authorization = await authorizeStudioOwner(id);
    if (!authorization.authorized) {
      return NextResponse.json({ error: "Studio not found." }, { status: authorization.status });
    }
    const interview = authorization.interview;

    return NextResponse.json({
      interview: {
        id: interview.id,
        title: interview.title,
        hostName: interview.hostName,
        guestName: interview.guestName,
        status: interview.status,
        createdAt: interview.createdAt,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load interview";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const authorization = await authorizeStudioOwner(id);
    if (!authorization.authorized) {
      return NextResponse.json(
        { error: authorization.status === 401 ? "Sign in to delete this studio." : "Studio not found." },
        { status: authorization.status }
      );
    }

    const deleted = interviewStore.delete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete interview";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
