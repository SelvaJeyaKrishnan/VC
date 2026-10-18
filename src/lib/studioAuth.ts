import { getServerSession } from "next-auth";
import { interviewStore } from "@/lib/interviewStore";
import { authOptions } from "@/lib/auth";
import { getMissingAuthEnvironment } from "@/lib/authConfiguration";

export async function getSignedInOwnerEmail(): Promise<string | null> {
  if (getMissingAuthEnvironment(process.env).length > 0) return null;
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  const authorizedHostEmail = process.env.AUTHORIZED_HOST_EMAIL?.trim().toLowerCase();
  return email && authorizedHostEmail && email === authorizedHostEmail ? email : null;
}

export async function authorizeStudioOwner(roomId: string) {
  const ownerEmail = await getSignedInOwnerEmail();
  if (!ownerEmail) {
    return { authorized: false as const, status: 401 as const, ownerEmail: null };
  }

  const interview = interviewStore.getById(roomId);
  const legacyOwner = process.env.LEGACY_DATA_OWNER_EMAIL?.trim().toLowerCase();
  if (!interview || (interview.ownerEmail || legacyOwner)?.trim().toLowerCase() !== ownerEmail) {
    return { authorized: false as const, status: 404 as const, ownerEmail: null };
  }

  return { authorized: true as const, status: 200 as const, ownerEmail, interview };
}
