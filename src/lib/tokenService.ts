import { AccessToken } from "livekit-server-sdk";

export interface TokenRequestParams {
  room?: string;
  identity?: string;
  name?: string;
  role?: "host" | "guest";
}

export interface TokenValidationResult {
  valid: boolean;
  error?: string;
  status?: number;
}

export function isPlaceholderCredential(val?: string): boolean {
  if (!val) return true;
  const lower = val.toLowerCase().trim();
  return (
    lower.includes("demo.livekit.cloud") ||
    lower.includes("your-project") ||
    lower.includes("example.com") ||
    lower.includes("devkey1234567890") ||
    lower.includes("devsecret") ||
    lower.startsWith("apixxxx") ||
    lower.startsWith("sec_yyyy")
  );
}

export function normalizeLiveKitUrl(url?: string): string {
  if (!url) return "";
  let trimmed = url.trim();
  if (trimmed.startsWith("https://")) {
    trimmed = "wss://" + trimmed.slice(8);
  } else if (trimmed.startsWith("http://")) {
    trimmed = "ws://" + trimmed.slice(7);
  }
  return trimmed;
}

export function validateTokenCredentials(env: {
  apiKey?: string;
  apiSecret?: string;
  livekitUrl?: string;
}): TokenValidationResult {
  const apiKey = env.apiKey?.trim();
  const apiSecret = env.apiSecret?.trim();
  const livekitUrl = normalizeLiveKitUrl(env.livekitUrl);

  if (
    !apiKey ||
    !apiSecret ||
    !livekitUrl ||
    isPlaceholderCredential(apiKey) ||
    isPlaceholderCredential(apiSecret) ||
    isPlaceholderCredential(env.livekitUrl)
  ) {
    return {
      valid: false,
      status: 500,
      error:
        "LiveKit credentials are not configured or are placeholder values. Please set your real LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in your .env.local file from https://cloud.livekit.io",
    };
  }

  if (!livekitUrl.startsWith("wss://") && !livekitUrl.startsWith("ws://")) {
    return {
      valid: false,
      status: 500,
      error:
        "LIVEKIT_URL must be a valid WebSocket URL starting with wss:// (or ws:// for local testing).",
    };
  }

  return { valid: true };
}

export function validateTokenParams(params: TokenRequestParams): TokenValidationResult {
  if (!params.room || !params.room.trim()) {
    return { valid: false, status: 400, error: "Room name or code is required." };
  }

  if (!params.identity || !params.identity.trim()) {
    return { valid: false, status: 400, error: "Participant identity is required." };
  }

  return { valid: true };
}

export async function createLiveKitToken({
  apiKey,
  apiSecret,
  livekitUrl,
  room,
  identity,
  name,
  role = "guest",
}: {
  apiKey: string;
  apiSecret: string;
  livekitUrl: string;
  room: string;
  identity: string;
  name?: string;
  role?: "host" | "guest";
}): Promise<{
  token: string;
  serverUrl: string;
  room: string;
  identity: string;
  name: string;
  role: string;
}> {
  const normalizedUrl = normalizeLiveKitUrl(livekitUrl);
  const participantName = name?.trim() || identity;

  // Create token with 6 hours TTL for studio interview sessions
  const at = new AccessToken(apiKey.trim(), apiSecret.trim(), {
    identity: identity.trim(),
    name: participantName,
    metadata: JSON.stringify({ role, studio: "OneGuest Studio" }),
    ttl: "6h",
  });

  at.addGrant({
    room: room.trim(),
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return {
    token,
    serverUrl: normalizedUrl,
    room: room.trim(),
    identity: identity.trim(),
    name: participantName,
    role,
  };
}
