import { redirect } from "next/navigation";
import { getSignedInOwnerEmail } from "@/lib/studioAuth";

export const dynamic = "force-dynamic";

export default async function RecordingsPage() {
  if (!(await getSignedInOwnerEmail())) redirect("/login");
  redirect("/dashboard?tab=recordings");
}
