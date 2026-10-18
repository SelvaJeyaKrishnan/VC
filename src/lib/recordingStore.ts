import fs from "fs";
import path from "path";
import { isValidRoomId } from "./utils.ts";

export interface RecordingTrack {
  participantIdentity: string;
  participantName: string;
  role: "host" | "guest";
  trackType?: "video" | "audio" | "composite" | "av";
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  durationSeconds?: number;
  offsetMs?: number;
  downloadUrl: string;
  verified?: boolean;
}

export interface RecordingSyncTrack {
  fileName: string;
  trackType: "video" | "audio" | "composite" | "av";
  role: "host" | "guest";
  offsetMs: number;
  durationSeconds: number;
}

export interface RecordingVerification {
  isComplete: boolean;
  hasHostVideo: boolean;
  hasHostAudio: boolean;
  hasGuestVideo: boolean;
  hasGuestAudio: boolean;
  missingTracks: string[];
  totalBytes: number;
}

export interface RecordingSession {
  roomId: string;
  recordedAt: string;
  durationSeconds: number;
  tracks: RecordingTrack[];
  status?: "complete" | "partial" | "failed";
  verification?: RecordingVerification;
  syncMetadata?: {
    sessionStartTime: string;
    tracks: RecordingSyncTrack[];
  };
}

const RECORDINGS_DIR =
  process.env.RECORDINGS_STORAGE_PATH || path.join(process.cwd(), "data", "recordings");

