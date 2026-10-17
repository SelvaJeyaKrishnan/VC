import { NextRequest, NextResponse } from "next/server";
import { interviewStore } from "@/lib/interviewStore";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const interview = interviewStore.getById(id);

    if (!interview) {
      return NextResponse.json(
        { error: "Interview session not found or link has expired." },
        { status: 404 }
      );
    }

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
