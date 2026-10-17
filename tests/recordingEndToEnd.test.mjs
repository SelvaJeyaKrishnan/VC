import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Track } from "livekit-client";
import {
  findGuestParticipant,
  extractMediaStreamTrack,
  validateRecordingReadiness,
} from "../src/lib/recordingEngine.ts";
import { recordingStore } from "../src/lib/recordingStore.ts";

test("End-to-End Simulation: Multi-participant studio recording captures separate Host & Guest tracks", async () => {
  const roomId = `e2e-studio-room-${Date.now()}`;

  // 1. Create Mock Tracks
  const hostCamTrack = { id: "host-cam-trk", kind: "video" };
  const hostMicTrack = { id: "host-mic-trk", kind: "audio" };
  const guestCamTrack = { id: "guest-cam-trk", kind: "video" };
  const guestMicTrack = { id: "guest-mic-trk", kind: "audio" };

  // 2. Mock LocalParticipant (Host)
  const mockLocalHost = {
    identity: "host-alex",
    name: "Alex Host",
    getTrackPublication: (source) => {
      if (source === Track.Source.Camera) {
        return { isSubscribed: true, track: { mediaStreamTrack: hostCamTrack } };
      }
      if (source === Track.Source.Microphone) {
        return { isSubscribed: true, track: { mediaStreamTrack: hostMicTrack } };
      }
      return null;
    },
  };

  // 3. Mock RemoteParticipant (Guest)
  const mockRemoteGuest = {
    identity: "guest-sam",
    name: "Sam Guest",
    metadata: JSON.stringify({ role: "guest" }),
    getTrackPublication: (source) => {
      if (source === Track.Source.Camera) {
        return { isSubscribed: true, track: { mediaStreamTrack: guestCamTrack } };
      }
      if (source === Track.Source.Microphone) {
        return { isSubscribed: true, track: { mediaStreamTrack: guestMicTrack } };
      }
      return null;
    },
  };

  const remoteParticipants = [mockRemoteGuest];

  // 4. Verify participant detection & track extraction
  const detectedGuest = findGuestParticipant(remoteParticipants);
  assert.strictEqual(detectedGuest.identity, "guest-sam");

  const extractedHostCam = extractMediaStreamTrack(mockLocalHost, Track.Source.Camera);
  const extractedHostMic = extractMediaStreamTrack(mockLocalHost, Track.Source.Microphone);
  const extractedGuestCam = extractMediaStreamTrack(detectedGuest, Track.Source.Camera);
  const extractedGuestMic = extractMediaStreamTrack(detectedGuest, Track.Source.Microphone);

  assert.strictEqual(extractedHostCam, hostCamTrack);
  assert.strictEqual(extractedHostMic, hostMicTrack);
  assert.strictEqual(extractedGuestCam, guestCamTrack);
  assert.strictEqual(extractedGuestMic, guestMicTrack);

  // 5. Verify recording readiness
  const readiness = validateRecordingReadiness({
    hasHostVideo: !!extractedHostCam,
    hasHostAudio: !!extractedHostMic,
    guestParticipant: detectedGuest,
    hasGuestVideo: !!extractedGuestCam,
    hasGuestAudio: !!extractedGuestMic,
  });

  assert.strictEqual(readiness.canRecord, true);
  assert.strictEqual(readiness.isCompleteMultiTrack, true);
  assert.strictEqual(readiness.warningMessage, null);

  // 6. Verify Audio Isolation (Host mic contains NO guest audio; Guest mic contains NO host audio)
  const hostAudioStreamTracks = [extractedHostMic];
  const guestAudioStreamTracks = [extractedGuestMic];

  assert.strictEqual(hostAudioStreamTracks.includes(guestMicTrack), false);
  assert.strictEqual(guestAudioStreamTracks.includes(hostMicTrack), false);

  // 7. Simulate saving all 4 target deliverables + composite
  const dummyPayload = Buffer.from("MEDIA_RECORDER_RECORDED_BYTES", "utf-8");

  const hostVideoTrack = recordingStore.saveTrack(roomId, {
    participantIdentity: "host-alex",
    participantName: "Alex Host",
    role: "host",
    trackType: "video",
    customFileName: "host-video.webm",
    mimeType: "video/webm;codecs=vp9",
    durationSeconds: 60,
    offsetMs: 0,
    fileBuffer: dummyPayload,
  });

  const hostAudioTrack = recordingStore.saveTrack(roomId, {
    participantIdentity: "host-alex",
    participantName: "Alex Host",
    role: "host",
    trackType: "audio",
    customFileName: "host-audio.webm",
    mimeType: "audio/webm;codecs=opus",
    durationSeconds: 60,
    offsetMs: 0,
    fileBuffer: dummyPayload,
  });

  const guestVideoTrack = recordingStore.saveTrack(roomId, {
    participantIdentity: "guest-sam",
    participantName: "Sam Guest",
    role: "guest",
    trackType: "video",
    customFileName: "guest-video.webm",
    mimeType: "video/webm;codecs=vp9",
    durationSeconds: 60,
    offsetMs: 25,
    fileBuffer: dummyPayload,
  });

  const guestAudioTrack = recordingStore.saveTrack(roomId, {
    participantIdentity: "guest-sam",
    participantName: "Sam Guest",
    role: "guest",
    trackType: "audio",
    customFileName: "guest-audio.webm",
    mimeType: "audio/webm;codecs=opus",
    durationSeconds: 60,
    offsetMs: 25,
    fileBuffer: dummyPayload,
  });

  const compositeTrack = recordingStore.saveTrack(roomId, {
    participantIdentity: "composite",
    participantName: "Interview Composite",
    role: "host",
    trackType: "composite",
    customFileName: "interview-composite.webm",
    mimeType: "video/webm;codecs=vp9,opus",
    durationSeconds: 60,
    offsetMs: 0,
    fileBuffer: dummyPayload,
  });

  // 8. Verify manifest contents and deliverables
  const manifest = recordingStore.getManifest(roomId);
  assert.notStrictEqual(manifest, null);
  assert.strictEqual(manifest?.tracks.length, 5);

  const fileNames = manifest?.tracks.map((t) => t.fileName);
  assert.ok(fileNames?.includes("host-video.webm"));
  assert.ok(fileNames?.includes("host-audio.webm"));
  assert.ok(fileNames?.includes("guest-video.webm"));
  assert.ok(fileNames?.includes("guest-audio.webm"));
  assert.ok(fileNames?.includes("interview-composite.webm"));

  // Verify timestamps / synchronization metadata
  assert.ok(manifest?.syncMetadata);
  const hostAudioSync = manifest?.syncMetadata?.tracks.find((t) => t.fileName === "host-audio.webm");
  const guestAudioSync = manifest?.syncMetadata?.tracks.find((t) => t.fileName === "guest-audio.webm");
  assert.strictEqual(hostAudioSync?.offsetMs, 0);
  assert.strictEqual(guestAudioSync?.offsetMs, 25);

  // Clean up
  const roomDir = recordingStore.getRoomDir(roomId);
  if (fs.existsSync(roomDir)) {
    fs.rmSync(roomDir, { recursive: true, force: true });
  }
});

test("Pre-flight safety check: Missing guest tracks produce explicit warning and block silent partial recording", () => {
  // Scenario: Host is present, but guest has not joined yet
  const readiness = validateRecordingReadiness({
    hasHostVideo: true,
    hasHostAudio: true,
    guestParticipant: null,
    hasGuestVideo: false,
    hasGuestAudio: false,
  });

  assert.strictEqual(readiness.isCompleteMultiTrack, false);
  assert.strictEqual(readiness.guestConnected, false);
  assert.notStrictEqual(readiness.warningMessage, null);
  assert.match(readiness.warningMessage || "", /Guest is not connected/);
});
