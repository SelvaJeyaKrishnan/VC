import { RoomClient } from "@/components/studio/RoomClient";

interface RoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
  searchParams: Promise<{
    role?: string;
    name?: string;
    title?: string;
  }>;
}

export default async function RoomPage({ params, searchParams }: RoomPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const roomId = decodeURIComponent(resolvedParams.roomId);
  const role = resolvedSearchParams.role;
  const name = resolvedSearchParams.name;
  const title = resolvedSearchParams.title;

  return (
    <RoomClient
      roomId={roomId}
      initialRole={role}
      initialName={name}
      initialTitle={title}
    />
  );
}
