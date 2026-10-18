import test from "node:test";
import assert from "node:assert/strict";
import { generateRoomId, generateGuestCode, getInitials, cn, isValidRoomId } from "../src/lib/utils.ts";

test("generateRoomId produces valid prefixed studio room IDs", () => {
  const defaultRoom = generateRoomId();
  assert.match(defaultRoom, /^studio-[a-z0-9]{6}$/);

  const customRoom = generateRoomId("og");
  assert.match(customRoom, /^og-[a-z0-9]{6}$/);

  // Check uniqueness across 50 generations
  const set = new Set();
  for (let i = 0; i < 50; i++) {
    const id = generateRoomId("test");
    assert.strictEqual(set.has(id), false, `Collision detected on ${id}`);
    set.add(id);
  }
});

test("generateGuestCode produces 6-digit formatted OneGuest code", () => {
  const code = generateGuestCode();
  assert.match(code, /^OG-\d{6}$/);
});

test("isValidRoomId rejects path and URL control characters", () => {
  assert.strictEqual(isValidRoomId("studio-og-123"), true);
  assert.strictEqual(isValidRoomId("../outside"), false);
  assert.strictEqual(isValidRoomId("C:\\outside"), false);
  assert.strictEqual(isValidRoomId("room?admin=true"), false);
});

test("getInitials computes correct user initials", () => {
  assert.strictEqual(getInitials(""), "P");
  assert.strictEqual(getInitials("Alex"), "AL");
  assert.strictEqual(getInitials("Alex Morgan"), "AM");
  assert.strictEqual(getInitials("Sarah Jane Connor"), "SC");
  assert.strictEqual(getInitials("   David   Attenborough  "), "DA");
});

test("cn merges conditional classnames correctly", () => {
  assert.strictEqual(cn("px-4 py-2", "text-white"), "px-4 py-2 text-white");
  assert.strictEqual(cn("px-4", false && "hidden", "py-2"), "px-4 py-2");
  assert.strictEqual(cn("px-4", undefined, null, "px-6"), "px-6");
});
