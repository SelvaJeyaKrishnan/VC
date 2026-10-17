import { Track, type Participant, type RemoteParticipant } from "livekit-client";

export interface ParticipantTrackInfo {
  camTrack: MediaStreamTrack | null;
  micTrack: MediaStreamTrack | null;
  hasCam: boolean;
  hasMic: boolean;
  isSubscribed: boolean;
}

export interface RecordingReadiness {
  canRecord: boolean;
  isCompleteMultiTrack: boolean;
  guestConnected: boolean;
  missingHostVideo: boolean;
  missingHostAudio: boolean;
  missingGuestVideo: boolean;
  missingGuestAudio: boolean;
  warningMessage: string | null;
}

export interface MissingTracksWarning {
  isMissing: boolean;
  guestConnected: boolean;
  missingGuestVideo: boolean;
  missingGuestAudio: boolean;
  missingHostVideo: boolean;
  missingHostAudio: boolean;
  message: string;
}

export interface SupportedCodecs {
  videoMimeType: string;
  videoExtension: "webm" | "mp4";
  audioMimeType: string;
  audioExtension: "webm" | "mp4";
}

/**
 * Identify genuine guest participant from remote participants.
 * Inspects metadata role, identity prefix, and name without hardcoding.
 */
export function findGuestParticipant(
  remoteParticipants: (RemoteParticipant | { identity: string; name?: string; metadata?: string })[]
): RemoteParticipant | any | null {
  if (!remoteParticipants || remoteParticipants.length === 0) {
    return null;
  }

  // 1. Look for participant with explicit metadata role === "guest"
  for (const p of remoteParticipants) {
    if (p.metadata) {
      try {
        const meta = typeof p.metadata === "string" ? JSON.parse(p.metadata) : p.metadata;
        if (meta?.role === "guest") return p;
      } catch {
        // Ignore json parse error
      }
    }
  }

  // 2. Look for identity starting with "guest-" or name containing "guest"
  const byGuestIdentity = remoteParticipants.find(
    (p) =>
      p.identity?.toLowerCase().startsWith("guest-") ||
      p.name?.toLowerCase().includes("guest")
  );
  if (byGuestIdentity) return byGuestIdentity;

  // 3. Find any participant that does not identify as host
  const nonHost = remoteParticipants.find(
    (p) =>
      !p.identity?.toLowerCase().startsWith("host-") &&
      !p.name?.toLowerCase().includes("host")
  );
  if (nonHost) return nonHost;

  // 4. Default to first remote participant
  return remoteParticipants[0] || null;
}

/**
 * Extract underlying browser MediaStreamTrack from a LiveKit participant publication.
 */
export function extractMediaStreamTrack(
  participant: Participant | any | null,
  source: Track.Source
): MediaStreamTrack | null {
  if (!participant) return null;

  try {
    // 1. Direct source publication check
    const pub = participant.getTrackPublication ? participant.getTrackPublication(source) : null;
    if (pub && (!("isSubscribed" in pub) || pub.isSubscribed !== false) && pub.track?.mediaStreamTrack) {
      return pub.track.mediaStreamTrack;
    }

    // 2. Fallback to videoTrackPublications for Camera source
    if (source === Track.Source.Camera && participant.videoTrackPublications) {
      const vPubs =
        participant.videoTrackPublications instanceof Map
          ? Array.from(participant.videoTrackPublications.values())
          : Object.values(participant.videoTrackPublications);
      for (const p of vPubs as any[]) {
        if ((!("isSubscribed" in p) || p.isSubscribed !== false) && p.track?.mediaStreamTrack) {
          return p.track.mediaStreamTrack;
        }
      }
    }

    // 3. Fallback to audioTrackPublications for Microphone source
    if (source === Track.Source.Microphone && participant.audioTrackPublications) {
      const aPubs =
        participant.audioTrackPublications instanceof Map
          ? Array.from(participant.audioTrackPublications.values())
          : Object.values(participant.audioTrackPublications);
      for (const p of aPubs as any[]) {
        if ((!("isSubscribed" in p) || p.isSubscribed !== false) && p.track?.mediaStreamTrack) {
          return p.track.mediaStreamTrack;
        }
      }
    }

    // 4. Fallback to general trackPublications map
    if (participant.trackPublications) {
      const kindTarget = source === Track.Source.Camera ? "video" : "audio";
      const allPubs =
        participant.trackPublications instanceof Map
          ? Array.from(participant.trackPublications.values())
          : Object.values(participant.trackPublications);
      for (const p of allPubs as any[]) {
        if (
          (p.kind === kindTarget || p.source === source) &&
          (!("isSubscribed" in p) || p.isSubscribed !== false) &&
          p.track?.mediaStreamTrack
        ) {
          return p.track.mediaStreamTrack;
        }
      }
    }
  } catch {
    // Participant might be mock or disconnected
  }

  return null;
}

