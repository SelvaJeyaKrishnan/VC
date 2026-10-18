import { StudioEditor } from "@/components/editor/StudioEditor";
import { authorizeStudioOwner } from "@/lib/studioAuth";
import { notFound, redirect } from "next/navigation";

interface EditorPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { roomId } = await params;
  const decodedRoomId = decodeURIComponent(roomId);
  const authorization = await authorizeStudioOwner(decodedRoomId);
  if (!authorization.authorized) {
    if (authorization.status === 401) redirect("/login");
    notFound();
  }
  return <StudioEditor roomId={decodedRoomId} />;
}
