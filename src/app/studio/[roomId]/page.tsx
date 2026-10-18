import { redirect, notFound } from "next/navigation";
import { RoomClient } from "@/components/studio/RoomClient";
import { authorizeStudioOwner } from "@/lib/studioAuth";

interface HostStudioPageProps {
  params: Promise<{ roomId: string }>;
}

export const dynamic = "force-dynamic";

export default async function HostStudioPage({ params }: HostStudioPageProps) {
  const { roomId } = await params;
  const authorization = await authorizeStudioOwner(decodeURIComponent(roomId));
  if (!authorization.authorized) {
    if (authorization.status === 401) redirect("/login");
    notFound();
  }

  return (
    <RoomClient
      roomId={authorization.interview.id}
      initialInviteToken={authorization.interview.inviteToken}
      initialRole="host"
      initialName={authorization.interview.hostName}
      initialTitle={authorization.interview.title}
    />
  );
}
