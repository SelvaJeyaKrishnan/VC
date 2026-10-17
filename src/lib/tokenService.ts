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

/**
 * Strips accidental prefixes (e.g. "LIVEKIT_API_KEY="), quotes, and isolates a single token.
 */
export function cleanCredential(val?: string, keyPrefix?: string): string {
  if (!val) return "";
  let trimmed = val.trim();

  // If multi-line, find the line matching the key prefix if available
  if (trimmed.includes("\n") || trimmed.includes("\r")) {
    const lines = trimmed.split(/[\r\n]+/);
    for (const line of lines) {
      const l = line.trim();
      if (keyPrefix && l.toUpperCase().startsWith(keyPrefix.toUpperCase() + "=")) {
        trimmed = l;
        break;
      }
    }
  }

  // Strip prefix like "LIVEKIT_API_KEY="
  if (keyPrefix) {
    const regex = new RegExp(`^${keyPrefix}\\s*=\\s*`, "i");
    trimmed = trimmed.replace(regex, "").trim();
  }

  // Strip surrounding quotes
  trimmed = trimmed.replace(/^["'`]|["'`]$/g, "").trim();

  // Take only the first continuous token (credentials never contain spaces or newlines)
  return trimmed.split(/[\s\r\n]+/)[0] || "";
}

/**
 * Strictly normalizes and isolates the WebSocket server URL.
 * Handles accidental multi-line pastes, env key prefixes, quotes, and web URLs.
 * GUARANTEES the return value is a clean, single-line WebSocket URL with zero secrets.
 */
export function normalizeLiveKitUrl(rawUrl?: string): string {
  if (!rawUrl) return "";

  // 1. If multi-line (e.g. accidental bulk .env paste), isolate the URL line
  const lines = rawUrl.split(/[\r\n]+/);
  let targetLine = lines[0]?.trim() || "";
  for (const line of lines) {
    const l = line.trim();
    if (
      l.toUpperCase().startsWith("LIVEKIT_URL=") ||
      l.startsWith("wss://") ||
      l.startsWith("ws://") ||
      l.startsWith("https://") ||
      l.startsWith("http://") ||
      l.includes(".livekit.cloud")
    ) {
      targetLine = l;
      break;
    }
  }

  // 2. Strip optional "LIVEKIT_URL=" prefix
  targetLine = targetLine.replace(/^LIVEKIT_URL\s*=\s*/i, "").trim();

  // 3. Strip surrounding quotes
  targetLine = targetLine.replace(/^["'`]|["'`]$/g, "").trim();

  // 4. Extract only the URL portion if extra text was appended on the same line
  const urlMatch = targetLine.match(/^(https?|wss?):\/\/[^\s"'<>]+/i);
  let cleanUrl = urlMatch ? urlMatch[0] : targetLine.split(/\s+/)[0];

  if (!cleanUrl) return "";

  // 5. Remove trailing slashes
  cleanUrl = cleanUrl.replace(/\/+$/, "");

  // 6. Ensure websocket protocol
  if (cleanUrl.startsWith("https://")) {
    cleanUrl = "wss://" + cleanUrl.slice(8);
  } else if (cleanUrl.startsWith("http://")) {
    cleanUrl = "ws://" + cleanUrl.slice(7);
  }

  // 7. Security check: Ensure the URL contains NO newlines, spaces, or env text
  if (cleanUrl.includes("\n") || cleanUrl.includes("\r") || cleanUrl.includes(" ")) {
    cleanUrl = cleanUrl.split(/[\s\r\n]+/)[0];
  }

  return cleanUrl;
}

/**
 * Resolves LiveKit configuration defensively.
 * If credentials were accidentally pasted as a multi-line block into LIVEKIT_URL,
 * it extracts the respective keys automatically while keeping the URL clean.
 */
export function resolveLiveKitCredentials(env: {
  apiKey?: string;
  apiSecret?: string;
  livekitUrl?: string;
}): {
  apiKey: string;
  apiSecret: string;
  livekitUrl: string;
} {
  const rawUrl = env.livekitUrl || "";
  let apiKey = cleanCredential(env.apiKey, "LIVEKIT_API_KEY");
  let apiSecret = cleanCredential(env.apiSecret, "LIVEKIT_API_SECRET");
  const livekitUrl = normalizeLiveKitUrl(rawUrl);

  // Fallback: If apiKey or apiSecret is missing or empty, attempt to extract from multi-line rawUrl
  if (!apiKey && rawUrl) {
    const match = rawUrl.match(/LIVEKIT_API_KEY\s*=\s*([^\s\r\n"']+)/i);
    if (match) apiKey = match[1].trim();
  }
  if (!apiSecret && rawUrl) {
    const match = rawUrl.match(/LIVEKIT_API_SECRET\s*=\s*([^\s\r\n"']+)/i);
    if (match) apiSecret = match[1].trim();
  }

  return { apiKey, apiSecret, livekitUrl };
}

export function validateTokenCredentials(env: {
  apiKey?: string;
  apiSecret?: string;
  livekitUrl?: string;
}): TokenValidationResult {
  const { apiKey, apiSecret, livekitUrl } = resolveLiveKitCredentials(env);

  if (
    !apiKey ||
    !apiSecret ||
    !livekitUrl ||
    isPlaceholderCredential(apiKey) ||
    isPlaceholderCredential(apiSecret) ||
    isPlaceholderCredential(livekitUrl)
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

  if (/[\s\r\n]/.test(livekitUrl)) {
    return {
      valid: false,
      status: 500,
      error: "LIVEKIT_URL contains invalid whitespace or newline characters.",
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
  const cleanUrl = normalizeLiveKitUrl(livekitUrl);
  const cleanKey = cleanCredential(apiKey, "LIVEKIT_API_KEY");
  const cleanSecret = cleanCredential(apiSecret, "LIVEKIT_API_SECRET");
  const participantName = name?.trim() || identity.trim();

  // Create token with 6 hours TTL for studio interview sessions
  const at = new AccessToken(cleanKey, cleanSecret, {
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
    serverUrl: cleanUrl,
    room: room.trim(),
    identity: identity.trim(),
    name: participantName,
    role,
  };
}