/**
 * Detect best supported browser MIME types and extensions for isolated Video and Audio.
 */
export function detectSupportedCodecs(
  isTypeSupportedFn?: (mime: string) => boolean
): SupportedCodecs {
  const isSupported =
    isTypeSupportedFn ||
    (typeof window !== "undefined" && typeof MediaRecorder !== "undefined"
      ? (mime: string) => MediaRecorder.isTypeSupported(mime)
      : () => true);

  // Video codec candidates in order of preference
  const videoCandidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];

  let selectedVideoMime = "video/webm";
  for (const mime of videoCandidates) {
    if (isSupported(mime)) {
      selectedVideoMime = mime;
      break;
    }
  }

  const videoExt = selectedVideoMime.includes("mp4") ? "mp4" : "webm";

  // Dedicated Audio codec candidates (broadcast quality 48kHz Opus)
  const audioCandidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];

  let selectedAudioMime = "audio/webm;codecs=opus";
  for (const mime of audioCandidates) {
    if (isSupported(mime)) {
      selectedAudioMime = mime;
      break;
    }
  }

  const audioExt = selectedAudioMime.includes("mp4") ? "mp4" : "webm";

  return {
    videoMimeType: selectedVideoMime,
    videoExtension: videoExt,
    audioMimeType: selectedAudioMime,
    audioExtension: audioExt,
  };
}

/**
 * Validate whether all tracks needed for a Riverside multi-participant recording are active.
 */
export function validateRecordingReadiness(params: {
  hasHostVideo: boolean;
  hasHostAudio: boolean;
  guestParticipant: any | null;
  hasGuestVideo: boolean;
  hasGuestAudio: boolean;
}): RecordingReadiness {
  const { hasHostVideo, hasHostAudio, guestParticipant, hasGuestVideo, hasGuestAudio } = params;

  const missingHostVideo = !hasHostVideo;
  const missingHostAudio = !hasHostAudio;
  const guestConnected = !!guestParticipant;
  const missingGuestVideo = guestConnected ? !hasGuestVideo : true;
  const missingGuestAudio = guestConnected ? !hasGuestAudio : true;

  const isCompleteMultiTrack =
    hasHostVideo && hasHostAudio && guestConnected && hasGuestVideo && hasGuestAudio;

  const canRecord = hasHostVideo || hasHostAudio;

  let warningMessage: string | null = null;
  if (!guestConnected) {
    warningMessage =
      "Guest is not connected to the studio. Starting recording now will only capture Host tracks. To capture both Host and Guest, please wait for your guest to join.";
  } else if (missingGuestVideo && missingGuestAudio) {
    warningMessage =
      "Guest is connected, but guest camera and microphone are inactive. Please ask your guest to enable camera and microphone.";
  } else if (missingGuestVideo) {
    warningMessage =
      "Guest camera track is inactive or muted. Recording will capture guest audio, but guest video track will be missing.";
  } else if (missingGuestAudio) {
    warningMessage =
      "Guest microphone is muted. Recording will capture guest video, but guest audio track will be missing.";
  }

  return {
    canRecord,
    isCompleteMultiTrack,
    guestConnected,
    missingHostVideo,
    missingHostAudio,
    missingGuestVideo,
    missingGuestAudio,
    warningMessage,
  };
}
