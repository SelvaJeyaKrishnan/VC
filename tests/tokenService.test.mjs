import test from "node:test";
import assert from "node:assert/strict";
import {
  isPlaceholderCredential,
  normalizeLiveKitUrl,
  validateTokenCredentials,
  validateTokenParams,
  createLiveKitToken,
} from "../src/lib/tokenService.ts";

test("isPlaceholderCredential detects all dummy/placeholder values and protects against insecure setups", () => {
  assert.strictEqual(isPlaceholderCredential(""), true);
  assert.strictEqual(isPlaceholderCredential(undefined), true);
  assert.strictEqual(isPlaceholderCredential("wss://demo.livekit.cloud"), true);
  assert.strictEqual(isPlaceholderCredential("wss://your-project.livekit.cloud"), true);
  assert.strictEqual(isPlaceholderCredential("wss://example.com"), true);
  assert.strictEqual(isPlaceholderCredential("devkey1234567890"), true);
  assert.strictEqual(isPlaceholderCredential("devsecret"), true);
  assert.strictEqual(isPlaceholderCredential("apixxxx_sample_key"), true);
  assert.strictEqual(isPlaceholderCredential("sec_yyyy_sample_secret"), true);

  // Real credential shapes must NOT be flagged as placeholder
  assert.strictEqual(isPlaceholderCredential("wss://oneguest-production-abc.livekit.cloud"), false);
  assert.strictEqual(isPlaceholderCredential("APIxyzRealLiveKitKey999"), false);
  assert.strictEqual(isPlaceholderCredential("K2J48fkjsdf923485720498572093845"), false);
});

test("normalizeLiveKitUrl converts web URLs into valid WebSocket protocols", () => {
  assert.strictEqual(normalizeLiveKitUrl(""), "");
  assert.strictEqual(
    normalizeLiveKitUrl("https://studio.livekit.cloud"),
    "wss://studio.livekit.cloud"
  );
  assert.strictEqual(
    normalizeLiveKitUrl("http://localhost:7880"),
    "ws://localhost:7880"
  );
  assert.strictEqual(
    normalizeLiveKitUrl("wss://studio.livekit.cloud"),
    "wss://studio.livekit.cloud"
  );
  assert.strictEqual(
    normalizeLiveKitUrl("ws://127.0.0.1:7880"),
    "ws://127.0.0.1:7880"
  );
});

test("validateTokenCredentials rejects missing or placeholder environment variables", () => {
  // Empty
  const emptyCheck = validateTokenCredentials({});
  assert.strictEqual(emptyCheck.valid, false);
  assert.strictEqual(emptyCheck.status, 500);

  // Placeholder
  const placeholderCheck = validateTokenCredentials({
    apiKey: "devkey1234567890",
    apiSecret: "devsecret",
    livekitUrl: "wss://demo.livekit.cloud",
  });
  assert.strictEqual(placeholderCheck.valid, false);
  assert.strictEqual(placeholderCheck.status, 500);
  assert.match(placeholderCheck.error || "", /LiveKit credentials are not configured or are placeholder values/);

  // Valid
  const validCheck = validateTokenCredentials({
    apiKey: "APIACTUALKEY123456",
    apiSecret: "secret_actual_val_123456789012345678901234",
    livekitUrl: "https://studio.livekit.cloud",
  });
  assert.strictEqual(validCheck.valid, true);
});

test("validateTokenParams validates required room and participant identity", () => {
  // Missing room
  const noRoom = validateTokenParams({ identity: "user-123" });
  assert.strictEqual(noRoom.valid, false);
  assert.strictEqual(noRoom.status, 400);
  assert.strictEqual(noRoom.error, "Room name or code is required.");

  // Missing identity
  const noId = validateTokenParams({ room: "studio-og-123" });
  assert.strictEqual(noId.valid, false);
  assert.strictEqual(noId.status, 400);
  assert.strictEqual(noId.error, "Participant identity is required.");

  // Valid
  const validParams = validateTokenParams({ room: "studio-og-123", identity: "host-alex" });
  assert.strictEqual(validParams.valid, true);
});

test("createLiveKitToken generates genuine signed LiveKit JWT with correct grants and metadata", async () => {
  const result = await createLiveKitToken({
    apiKey: "APIACTUALKEY123456",
    apiSecret: "secret_actual_val_123456789012345678901234",
    livekitUrl: "https://studio.livekit.cloud",
    room: "studio-interview-99",
    identity: "host-morgan",
    name: "Morgan Freeman",
    role: "host",
  });

  assert.strictEqual(result.room, "studio-interview-99");
  assert.strictEqual(result.identity, "host-morgan");
  assert.strictEqual(result.name, "Morgan Freeman");
  assert.strictEqual(result.role, "host");
  assert.strictEqual(result.serverUrl, "wss://studio.livekit.cloud");

  // JWT string verification
  assert.strictEqual(typeof result.token, "string");
  const segments = result.token.split(".");
  assert.strictEqual(segments.length, 3, "Valid JWT must have header.payload.signature");

  // Decode payload to verify grants and metadata
  const payload = JSON.parse(Buffer.from(segments[1], "base64url").toString("utf-8"));
  assert.strictEqual(payload.sub, "host-morgan");
  assert.strictEqual(payload.name, "Morgan Freeman");
  assert.strictEqual(payload.video.room, "studio-interview-99");
  assert.strictEqual(payload.video.roomJoin, true);
  assert.strictEqual(payload.video.canPublish, true);
  assert.strictEqual(payload.video.canSubscribe, true);

  const metadata = JSON.parse(payload.metadata);
  assert.strictEqual(metadata.role, "host");
  assert.strictEqual(metadata.studio, "OneGuest Studio");
});
