import { JoinClient } from "./JoinClient";

interface JoinPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const params = await searchParams;
  const room = typeof params.code === "string" ? params.code : "";

  const name = typeof params.name === "string" ? params.name : "";
  const error = typeof params.error === "string" ? params.error : undefined;

  return <JoinClient initialCode={room} initialName={name} initialError={error} />;
}