function ensureDirectoryExists(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export const recordingStore = {
  getRoomDir(roomId: string): string {
    if (!isValidRoomId(roomId)) {
      throw new Error("Invalid recording room ID.");
    }

    const baseDir = path.resolve(/*turbopackIgnore: true*/ RECORDINGS_DIR);
    const dir = path.resolve(baseDir, roomId);
    if (!dir.startsWith(`${baseDir}${path.sep}`)) {
      throw new Error("Recording room path is outside the storage directory.");
    }
    ensureDirectoryExists(dir);
    return dir;
  },

  getManifest(roomId: string): RecordingSession | null {
    try {
      const filePath = path.join(this.getRoomDir(roomId), "manifest.json");
      if (!fs.existsSync(filePath)) return null;
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as RecordingSession;
    } catch {
      return null;
    }
  },

  saveTrack(
    roomId: string,
    trackInfo: {
      participantIdentity: string;
      participantName: string;
      role: "host" | "guest";
      mimeType: string;
      durationSeconds: number;
      fileBuffer: Buffer;
      trackType?: "video" | "audio" | "composite" | "av";
      customFileName?: string;
      offsetMs?: number;
    }
  ): RecordingTrack {
    const roomDir = this.getRoomDir(roomId);
    const ext = trackInfo.mimeType.includes("mp4") ? "mp4" : "webm";
    
    let fileName: string;
    if (trackInfo.customFileName) {
      // Sanitize custom file name to prevent directory traversal
      const safeBase = path.basename(trackInfo.customFileName).replace(/[^a-zA-Z0-9_.-]/g, "");
      fileName = safeBase.endsWith(`.${ext}`) ? safeBase : `${safeBase}.${ext}`;
    } else if (trackInfo.trackType) {
      const sanitizedId = trackInfo.participantIdentity.replace(/[^a-zA-Z0-9_-]/g, "");
      fileName = `${trackInfo.role}-${trackInfo.trackType}-${sanitizedId}.${ext}`;
    } else {
      const sanitizedId = trackInfo.participantIdentity.replace(/[^a-zA-Z0-9_-]/g, "");
      fileName = `${trackInfo.role}-${sanitizedId}.${ext}`;
    }

    const filePath = path.join(roomDir, fileName);
    fs.writeFileSync(filePath, trackInfo.fileBuffer);

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      fs.unlinkSync(filePath);
      throw new Error(`Recording verification failed: ${fileName} was saved as 0 bytes.`);
    }

    const trackType =
      trackInfo.trackType || (trackInfo.mimeType.startsWith("audio") ? "audio" : "video");

    const newTrack: RecordingTrack = {
      participantIdentity: trackInfo.participantIdentity,
      participantName: trackInfo.participantName,
      role: trackInfo.role,
      trackType,
      fileName,
      fileSize: stats.size,
      mimeType: trackInfo.mimeType,
      createdAt: new Date().toISOString(),
      durationSeconds: trackInfo.durationSeconds || 0,
      offsetMs: trackInfo.offsetMs || 0,
      downloadUrl: `/api/recordings/download?roomId=${encodeURIComponent(roomId)}&file=${encodeURIComponent(fileName)}`,
      verified: true,
    };

    // Update or create manifest
    let session = this.getManifest(roomId);
    if (!session) {
      session = {
        roomId,
        recordedAt: new Date().toISOString(),
        durationSeconds: trackInfo.durationSeconds || 0,
        tracks: [],
      };
    } else {
      // update duration if longer
      if (trackInfo.durationSeconds > session.durationSeconds) {
        session.durationSeconds = trackInfo.durationSeconds;
      }
    }

    // Replace existing track by EXACT fileName (preserves separate host-video, host-audio, guest-video, guest-audio!)
    session.tracks = session.tracks.filter((t) => t.fileName !== fileName);
    session.tracks.push(newTrack);

    // Update synchronization metadata
    const syncTracks: RecordingSyncTrack[] = session.tracks.map((t) => ({
      fileName: t.fileName,
      trackType: t.trackType || (t.mimeType.startsWith("audio") ? "audio" : "video"),
      role: t.role,
      offsetMs: t.offsetMs || 0,
      durationSeconds: t.durationSeconds || session?.durationSeconds || 0,
    }));

    session.syncMetadata = {
      sessionStartTime: session.recordedAt,
      tracks: syncTracks,
    };

    // Compute comprehensive 4-stem verification summary
    const hasHostVideo = session.tracks.some(
      (t) => t.role === "host" && (t.trackType === "video" || t.fileName.includes("host-video")) && t.fileSize > 0
    );
    const hasHostAudio = session.tracks.some(
      (t) => t.role === "host" && (t.trackType === "audio" || t.fileName.includes("host-audio")) && t.fileSize > 0
    );
    const hasGuestVideo = session.tracks.some(
      (t) => t.role === "guest" && (t.trackType === "video" || t.fileName.includes("guest-video")) && t.fileSize > 0
    );
    const hasGuestAudio = session.tracks.some(
      (t) => t.role === "guest" && (t.trackType === "audio" || t.fileName.includes("guest-audio")) && t.fileSize > 0
    );

    const missingTracks: string[] = [];
    if (!hasHostVideo) missingTracks.push("Host Video");
    if (!hasHostAudio) missingTracks.push("Host Audio");
    if (!hasGuestVideo) missingTracks.push("Guest Video");
    if (!hasGuestAudio) missingTracks.push("Guest Audio");

    const isComplete = hasHostVideo && hasHostAudio && hasGuestVideo && hasGuestAudio;

    session.verification = {
      isComplete,
      hasHostVideo,
      hasHostAudio,
      hasGuestVideo,
      hasGuestAudio,
      missingTracks,
      totalBytes: session.tracks.reduce((acc, t) => acc + t.fileSize, 0),
    };
    session.status = isComplete ? "complete" : "partial";

    fs.writeFileSync(
      path.join(roomDir, "manifest.json"),
      JSON.stringify(session, null, 2),
      "utf-8"
    );

    return newTrack;
  },

  verifySession(roomId: string): RecordingVerification {
    const session = this.getManifest(roomId);
    if (!session || !session.tracks) {
      return {
        isComplete: false,
        hasHostVideo: false,
        hasHostAudio: false,
        hasGuestVideo: false,
        hasGuestAudio: false,
        missingTracks: ["Host Video", "Host Audio", "Guest Video", "Guest Audio"],
        totalBytes: 0,
      };
    }

    const roomDir = this.getRoomDir(roomId);
    const validTracks = session.tracks.filter((t) => {
      const p = path.join(roomDir, path.basename(t.fileName));
      return fs.existsSync(p) && fs.statSync(p).size > 0;
    });

    const hasHostVideo = validTracks.some(
      (t) => t.role === "host" && (t.trackType === "video" || t.fileName.includes("host-video"))
    );
    const hasHostAudio = validTracks.some(
      (t) => t.role === "host" && (t.trackType === "audio" || t.fileName.includes("host-audio"))
    );
    const hasGuestVideo = validTracks.some(
      (t) => t.role === "guest" && (t.trackType === "video" || t.fileName.includes("guest-video"))
    );
    const hasGuestAudio = validTracks.some(
      (t) => t.role === "guest" && (t.trackType === "audio" || t.fileName.includes("guest-audio"))
    );

    const missingTracks: string[] = [];
    if (!hasHostVideo) missingTracks.push("Host Video");
    if (!hasHostAudio) missingTracks.push("Host Audio");
    if (!hasGuestVideo) missingTracks.push("Guest Video");
    if (!hasGuestAudio) missingTracks.push("Guest Audio");

    return {
      isComplete: hasHostVideo && hasHostAudio && hasGuestVideo && hasGuestAudio,
      hasHostVideo,
      hasHostAudio,
      hasGuestVideo,
      hasGuestAudio,
      missingTracks,
      totalBytes: validTracks.reduce((acc, t) => acc + t.fileSize, 0),
    };
  },

  deleteSession(roomId: string): boolean {
    try {
      const roomDir = this.getRoomDir(roomId);
      if (fs.existsSync(roomDir)) {
        fs.rmSync(roomDir, { recursive: true, force: true });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  getAllSessions(): RecordingSession[] {
    ensureDirectoryExists(RECORDINGS_DIR);
    try {
      const rooms = fs.readdirSync(/*turbopackIgnore: true*/ RECORDINGS_DIR);
      const sessions: RecordingSession[] = [];
      for (const room of rooms) {
        const manifest = this.getManifest(room);
        if (manifest) {
          sessions.push(manifest);
        }
      }
      return sessions.sort(
        (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
      );
    } catch {
      return [];
    }
  },

  getTrackFilePath(roomId: string, fileName: string): string | null {
    // Prevent path traversal
    const safeFileName = path.basename(fileName);
    const filePath = path.join(this.getRoomDir(roomId), safeFileName);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    return null;
  },
};
