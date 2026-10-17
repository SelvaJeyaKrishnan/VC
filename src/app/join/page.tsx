import { redirect } from "next/navigation";
import { JoinClient } from "./JoinClient";

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

  const name = typeof params.name === "string" ? params.name : "";

  // If a private room invitation code is already provided, direct guest straight into the Green Room
  if (room) {
    const query = new URLSearchParams({ role: "guest" });
    if (name) query.set("name", name);
    redirect(`/room/${encodeURIComponent(room)}?${query.toString()}`);
  }

  // Otherwise, render a clean, focused guest entry portal
  return <JoinClient />;
}
