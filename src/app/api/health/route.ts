import { resolveLiveKitCredentials, isPlaceholderCredential } from "../../../lib/tokenService.ts";

export const dynamic = "force-dynamic";

export async function GET() {
  const credentials = resolveLiveKitCredentials({
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
    livekitUrl: process.env.LIVEKIT_URL,
  });

  const isLiveKitConfigured = Boolean(
    credentials.apiKey &&
    credentials.apiSecret &&
    credentials.livekitUrl &&
    !isPlaceholderCredential(credentials.apiKey) &&
    !isPlaceholderCredential(credentials.apiSecret) &&
    !isPlaceholderCredential(credentials.livekitUrl)
  );

  return Response.json({
    status: "ok",
    service: "oneguest-studio",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development",
    livekitConfigured: isLiveKitConfigured,
  });
}
