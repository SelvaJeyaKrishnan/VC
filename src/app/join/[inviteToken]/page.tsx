import { notFound } from "next/navigation";
import { interviewStore } from "@/lib/interviewStore";
import { JoinClient } from "../JoinClient";

interface GuestInvitePageProps {
  params: Promise<{ inviteToken: string }>;
  searchParams: Promise<{ name?: string; error?: string }>;
}

export default async function GuestInvitePage({ params, searchParams }: GuestInvitePageProps) {
  const [{ inviteToken }, query] = await Promise.all([params, searchParams]);
  const access = interviewStore.validateInvitation(inviteToken);
  if (
    !access.interview ||
    !Number.isFinite(Date.parse(access.interview.inviteExpiresAt || "")) ||
    Date.parse(access.interview.inviteExpiresAt || "") <= Date.now()
  ) {
    notFound();
  }

  const guestName = typeof query.name === "string" ? query.name : access.interview.guestName;
  return (
    <JoinClient
      initialCode={`Invitation for ${access.interview.title}`}
      initialName={guestName}
      initialInviteToken={inviteToken}
      initialRoomId={access.interview.id}
      initialError={query.error}
    />
  );
}
