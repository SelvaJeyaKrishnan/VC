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

test("recordingStore saves separate host-video, host-audio, guest-video, guest-audio, and composite without overwriting", () => {
  const multiTrackRoomId = `multi-track-room-${Date.now()}`;
  const dummyVideoBuffer = Buffer.from("VIDEO_STREAM_DATA_VP9_1080P", "utf-8");
  const dummyAudioBuffer = Buffer.from("AUDIO_STREAM_DATA_OPUS_48KHZ", "utf-8");

  // 1. Host Video
  const hostVideo = recordingStore.saveTrack(multiTrackRoomId, {
    participantIdentity: "host-alex",
    participantName: "Alex Host",
    role: "host",
    trackType: "video",
    customFileName: "host-video.webm",
    mimeType: "video/webm;codecs=vp9",
    durationSeconds: 120,
    offsetMs: 0,
    fileBuffer: dummyVideoBuffer,
  });

  // 2. Host Audio
  const hostAudio = recordingStore.saveTrack(multiTrackRoomId, {
    participantIdentity: "host-alex",
    participantName: "Alex Host",
    role: "host",
    trackType: "audio",
    customFileName: "host-audio.webm",
    mimeType: "audio/webm;codecs=opus",
    durationSeconds: 120,
    offsetMs: 0,
    fileBuffer: dummyAudioBuffer,
  });

  // 3. Guest Video
  const guestVideo = recordingStore.saveTrack(multiTrackRoomId, {
    participantIdentity: "guest-sam",
    participantName: "Sam Guest",
    role: "guest",
    trackType: "video",
    customFileName: "guest-video.webm",
    mimeType: "video/webm;codecs=vp9",
    durationSeconds: 115,
    offsetMs: 5000,
    fileBuffer: dummyVideoBuffer,
  });

  // 4. Guest Audio
  const guestAudio = recordingStore.saveTrack(multiTrackRoomId, {
    participantIdentity: "guest-sam",
    participantName: "Sam Guest",
    role: "guest",
    trackType: "audio",
    customFileName: "guest-audio.webm",
    mimeType: "audio/webm;codecs=opus",
    durationSeconds: 115,
    offsetMs: 5000,
    fileBuffer: dummyAudioBuffer,
  });

  // 5. Composite Interview
  const composite = recordingStore.saveTrack(multiTrackRoomId, {
    participantIdentity: "studio-composite",
    participantName: "Studio Composite",
    role: "host",
    trackType: "composite",
    customFileName: "interview-composite.webm",
    mimeType: "video/webm;codecs=vp9,opus",
    durationSeconds: 120,
    offsetMs: 0,
    fileBuffer: dummyVideoBuffer,
  });

  // Verify all 5 tracks exist in the manifest and are not overwritten
  const manifest = recordingStore.getManifest(multiTrackRoomId);
  assert.notStrictEqual(manifest, null);
  assert.strictEqual(manifest?.tracks.length, 5);

  const fileNames = manifest?.tracks.map((t) => t.fileName);
  assert.ok(fileNames?.includes("host-video.webm"));
  assert.ok(fileNames?.includes("host-audio.webm"));
  assert.ok(fileNames?.includes("guest-video.webm"));
  assert.ok(fileNames?.includes("guest-audio.webm"));
  assert.ok(fileNames?.includes("interview-composite.webm"));

  // Verify sync metadata
  assert.ok(manifest?.syncMetadata);
  assert.strictEqual(manifest?.syncMetadata?.tracks.length, 5);
  const guestVideoSync = manifest?.syncMetadata?.tracks.find((t) => t.fileName === "guest-video.webm");
  assert.strictEqual(guestVideoSync?.offsetMs, 5000);
  assert.strictEqual(guestVideoSync?.durationSeconds, 115);

  // Clean up
  const roomDir = recordingStore.getRoomDir(multiTrackRoomId);
  if (fs.existsSync(roomDir)) {
    fs.rmSync(roomDir, { recursive: true, force: true });
  }
});

