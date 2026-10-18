import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/studio/DashboardLayout";
import { getSignedInOwnerEmail } from "@/lib/studioAuth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!(await getSignedInOwnerEmail())) redirect("/login");
  return <DashboardLayout />;
}
