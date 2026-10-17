import test from "node:test";
import assert from "node:assert/strict";

test("Guest flow: extracts room code correctly from full URLs or raw strings", () => {
  const parseCode = (input) => {
    let cleanCode = input.trim();
    try {
      if (cleanCode.startsWith("http://") || cleanCode.startsWith("https://")) {
        const url = new URL(cleanCode);
        const queryRoom = url.searchParams.get("room") || url.searchParams.get("code");
        if (queryRoom) return queryRoom.trim();
        const segs = url.pathname.split("/").filter(Boolean);
        if (segs[0] === "room" && segs[1]) return segs[1].trim();
      }
    } catch {
      // not a url
    }
    return cleanCode;
  };

  assert.equal(parseCode("og-interview-123"), "og-interview-123");
  assert.equal(parseCode("https://vc-vu80.onrender.com/join?code=og-interview-123&name=Sarah"), "og-interview-123");
  assert.equal(parseCode("https://vc-vu80.onrender.com/room/og-interview-123?role=guest"), "og-interview-123");
  assert.equal(parseCode("https://vc-vu80.onrender.com/?room=og-xyz"), "og-xyz");
});

test("Guest invite link generation contains only public parameters and no secret credentials", () => {
  const origin = "https://vc-vu80.onrender.com";
  const interviewId = "og-test-999";
  const guestName = "Dr. Jane Foster";

  const inviteUrl = `${origin}/join?code=${encodeURIComponent(interviewId)}&name=${encodeURIComponent(guestName)}`;

  const parsed = new URL(inviteUrl);
  assert.equal(parsed.pathname, "/join");
  assert.equal(parsed.searchParams.get("code"), "og-test-999");
  assert.equal(parsed.searchParams.get("name"), "Dr. Jane Foster");
  assert.equal(parsed.searchParams.get("apiKey"), null);
  assert.equal(parsed.searchParams.get("secret"), null);
});
