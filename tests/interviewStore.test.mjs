import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { interviewStore } from "../src/lib/interviewStore.ts";

test("interviewStore creates, reads, updates, and deletes interview sessions", () => {
  const testId = `test-interview-${Date.now()}`;
  
  // 1. Create
  const created = interviewStore.create({
    id: testId,
    title: "Unit Test Interview Session",
    hostName: "Host Tester",
    guestName: "Guest Tester",
    passcode: "123456",
    ownerEmail: "Owner@Example.com",
  });

  assert.strictEqual(created.id, testId);
  assert.strictEqual(created.title, "Unit Test Interview Session");
  assert.strictEqual(created.hostName, "Host Tester");
  assert.strictEqual(created.guestName, "Guest Tester");
  assert.strictEqual(created.passcode, "123456");
  assert.strictEqual(created.status, "scheduled");
  assert.strictEqual(created.recordingStatus, "not_started");
  assert.match(created.inviteToken, /^[A-Za-z0-9_-]{43}$/);
  assert.ok(Date.parse(created.inviteExpiresAt) > Date.now());

  // 2. Read by ID
  const fetched = interviewStore.getById(testId);
  assert.notStrictEqual(fetched, null);
  assert.strictEqual(fetched?.id, testId);

  // 3. Access validation
  const validAccess = interviewStore.validateAccess(testId, "123456");
  assert.strictEqual(validAccess.valid, true);

  const invalidPasscode = interviewStore.validateAccess(testId, "wrong-pass");
  assert.strictEqual(invalidPasscode.valid, false);
  assert.strictEqual(interviewStore.validateAccess(testId).valid, false);
  assert.strictEqual(interviewStore.getAllForOwner("owner@example.com").some((room) => room.id === testId), true);
  assert.strictEqual(interviewStore.getAllForOwner("other@example.com").some((room) => room.id === testId), false);
  assert.strictEqual(interviewStore.validateInvitation(created.inviteToken).valid, false);
  assert.strictEqual(interviewStore.validateInvitation(created.inviteToken, "123456").valid, true);
  assert.strictEqual(interviewStore.validateInvitation("invalid-token").valid, false);
  assert.strictEqual(interviewStore.validateInvitation(created.inviteToken, "wrong-pass").valid, false);

  const nonexistent = interviewStore.validateAccess("non-existent-room-9999");
  assert.strictEqual(nonexistent.valid, false);

  // 4. Update
  const updated = interviewStore.update(testId, {
    status: "in_progress",
    recordingStatus: "recording",
  });

  test("interviewStore rejects expired invitations", () => {
    const testId = `test-expired-invite-${Date.now()}`;
    const created = interviewStore.create({
      id: testId,
      title: "Expired Invitation Test",
      hostName: "Host Tester",
      guestName: "Guest Tester",
      ownerEmail: "owner@example.com",
    });

    interviewStore.update(testId, { inviteExpiresAt: new Date(Date.now() - 1000).toISOString() });
    const expired = interviewStore.validateInvitation(created.inviteToken);
    assert.strictEqual(expired.valid, false);
    assert.match(expired.reason || "", /expired/);
    interviewStore.delete(testId);
  });
  assert.strictEqual(updated?.status, "in_progress");
  assert.strictEqual(updated?.recordingStatus, "recording");

  // Verify persistence
  const reFetched = interviewStore.getById(testId);
  assert.strictEqual(reFetched?.status, "in_progress");
  assert.strictEqual(reFetched?.recordingStatus, "recording");

  // 5. Delete cleanup
  const deleted = interviewStore.delete(testId);
  assert.strictEqual(deleted, true);
  assert.strictEqual(interviewStore.getById(testId), null);
});

test("interviewStore permits access when a studio has no passcode", () => {
  const testId = `test-public-interview-${Date.now()}`;
  interviewStore.create({
    id: testId,
    title: "Public Test Interview",
    hostName: "Host Tester",
    guestName: "Guest Tester",
    ownerEmail: "owner@example.com",
  });

  assert.strictEqual(interviewStore.validateAccess(testId).valid, true);
  interviewStore.delete(testId);
});
