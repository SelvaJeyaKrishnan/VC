import fs from "fs";
import path from "path";

export interface RecordingTrack {
  participantIdentity: string;
  participantName: string;
  role: "host" | "guest";
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  downloadUrl: string;
}

export interface RecordingSession {
  roomId: string;
  recordedAt: string;
  durationSeconds: number;
  tracks: RecordingTrack[];
}

const RECORDINGS_DIR = path.join(process.cwd(), "data", "recordings");

function ensureDirectoryExists(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export const recordingStore = {
  getRoomDir(roomId: string): string {
    const dir = path.join(RECORDINGS_DIR, roomId);
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
    }
  ): RecordingTrack {
    const roomDir = this.getRoomDir(roomId);
    const ext = trackInfo.mimeType.includes("mp4") ? "mp4" : "webm";
    const fileName = `${trackInfo.role}-${trackInfo.participantIdentity.replace(/[^a-zA-Z0-9_-]/g, "")}.${ext}`;
    const filePath = path.join(roomDir, fileName);

    fs.writeFileSync(filePath, trackInfo.fileBuffer);

    const stats = fs.statSync(filePath);
    const newTrack: RecordingTrack = {
      participantIdentity: trackInfo.participantIdentity,
      participantName: trackInfo.participantName,
      role: trackInfo.role,
      fileName,
      fileSize: stats.size,
      mimeType: trackInfo.mimeType,
      createdAt: new Date().toISOString(),
      downloadUrl: `/api/recordings/download?roomId=${encodeURIComponent(roomId)}&file=${encodeURIComponent(fileName)}`,
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

    // Replace existing track for same participant or add
    session.tracks = session.tracks.filter(
      (t) => t.participantIdentity !== trackInfo.participantIdentity
    );
    session.tracks.push(newTrack);

    fs.writeFileSync(
      path.join(roomDir, "manifest.json"),
      JSON.stringify(session, null, 2),
      "utf-8"
    );

    return newTrack;
  },

  getAllSessions(): RecordingSession[] {
    ensureDirectoryExists(RECORDINGS_DIR);
    try {
      const rooms = fs.readdirSync(RECORDINGS_DIR);
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
