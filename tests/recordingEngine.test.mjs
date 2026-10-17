import test from "node:test";
import assert from "node:assert/strict";
import {
  findGuestParticipant,
  extractMediaStreamTrack,
  detectSupportedCodecs,
  validateRecordingReadiness,
} from "../src/lib/recordingEngine.ts";
import { Track } from "livekit-client";

test("findGuestParticipant correctly identifies guest by metadata, identity, or non-host role", () => {
  // Case 1: Explicit metadata role
  const participantsWithMetadata = [
    { identity: "user-1", name: "Host One", metadata: JSON.stringify({ role: "host" }) },
    { identity: "user-2", name: "Guest Two", metadata: JSON.stringify({ role: "guest" }) },
  ];
  const guest1 = findGuestParticipant(participantsWithMetadata);
  assert.strictEqual(guest1?.identity, "user-2");

  // Case 2: Identity prefix
  const participantsWithPrefix = [
    { identity: "host-alex", name: "Alex" },
    { identity: "guest-sam", name: "Sam" },
  ];
  const guest2 = findGuestParticipant(participantsWithPrefix);
  assert.strictEqual(guest2?.identity, "guest-sam");

  // Case 3: Name match
  const participantsWithName = [
    { identity: "usr-99", name: "Creator Host" },
    { identity: "usr-100", name: "Interview Guest Sarah" },
  ];
  const guest3 = findGuestParticipant(participantsWithName);
  assert.strictEqual(guest3?.identity, "usr-100");

  // Case 4: Non-host fallback
  const participantsGeneric = [
    { identity: "host-creator", name: "Creator" },
    { identity: "random-participant-id", name: "Alex" },
  ];
  const guest4 = findGuestParticipant(participantsGeneric);
  assert.strictEqual(guest4?.identity, "random-participant-id");

  // Case 5: Empty participants
  assert.strictEqual(findGuestParticipant([]), null);
});

test("detectSupportedCodecs selects genuine WebM VP9/Opus or MP4 codecs with valid extensions", () => {
  // WebM-supported browser environment (Chrome, Edge, Firefox)
  const webmCodec = detectSupportedCodecs((mime) => mime.includes("webm"));
  assert.strictEqual(webmCodec.videoExtension, "webm");
  assert.strictEqual(webmCodec.audioExtension, "webm");
  assert.ok(webmCodec.videoMimeType.includes("webm"));
  assert.ok(webmCodec.audioMimeType.includes("webm"));

  // Safari MP4-only environment
  const safariCodec = detectSupportedCodecs((mime) => mime.includes("mp4"));
  assert.strictEqual(safariCodec.videoExtension, "mp4");
  assert.strictEqual(safariCodec.audioExtension, "mp4");
  assert.strictEqual(safariCodec.videoMimeType, "video/mp4");
  assert.strictEqual(safariCodec.audioMimeType, "audio/mp4");
});

test("validateRecordingReadiness correctly assesses multi-track status and generates warnings", () => {
  // 1. Full multi-track ready: Host camera & mic active, Guest connected with camera & mic
  const readyResult = validateRecordingReadiness({
    hasHostVideo: true,
    hasHostAudio: true,
    guestParticipant: { identity: "guest-1" },
    hasGuestVideo: true,
    hasGuestAudio: true,
  });
  assert.strictEqual(readyResult.canRecord, true);
  assert.strictEqual(readyResult.isCompleteMultiTrack, true);
  assert.strictEqual(readyResult.missingGuestVideo, false);
  assert.strictEqual(readyResult.missingGuestAudio, false);
  assert.strictEqual(readyResult.warningMessage, null);

  // 2. Missing guest entirely
  const noGuestResult = validateRecordingReadiness({
    hasHostVideo: true,
    hasHostAudio: true,
    guestParticipant: null,
    hasGuestVideo: false,
    hasGuestAudio: false,
  });
  assert.strictEqual(noGuestResult.canRecord, true);
  assert.strictEqual(noGuestResult.isCompleteMultiTrack, false);
  assert.strictEqual(noGuestResult.guestConnected, false);
  assert.match(noGuestResult.warningMessage || "", /Guest is not connected/);

  // 3. Guest present but mic muted
  const guestMicMutedResult = validateRecordingReadiness({
    hasHostVideo: true,
    hasHostAudio: true,
    guestParticipant: { identity: "guest-1" },
    hasGuestVideo: true,
    hasGuestAudio: false,
  });
  assert.strictEqual(guestMicMutedResult.isCompleteMultiTrack, false);
  assert.strictEqual(guestMicMutedResult.missingGuestAudio, true);
  assert.match(guestMicMutedResult.warningMessage || "", /Guest microphone is muted/);

  // 4. Host camera missing
  const noHostCamResult = validateRecordingReadiness({
    hasHostVideo: false,
    hasHostAudio: true,
    guestParticipant: { identity: "guest-1" },
    hasGuestVideo: true,
    hasGuestAudio: true,
  });
  assert.strictEqual(noHostCamResult.missingHostVideo, true);
  assert.strictEqual(noHostCamResult.isCompleteMultiTrack, false);
});

test("extractMediaStreamTrack extracts mediaStreamTrack from publication or returns null if unsubscribed", () => {
  const dummyTrack = { id: "track-123", kind: "video" };
  const mockParticipant = {
    getTrackPublication: (source) => {
      if (source === Track.Source.Camera) {
        return {
          isSubscribed: true,
          track: { mediaStreamTrack: dummyTrack },
        };
      }
      if (source === Track.Source.Microphone) {
        return {
          isSubscribed: false, // Not yet subscribed
          track: { mediaStreamTrack: dummyTrack },
        };
      }
      return null;
    },
  };

  const camTrack = extractMediaStreamTrack(mockParticipant, Track.Source.Camera);
  assert.strictEqual(camTrack, dummyTrack);

  const unsubscribedMic = extractMediaStreamTrack(mockParticipant, Track.Source.Microphone);
  assert.strictEqual(unsubscribedMic, null);

  const screenTrack = extractMediaStreamTrack(mockParticipant, Track.Source.ScreenShare);
  assert.strictEqual(screenTrack, null);
});
