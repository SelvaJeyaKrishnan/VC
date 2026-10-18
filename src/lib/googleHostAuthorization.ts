export type GoogleHostProfile = {
  email?: unknown;
  email_verified?: unknown;
  verified_email?: unknown;
} | null | undefined;

type GoogleHostAuthorizationResult = {
  authorized: boolean;
  reason:
    | "missing_configuration"
    | "missing_profile"
    | "missing_email"
    | "unverified_email"
    | "email_mismatch"
    | "authorized";
};

export function evaluateGoogleHostAuthorization(
  profile: GoogleHostProfile,
  authorizedHostEmail: string | undefined
): GoogleHostAuthorizationResult {
  const expectedEmail = authorizedHostEmail?.trim().toLowerCase();
  if (!expectedEmail) return { authorized: false, reason: "missing_configuration" };
  if (!profile) return { authorized: false, reason: "missing_profile" };
  if (typeof profile.email !== "string" || !profile.email.trim()) {
    return { authorized: false, reason: "missing_email" };
  }

  if (profile.email_verified !== true && profile.verified_email !== true) {
    return { authorized: false, reason: "unverified_email" };
  }
  if (profile.email.trim().toLowerCase() !== expectedEmail) {
    return { authorized: false, reason: "email_mismatch" };
  }

  return { authorized: true, reason: "authorized" };
}
