import { StudioEditor } from "@/components/editor/StudioEditor";

interface EditorPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { roomId } = await params;
  return <StudioEditor roomId={decodeURIComponent(roomId)} />;
}
