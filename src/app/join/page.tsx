import { redirect } from "next/navigation";

interface JoinPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const params = await searchParams;
  const room =
    typeof params.room === "string"
      ? params.room
      : typeof params.code === "string"
      ? params.code
      : "";

  if (room) {
    redirect(`/?tab=guest&room=${encodeURIComponent(room)}`);
  }

  redirect("/?tab=guest");
}
