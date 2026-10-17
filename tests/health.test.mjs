import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../src/app/api/health/route.ts";

test("Health check endpoint returns status ok and metadata for Render monitoring", async () => {
  const res = await GET();
  assert.strictEqual(res.status, 200);

  const data = await res.json();
  assert.strictEqual(data.status, "ok");
  assert.strictEqual(data.service, "oneguest-studio");
  assert.strictEqual(typeof data.timestamp, "string");
  assert.strictEqual(typeof data.uptimeSeconds, "number");
  assert.strictEqual(typeof data.livekitConfigured, "boolean");
});
