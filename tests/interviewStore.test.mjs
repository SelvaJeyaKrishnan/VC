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
  });

  assert.strictEqual(created.id, testId);
  assert.strictEqual(created.title, "Unit Test Interview Session");
  assert.strictEqual(created.hostName, "Host Tester");
  assert.strictEqual(created.guestName, "Guest Tester");
  assert.strictEqual(created.passcode, "123456");
  assert.strictEqual(created.status, "scheduled");
  assert.strictEqual(created.recordingStatus, "not_started");

  // 2. Read by ID
  const fetched = interviewStore.getById(testId);
  assert.notStrictEqual(fetched, null);
  assert.strictEqual(fetched?.id, testId);

  // 3. Access validation
  const validAccess = interviewStore.validateAccess(testId, "123456");
  assert.strictEqual(validAccess.valid, true);

  const invalidPasscode = interviewStore.validateAccess(testId, "wrong-pass");
  assert.strictEqual(invalidPasscode.valid, false);

  const nonexistent = interviewStore.validateAccess("non-existent-room-9999");
  assert.strictEqual(nonexistent.valid, false);

  // 4. Update
  const updated = interviewStore.update(testId, {
    status: "in_progress",
    recordingStatus: "recording",
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
