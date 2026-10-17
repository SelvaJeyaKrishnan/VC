export type ParticipantRole = "host" | "guest";

export interface StudioSessionConfig {
  roomId: string;
  roomName?: string;
  participantName: string;
  participantRole: ParticipantRole;
}

export interface TokenResponse {
  token: string;
  serverUrl: string;
  room: string;
  identity: string;
  name: string;
  role: ParticipantRole;
  error?: string;
}

export type StudioLayoutMode = "split" | "focus" | "grid";

export interface Interview {
  id: string; // roomId
  title: string;
  hostName: string;
  guestName: string;
  passcode?: string;
  status: "scheduled" | "active" | "completed";
  createdAt: string;
  updatedAt: string;
  recordingStatus?: "not_started" | "recording" | "completed" | "uploaded";
}

export interface DeviceSettings {
  cameraId: string;
  microphoneId: string;
  speakerId: string;
}

export interface RecordingStatePlaceholder {
  isRecording: boolean;
  durationSeconds: number;
  localStreamReady: boolean;
  milestone: "ready_for_milestone_2";
}
