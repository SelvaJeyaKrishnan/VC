import { RoomClient } from "@/components/studio/RoomClient";
import { redirect } from "next/navigation";
import { interviewStore } from "@/lib/interviewStore";
import { authorizeStudioOwner } from "@/lib/studioAuth";

interface RoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
  searchParams: Promise<{
    role?: string;
    name?: string;
    title?: string;
    invitationToken?: string;
  }>;
}

export default async function RoomPage({ params, searchParams }: RoomPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const roomId = decodeURIComponent(resolvedParams.roomId);
  const role = resolvedSearchParams.role;
  const name = resolvedSearchParams.name;
  const title = resolvedSearchParams.title;
  const invitationToken = resolvedSearchParams.invitationToken;
  let roomName = title;
  let studioInviteToken = invitationToken;

  if (role === "host") {
    const authorization = await authorizeStudioOwner(roomId);
    if (!authorization.authorized) redirect("/login");
    roomName ||= authorization.interview.title;
    studioInviteToken = authorization.interview.inviteToken;
  } else {
    const access = invitationToken
      ? interviewStore.validateInvitation(invitationToken)
      : { valid: false };
    const invitationExpiry = Date.parse(access.interview?.inviteExpiresAt || "");
    if (
      !access.interview ||
      access.interview.id !== roomId ||
      !Number.isFinite(invitationExpiry) ||
      invitationExpiry <= Date.now()
    ) {
      redirect(
        `/join/${encodeURIComponent(invitationToken || "")}?error=invalid_invitation${
          name ? `&name=${encodeURIComponent(name)}` : ""
        }`
      );
    }
    roomName ||= access.interview.title;
  }

  return (
    <RoomClient
      roomId={roomId}
      initialRole={role}
      initialName={name}
      initialTitle={roomName}
      initialInviteToken={studioInviteToken}
    />
  );
}
