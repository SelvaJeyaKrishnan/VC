import { redirect } from "next/navigation";
import { HostLogin } from "@/components/auth/HostLogin";
import { getSignedInOwnerEmail } from "@/lib/studioAuth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSignedInOwnerEmail()) redirect("/dashboard");
  return <HostLogin />;
}
