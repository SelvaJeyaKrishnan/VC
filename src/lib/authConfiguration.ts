const requiredAuthEnvironment = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "AUTHORIZED_HOST_EMAIL",
] as const;

export function getMissingAuthEnvironment(
  environment: Record<string, string | undefined>
): string[] {
  return requiredAuthEnvironment.filter((key) => !environment[key]?.trim());
}
