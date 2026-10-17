"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Room, RoomEvent, Track, type LocalParticipant } from "livekit-client";

export type RecordingStatus = "idle" | "recording" | "uploading" | "uploaded" | "error";

interface UseLocalRecorderProps {
  room: Room;
  localParticipant: LocalParticipant | null;
  roomId: string;
  role: "host" | "guest";
  displayName: string;
}

interface RecordingDataMessage {
  type: "RECORDING_SIGNAL";
  action: "START" | "STOP";
  timestamp: number;
}

export function useLocalRecorder({
  room,
  localParticipant,
  roomId,
  role,
  displayName,
}: UseLocalRecorderProps) {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localDownloadUrl, setLocalDownloadUrl] = useState<string | null>(null);
  const [fileSizeMb, setFileSizeMb] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Pick best available browser MIME type
  const getSupportedMimeType = () => {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
      return "video/webm";
    }
    const types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return "video/webm";
  };

  const uploadRecording = async (blob: Blob, totalDuration: number) => {
    setStatus("uploading");
    setUploadProgress(20);

    try {
      const identity = localParticipant?.identity || `${role}-${Math.random().toString(36).substring(2, 7)}`;
      const formData = new FormData();
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      const filename = `${role}-${identity}.${ext}`;

      formData.append("file", blob, filename);
      formData.append("roomId", roomId);
      formData.append("participantIdentity", identity);
      formData.append("participantName", displayName);
      formData.append("role", role);
      formData.append("durationSeconds", totalDuration.toString());

      setUploadProgress(50);

      const res = await fetch("/api/recordings/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status ${res.status}`);
      }

      setUploadProgress(100);
      setStatus("uploaded");
    } catch (err: unknown) {
      console.error("Recording upload error:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to upload recording to studio library. Local backup download is available below."
      );
      setStatus("error");
    }
  };

  const startLocalRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      return;
    }

    try {
      setErrorMessage(null);
      setUploadProgress(0);
      recordedChunksRef.current = [];

      // Extract raw local media tracks from LiveKit participant
      const tracks: MediaStreamTrack[] = [];
      const camPub = localParticipant?.getTrackPublication(Track.Source.Camera);
      const micPub = localParticipant?.getTrackPublication(Track.Source.Microphone);

      if (camPub?.track?.mediaStreamTrack) {
        tracks.push(camPub.track.mediaStreamTrack);
      }
      if (micPub?.track?.mediaStreamTrack) {
        tracks.push(micPub.track.mediaStreamTrack);
      }

      if (tracks.length === 0) {
        throw new Error("No active camera or microphone track found to record.");
      }

      const stream = new MediaStream(tracks);
      const mimeType = getSupportedMimeType();

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 3_500_000, // Crisp 1080p
        audioBitsPerSecond: 128_000,   // Broadcast 48kHz audio
      });

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          const totalBytes = recordedChunksRef.current.reduce((acc, c) => acc + c.size, 0);
          setFileSizeMb(parseFloat((totalBytes / (1024 * 1024)).toFixed(2)));
        }
      };

      recorder.onstop = () => {
        const totalDuration = Math.round((Date.now() - startTimeRef.current) / 1000);
        const finalBlob = new Blob(recordedChunksRef.current, { type: mimeType });

        // Create browser-level local download link as guaranteed safety backup
        const localUrl = URL.createObjectURL(finalBlob);
        setLocalDownloadUrl(localUrl);

        // Upload to server storage
        uploadRecording(finalBlob, totalDuration);
      };

      // Slice recording every 1000ms for safety against abrupt disconnects
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      setStatus("recording");
      setDuration(0);

      // Start elapsed timer
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err: unknown) {
      console.error("Failed to start local recording:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to initialize local MediaRecorder"
      );
      setStatus("error");
    }
  }, [localParticipant, role, displayName, roomId]);

  const stopLocalRecording = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Broadcast coordinated recording signal to all participants
  const broadcastRecordingCommand = useCallback(
    async (action: "START" | "STOP") => {
      try {
        const signal: RecordingDataMessage = {
          type: "RECORDING_SIGNAL",
          action,
          timestamp: Date.now(),
        };
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(signal));

        // Publish over LiveKit reliable data channel
        await room.localParticipant.publishData(data, { reliable: true });

        // Trigger local action
        if (action === "START") {
          startLocalRecording();
        } else {
          stopLocalRecording();
        }
      } catch (err) {
        console.error("Failed to broadcast recording command:", err);
        // Fallback: execute locally anyway
        if (action === "START") startLocalRecording();
        else stopLocalRecording();
      }
    },
    [room, startLocalRecording, stopLocalRecording]
  );

  // Listen for recording commands from remote host
  useEffect(() => {
    const handleDataReceived = (payload: Uint8Array) => {
      try {
        const decoder = new TextDecoder();
        const parsed = JSON.parse(decoder.decode(payload));
        if (parsed.type === "RECORDING_SIGNAL") {
          if (parsed.action === "START") {
            startLocalRecording();
          } else if (parsed.action === "STOP") {
            stopLocalRecording();
          }
        }
      } catch {
        // Ignore unrelated data payloads
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, startLocalRecording, stopLocalRecording]);

  // Warn user before closing tab during recording or upload
  useEffect(() => {
    if (status !== "recording" && status !== "uploading") return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "A studio recording is in progress or uploading. Leaving now may lose your recording.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [status]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (localDownloadUrl) {
        URL.revokeObjectURL(localDownloadUrl);
      }
    };
  }, [localDownloadUrl]);

  return {
    status,
    duration,
    fileSizeMb,
    uploadProgress,
    errorMessage,
    localDownloadUrl,
    startRecording: () => broadcastRecordingCommand("START"),
    stopRecording: () => broadcastRecordingCommand("STOP"),
    dismissError: () => setErrorMessage(null),
  };
}
