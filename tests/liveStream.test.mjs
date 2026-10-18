import test from "node:test";
import assert from "node:assert/strict";
import { STREAMING_UNAVAILABLE } from "../src/lib/streamingAvailability.ts";

test("Live streaming reports unavailable until a real RTMP egress service is configured", async () => {
  assert.equal(STREAMING_UNAVAILABLE.available, false);
  assert.equal(STREAMING_UNAVAILABLE.isLive, false);
  assert.match(STREAMING_UNAVAILABLE.reason, /RTMP output is unavailable/);
});
