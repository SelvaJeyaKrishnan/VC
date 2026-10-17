import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { recordingStore } from "../src/lib/recordingStore.ts";

test("recordingStore safely saves tracks, writes manifests, and blocks path traversal attacks", () => {
  const testRoomId = `test-room-${Date.now()}`;
  const dummyBuffer = Buffer.from("RIFF....WAVEfmt ....data....OneGuest Studio Track", "utf-8");

  // 1. Save host track
  const hostTrack = recordingStore.saveTrack(testRoomId, {
    participantIdentity: "host-user-123",
    participantName: "Host Alex",
    role: "host",
    mimeType: "video/webm;codecs=vp8,opus",
    durationSeconds: 42,
    fileBuffer: dummyBuffer,
  });

  assert.strictEqual(hostTrack.role, "host");
  assert.strictEqual(hostTrack.participantIdentity, "host-user-123");
  assert.strictEqual(hostTrack.fileSize, dummyBuffer.length);
  assert.match(hostTrack.downloadUrl, /download\?roomId=/);

  // 2. Save guest track in same room
  const guestTrack = recordingStore.saveTrack(testRoomId, {
    participantIdentity: "guest-user-456",
    participantName: "Guest Jordan",
    role: "guest",
    mimeType: "video/webm;codecs=vp8,opus",
    durationSeconds: 45,
    fileBuffer: dummyBuffer,
  });

  assert.strictEqual(guestTrack.role, "guest");
  assert.strictEqual(guestTrack.participantIdentity, "guest-user-456");

  // 3. Verify manifest
  const manifest = recordingStore.getManifest(testRoomId);
  assert.notStrictEqual(manifest, null);
  assert.strictEqual(manifest?.roomId, testRoomId);
  assert.strictEqual(manifest?.durationSeconds, 45); // Max duration between tracks
  assert.strictEqual(manifest?.tracks.length, 2);

  // 4. Verify path traversal security
  const maliciousFileNames = [
    "../../package.json",
    "..\\..\\package.json",
    "....//....//sensitive.txt",
    "/etc/passwd",
    "C:\\Windows\\System32\\cmd.exe",
  ];

  for (const malicious of maliciousFileNames) {
    const resolved = recordingStore.getTrackFilePath(testRoomId, malicious);
    if (resolved) {
      // Must reside inside the designated room directory, never outside
      const roomDir = path.resolve(recordingStore.getRoomDir(testRoomId));
      const resolvedPath = path.resolve(resolved);
      assert.strictEqual(
        resolvedPath.startsWith(roomDir),
        true,
        `Path traversal vulnerability! ${malicious} escaped to ${resolvedPath}`
      );
    }
  }

  // 5. Verify existing track retrieval
  const safePath = recordingStore.getTrackFilePath(testRoomId, hostTrack.fileName);
  assert.notStrictEqual(safePath, null);
  assert.strictEqual(fs.existsSync(safePath), true);

  // 6. Verify non-existent file returns null
  const nonExistent = recordingStore.getTrackFilePath(testRoomId, "non-existent-track.webm");
  assert.strictEqual(nonExistent, null);

  // Clean up test files
  const roomDir = recordingStore.getRoomDir(testRoomId);
  if (fs.existsSync(roomDir)) {
    fs.rmSync(roomDir, { recursive: true, force: true });
  }
});
