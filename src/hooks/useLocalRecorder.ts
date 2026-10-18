"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Room,
  RoomEvent,
  Track,
  type Participant,
  type LocalParticipant,
  type RemoteParticipant,
} from "livekit-client";
import {
  findGuestParticipant,
  extractMediaStreamTrack,
  detectSupportedCodecs,
  validateRecordingReadiness,
  type MissingTracksWarning,
} from "@/lib/recordingEngine";

export type RecordingStatus = "idle" | "recording" | "finalizing" | "uploading" | "uploaded" | "error";

export interface TrackItemInfo {
  id: string;
  label: string;
  role: "host" | "guest";
  trackType: "video" | "audio" | "composite";
  isActive: boolean;
  fileSizeMb: number;
  fileName: string;
  downloadUrl: string | null;
}

interface UseLocalRecorderProps {
  room: Room;
  localParticipant: LocalParticipant | null;
  remoteParticipants?: RemoteParticipant[];
  roomId: string;
  role: "host" | "guest";
  recordingToken: string;
  displayName: string;
}

interface RecordingDataMessage {
  type: "RECORDING_SIGNAL";
  action: "START" | "STOP";
  timestamp: number;
}

interface InternalTrackRecorder {
  id: string;
  label: string;
  role: "host" | "guest";
  trackType: "video" | "audio" | "composite";
  fileName: string;
  participantIdentity: string;
  participantName: string;
  stream: MediaStream;
  mediaRecorder: MediaRecorder;
  chunks: Blob[];
  offsetMs: number;
  mimeType: string;
  cleanup?: () => void;
}

export function useLocalRecorder({
  room,
  localParticipant,
  remoteParticipants = [],
  roomId,
  role,
  recordingToken,
  displayName,
}: UseLocalRecorderProps) {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localDownloadUrl, setLocalDownloadUrl] = useState<string | null>(null);
  const [fileSizeMb, setFileSizeMb] = useState<number>(0);
  const [recordedTracks, setRecordedTracks] = useState<TrackItemInfo[]>([]);
  const [missingWarning, setMissingWarning] = useState<MissingTracksWarning | null>(null);

  // Active recorders map and refs
  const recordersRef = useRef<Map<string, InternalTrackRecorder>>(new Map());
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const sessionStartEpochRef = useRef<number>(0);
  const compositeCleanupRef = useRef<(() => void) | null>(null);

  // Update live track list display
  const updateTracksState = useCallback(() => {
    const list: TrackItemInfo[] = [];
    recordersRef.current.forEach((rec) => {
      const bytes = rec.chunks.reduce((acc, c) => acc + c.size, 0);
      list.push({
        id: rec.id,
        label: rec.label,
        role: rec.role,
        trackType: rec.trackType,
        isActive: rec.mediaRecorder.state === "recording",
        fileSizeMb: parseFloat((bytes / (1024 * 1024)).toFixed(2)),
        fileName: rec.fileName,
        downloadUrl: null,
      });
    });
    setRecordedTracks(list);
  }, []);

  // Upload all finalized blobs to server
  const uploadAllRecordings = async (
    completedBlobs: {
      id: string;
      label: string;
      blob: Blob;
      role: "host" | "guest";
      trackType: "video" | "audio" | "composite";
      fileName: string;
      participantIdentity: string;
      participantName: string;
      durationSeconds: number;
      offsetMs: number;
      localUrl: string;
    }[]
  ) => {
    setStatus("uploading");
    setUploadProgress(10);

    const totalFiles = completedBlobs.length;
    let successCount = 0;

    try {
      for (let i = 0; i < totalFiles; i++) {
        const item = completedBlobs[i];
        const formData = new FormData();
        formData.append("file", item.blob, item.fileName);
        formData.append("roomId", roomId);
        formData.append("participantIdentity", item.participantIdentity);
        formData.append("participantName", item.participantName);
        formData.append("role", item.role);
        formData.append("trackType", item.trackType);
        formData.append("customFileName", item.fileName);
        formData.append("durationSeconds", item.durationSeconds.toString());
        formData.append("offsetMs", item.offsetMs.toString());

        const res = await fetch("/api/recordings/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${recordingToken}` },
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed uploading ${item.fileName} (${res.status})`);
        }

        successCount++;
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 90) + 10);
      }

      setStatus("uploaded");
      setUploadProgress(100);
    } catch (err: unknown) {
      console.error("Recording multi-track upload error:", err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to upload all tracks to studio library. Local browser backups are ready for download."
      );
      setStatus("error");
    }
  };

  // Helper to start an individual MediaRecorder instance
  const startSingleTrackRecorder = useCallback(
    (params: {
      id: string;
      label: string;
      role: "host" | "guest";
      trackType: "video" | "audio" | "composite";
      fileName: string;
      participantIdentity: string;
      participantName: string;
      stream: MediaStream;
      mimeType: string;
      bitsPerSecond?: number;
      cleanup?: () => void;
    }) => {
      try {
        const recorder = new MediaRecorder(params.stream, {
          mimeType: params.mimeType,
          videoBitsPerSecond: params.trackType === "audio" ? undefined : 3_500_000,
          audioBitsPerSecond: 128_000,
        });

        const chunks: Blob[] = [];
        const offsetMs =
          sessionStartEpochRef.current > 0
            ? Math.round(performance.now() - sessionStartEpochRef.current)
            : 0;

        recorder.ondataavailable = (e: BlobEvent) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
            // Calculate total size across all recorders
            let totalBytes = 0;
            recordersRef.current.forEach((r) => {
              totalBytes += r.chunks.reduce((sum, c) => sum + c.size, 0);
            });
            setFileSizeMb(parseFloat((totalBytes / (1024 * 1024)).toFixed(2)));
          }
        };

        recorder.start(1000);

        const internalRec: InternalTrackRecorder = {
          id: params.id,
          label: params.label,
          role: params.role,
          trackType: params.trackType,
          fileName: params.fileName,
          participantIdentity: params.participantIdentity,
          participantName: params.participantName,
          stream: params.stream,
          mediaRecorder: recorder,
          chunks,
          offsetMs,
          mimeType: params.mimeType,
          cleanup: params.cleanup,
        };

        recordersRef.current.set(params.id, internalRec);
      } catch (err) {
        console.error(`Failed to start recorder for ${params.id}:`, err);
      }
    },
    []
  );

  // Start Multi-Track Studio Recording (Host Side)
  const startHostMultiTrackRecording = useCallback(
    (forceSolo = false) => {
      try {
        setErrorMessage(null);
        setWarningMessage(null);
        setUploadProgress(0);
        recordersRef.current.clear();

        // 1. Host Tracks
        const hostCamTrack = extractMediaStreamTrack(localParticipant, Track.Source.Camera);
        const hostMicTrack = extractMediaStreamTrack(localParticipant, Track.Source.Microphone);

        // 2. Remote / Guest Tracks
        const remoteList =
          remoteParticipants.length > 0
            ? remoteParticipants
            : Array.from(room.remoteParticipants.values());
        const primaryGuest = findGuestParticipant(remoteList);
        const primaryGuestCam = extractMediaStreamTrack(primaryGuest, Track.Source.Camera);
        const primaryGuestMic = extractMediaStreamTrack(primaryGuest, Track.Source.Microphone);

        // 3. Readiness and Pre-flight Check
        const readiness = validateRecordingReadiness({
          hasHostVideo: !!hostCamTrack,
          hasHostAudio: !!hostMicTrack,
          guestParticipant: primaryGuest,
          hasGuestVideo: !!primaryGuestCam,
          hasGuestAudio: !!primaryGuestMic,
        });

        if (!readiness.canRecord) {
          throw new Error("No active camera or microphone track found for Host to record.");
        }

        // If guest is not connected or guest tracks are missing, and forceSolo is not confirmed
        if (!readiness.isCompleteMultiTrack && !forceSolo) {
          setMissingWarning({
            isMissing: true,
            guestConnected: readiness.guestConnected,
            missingGuestVideo: readiness.missingGuestVideo,
            missingGuestAudio: readiness.missingGuestAudio,
            missingHostVideo: readiness.missingHostVideo,
            missingHostAudio: readiness.missingHostAudio,
            message:
              readiness.warningMessage ||
              "Guest tracks are not fully available. To capture both Host and Guest tracks, please wait for your guest to join.",
          });
          return; // Wait for user confirmation or guest connection
        }

        // Dismiss missing warning if forceSolo or ready
        setMissingWarning(null);

        // 4. Codecs negotiation
        const codecs = detectSupportedCodecs();
        const vExt = codecs.videoExtension;
        const aExt = codecs.audioExtension;

        startTimeRef.current = Date.now();
        sessionStartEpochRef.current = performance.now();

        const hostIdentity = localParticipant?.identity || "host";
        const hostName = localParticipant?.name || displayName || "Host";

        // Track 1: Host Video (pure video track)
        if (hostCamTrack) {
          startSingleTrackRecorder({
            id: "host-video",
            label: "Host Video",
            role: "host",
            trackType: "video",
            fileName: `host-video.${vExt}`,
            participantIdentity: hostIdentity,
            participantName: hostName,
            stream: new MediaStream([hostCamTrack]),
            mimeType: codecs.videoMimeType,
          });
        }

        // Track 2: Host Audio (isolated microphone track)
        if (hostMicTrack) {
          startSingleTrackRecorder({
            id: "host-audio",
            label: "Host Audio",
            role: "host",
            trackType: "audio",
            fileName: `host-audio.${aExt}`,
            participantIdentity: hostIdentity,
            participantName: hostName,
            stream: new MediaStream([hostMicTrack]),
            mimeType: codecs.audioMimeType,
          });
        }

        // Composite mix uses remote tracks only for the optional preview deliverable.
        const activeMicTracks: MediaStreamTrack[] = [];
        if (hostMicTrack) activeMicTracks.push(hostMicTrack);

        remoteList.forEach((guestP) => {
          const guestMic = extractMediaStreamTrack(guestP, Track.Source.Microphone);
          if (guestMic) {
            activeMicTracks.push(guestMic);
          }
        });

        // Composite Interview: dynamic multi-participant grid canvas
        const allVideoTracks: { name: string; track: MediaStreamTrack }[] = [];
        if (hostCamTrack) allVideoTracks.push({ name: hostName, track: hostCamTrack });
        remoteList.forEach((p, idx) => {
          const c = extractMediaStreamTrack(p, Track.Source.Camera);
          if (c) allVideoTracks.push({ name: p.name || `Guest ${idx + 1}`, track: c });
        });

        if (allVideoTracks.length >= 2 && typeof document !== "undefined") {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = 1280;
            canvas.height = 720;
            const ctx = canvas.getContext("2d");

            if (ctx) {
              const videoElements: HTMLVideoElement[] = [];
              let isDrawing = true;
              let animId: number;

              allVideoTracks.forEach((vt) => {
                const vid = document.createElement("video");
                vid.muted = true;
                vid.autoplay = true;
                vid.playsInline = true;
                vid.srcObject = new MediaStream([vt.track]);
                vid.play().catch(() => {});
                videoElements.push(vid);
              });

              const drawLoop = () => {
                if (!isDrawing) return;
                ctx.fillStyle = "#090a10";
                ctx.fillRect(0, 0, 1280, 720);

                const count = videoElements.length;
                if (count === 2) {
                  // Side-by-side 2-up split
                  try {
                    ctx.drawImage(videoElements[0], 0, 0, 640, 720);
                    ctx.drawImage(videoElements[1], 640, 0, 640, 720);
                  } catch {}
                } else if (count >= 3) {
                  // 2x2 grid
                  const cellW = 640;
                  const cellH = 360;
                  videoElements.slice(0, 4).forEach((vid, i) => {
                    const col = i % 2;
                    const row = Math.floor(i / 2);
                    try {
                      ctx.drawImage(vid, col * cellW, row * cellH, cellW, cellH);
                    } catch {}
                  });
                }

                animId = requestAnimationFrame(drawLoop);
              };
              animId = requestAnimationFrame(drawLoop);

              const compositeVideoTracks = canvas.captureStream ? canvas.captureStream(30).getVideoTracks() : [];
              const compositeAudioTracks: MediaStreamTrack[] = [];

              let audioCtx: AudioContext | null = null;
              try {
                const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioCtxClass && activeMicTracks.length > 0) {
                  audioCtx = new AudioCtxClass();
                  const dest = audioCtx.createMediaStreamDestination();
                  activeMicTracks.forEach((t) => {
                    try {
                      const s = audioCtx!.createMediaStreamSource(new MediaStream([t]));
                      s.connect(dest);
                    } catch {}
                  });
                  compositeAudioTracks.push(...dest.stream.getAudioTracks());
                }
              } catch {}

              const compositeStream = new MediaStream([...compositeVideoTracks, ...compositeAudioTracks]);
              const compCleanup = () => {
                isDrawing = false;
                cancelAnimationFrame(animId);
                videoElements.forEach((vid) => {
                  vid.pause();
                  vid.srcObject = null;
                });
                if (audioCtx && audioCtx.state !== "closed") audioCtx.close().catch(() => {});
              };
              compositeCleanupRef.current = compCleanup;

              startSingleTrackRecorder({
                id: "interview-composite",
                label: "Interview Composite",
                role: "host",
                trackType: "composite",
                fileName: `interview-composite.${vExt}`,
                participantIdentity: "composite",
                participantName: "Composite Interview",
                stream: compositeStream,
                mimeType: codecs.videoMimeType,
                cleanup: compCleanup,
              });
            }
          } catch (compErr) {
            console.warn("Composite stream creation skipped:", compErr);
          }
        }

        setStatus("recording");
        setDuration(0);
        updateTracksState();

        // Elapsed duration timer
        durationIntervalRef.current = setInterval(() => {
          setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
          updateTracksState();
        }, 1000);
      } catch (err: unknown) {
        console.error("Failed to start studio multi-track recording:", err);
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to start multi-track recording"
        );
        setStatus("error");
      }
    },
    [localParticipant, remoteParticipants, room, displayName, startSingleTrackRecorder, updateTracksState]
  );

  // Start Local Recording (Guest Side Tap)
  const startGuestLocalRecording = useCallback((recordingStartTimestamp?: number) => {
    if (recordersRef.current.size > 0) {
      return;
    }

    try {
      setErrorMessage(null);

      const camTrack = extractMediaStreamTrack(localParticipant, Track.Source.Camera);
      const micTrack = extractMediaStreamTrack(localParticipant, Track.Source.Microphone);

      if (!camTrack && !micTrack) return;

      const codecs = detectSupportedCodecs();
      const vExt = codecs.videoExtension;
      const aExt = codecs.audioExtension;
      const identity = localParticipant?.identity || "guest";
      const name = localParticipant?.name || displayName || "Guest";

      const startDelayMs =
        recordingStartTimestamp && Number.isFinite(recordingStartTimestamp)
          ? Math.max(0, Date.now() - recordingStartTimestamp)
          : 0;
      startTimeRef.current = Date.now() - startDelayMs;
      sessionStartEpochRef.current = performance.now() - startDelayMs;

      if (camTrack) {
        startSingleTrackRecorder({
          id: "guest-video",
          label: `${name} Video`,
          role: "guest",
          trackType: "video",
          fileName: `guest-video.${vExt}`,
          participantIdentity: identity,
          participantName: name,
          stream: new MediaStream([camTrack]),
          mimeType: codecs.videoMimeType,
        });
      }

      if (micTrack) {
        startSingleTrackRecorder({
          id: "guest-audio",
          label: `${name} Audio`,
          role: "guest",
          trackType: "audio",
          fileName: `guest-audio.${aExt}`,
          participantIdentity: identity,
          participantName: name,
          stream: new MediaStream([micTrack]),
          mimeType: codecs.audioMimeType,
        });
      }

      setStatus("recording");
      setDuration(0);
      updateTracksState();

      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
        updateTracksState();
      }, 1000);
    } catch (err) {
      console.error("Failed to start guest local recording:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to start guest recording.");
      setStatus("error");
    }
  }, [localParticipant, displayName, startSingleTrackRecorder, updateTracksState]);

  // Stop Recording and Finalize all Deliverables
  const stopAllRecordings = useCallback(async () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (recordersRef.current.size === 0) {
      setStatus("idle");
      return;
    }

    setStatus("finalizing");

    const totalDurationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    // Stop all MediaRecorders and gather their Blobs
    const stopPromises: Promise<{
      id: string;
      label: string;
      blob: Blob;
      role: "host" | "guest";
      trackType: "video" | "audio" | "composite";
      fileName: string;
      participantIdentity: string;
      participantName: string;
      durationSeconds: number;
      offsetMs: number;
      localUrl: string;
    }>[] = [];

    recordersRef.current.forEach((rec) => {
      const p = new Promise<any>((resolve) => {
        const recorder = rec.mediaRecorder;

        if (recorder.state === "inactive") {
          const finalBlob = new Blob(rec.chunks, { type: rec.mimeType });
          const localUrl = URL.createObjectURL(finalBlob);
          resolve({
            id: rec.id,
            label: rec.label,
            blob: finalBlob,
            role: rec.role,
            trackType: rec.trackType,
            fileName: rec.fileName,
            participantIdentity: rec.participantIdentity,
            participantName: rec.participantName,
            durationSeconds: totalDurationSeconds,
            offsetMs: rec.offsetMs,
            localUrl,
          });
          return;
        }

        recorder.onstop = () => {
          const finalBlob = new Blob(rec.chunks, { type: rec.mimeType });
          const localUrl = URL.createObjectURL(finalBlob);
          resolve({
            id: rec.id,
            label: rec.label,
            blob: finalBlob,
            role: rec.role,
            trackType: rec.trackType,
            fileName: rec.fileName,
            participantIdentity: rec.participantIdentity,
            participantName: rec.participantName,
            durationSeconds: totalDurationSeconds,
            offsetMs: rec.offsetMs,
            localUrl,
          });
        };

        try {
          recorder.stop();
        } catch {
          // Fallback if stop fails
          const finalBlob = new Blob(rec.chunks, { type: rec.mimeType });
          const localUrl = URL.createObjectURL(finalBlob);
          resolve({
            id: rec.id,
            label: rec.label,
            blob: finalBlob,
            role: rec.role,
            trackType: rec.trackType,
            fileName: rec.fileName,
            participantIdentity: rec.participantIdentity,
            participantName: rec.participantName,
            durationSeconds: totalDurationSeconds,
            offsetMs: rec.offsetMs,
            localUrl,
          });
        }
      });

      stopPromises.push(p);
    });

    try {
      const results = await Promise.all(stopPromises);

      // Clean up composite canvas loop if running
      if (compositeCleanupRef.current) {
        compositeCleanupRef.current();
        compositeCleanupRef.current = null;
      }

      // Update track list with local object URLs for immediate user download
      const updatedTrackList: TrackItemInfo[] = results.map((r) => ({
        id: r.id,
        label: r.label,
        role: r.role,
        trackType: r.trackType,
        isActive: false,
        fileSizeMb: parseFloat((r.blob.size / (1024 * 1024)).toFixed(2)),
        fileName: r.fileName,
        downloadUrl: r.localUrl,
      }));
      setRecordedTracks(updatedTrackList);

      // Set fallback download URL to the host video or primary track
      if (results.length > 0) {
        setLocalDownloadUrl(results[0].localUrl);
      }

      // Upload all deliverables to server
      await uploadAllRecordings(results);
    } catch (err: unknown) {
      console.error("Failed to finalize all recordings:", err);
      setErrorMessage("Failed to finalize all media tracks.");
      setStatus("error");
    }
  }, [uploadAllRecordings]);

  // Broadcast coordinated recording signal to guest (Option A coordination)
  const broadcastRecordingCommand = useCallback(
    async (action: "START" | "STOP", forceSolo = false) => {
      const signal: RecordingDataMessage = {
        type: "RECORDING_SIGNAL",
        action,
        timestamp: Date.now(),
      };

      if (action === "START") {
        if (role === "host") {
          startHostMultiTrackRecording(forceSolo);
        } else {
          startGuestLocalRecording(signal.timestamp);
        }
      }

      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(signal));

        // Publish over reliable LiveKit data channel
        await room.localParticipant.publishData(data, { reliable: true });
      } catch (err) {
        console.warn("Failed to broadcast recording data signal to remote participants:", err);
      }

      if (action === "STOP") {
        stopAllRecordings();
      }
    },
    [room, role, startHostMultiTrackRecording, startGuestLocalRecording, stopAllRecordings]
  );

  // Listen for recording commands from remote host (for Guest browser)
  useEffect(() => {
    const handleDataReceived = (payload: Uint8Array, participant?: Participant) => {
      if (role !== "guest" || !participant?.identity?.toLowerCase().startsWith("host-")) {
        return;
      }

      try {
        const decoder = new TextDecoder();
        const parsed = JSON.parse(decoder.decode(payload)) as Partial<RecordingDataMessage>;
        if (parsed.type === "RECORDING_SIGNAL" && Number.isFinite(parsed.timestamp)) {
          if (parsed.action === "START") {
            startGuestLocalRecording(parsed.timestamp);
          } else if (parsed.action === "STOP") {
            stopAllRecordings();
          }
        }
      } catch {
        // Ignore unrelated data channel payloads
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, role, startGuestLocalRecording, stopAllRecordings]);

  // A late-joining guest receives the same start signal and records its own source tracks.
  useEffect(() => {
    if (status !== "recording" || role !== "host") return;

    const handleParticipantConnected = (participant: RemoteParticipant) => {
      if (!participant.identity.toLowerCase().startsWith("guest-")) return;

      const signal: RecordingDataMessage = {
        type: "RECORDING_SIGNAL",
        action: "START",
        timestamp: startTimeRef.current,
      };
      const data = new TextEncoder().encode(JSON.stringify(signal));
      room.localParticipant
        .publishData(data, {
          reliable: true,
          destinationIdentities: [participant.identity],
        })
        .catch((err: unknown) => {
          console.error("Failed to start recording for late-joining guest:", err);
          setWarningMessage("The late-joining guest did not receive the recording start signal.");
        });
    };

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
    };
  }, [status, role, room]);

  // Warn before closing browser tab during recording or upload
  useEffect(() => {
    if (status !== "recording" && status !== "uploading" && status !== "finalizing") return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "A studio recording is in progress or uploading. Leaving now will lose your interview recording.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [status]);

  // Clean up all MediaRecorders and Object URLs on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      recordersRef.current.forEach((rec) => {
        if (rec.mediaRecorder && rec.mediaRecorder.state === "recording") {
          try {
            rec.mediaRecorder.stop();
          } catch {}
        }
        if (rec.cleanup) {
          rec.cleanup();
        }
      });
      if (compositeCleanupRef.current) {
        compositeCleanupRef.current();
      }
    };
  }, []);

  return {
    status,
    duration,
    fileSizeMb,
    uploadProgress,
    errorMessage,
    warningMessage,
    localDownloadUrl,
    recordedTracks,
    missingWarning,
    startRecording: (forceSolo = false) => broadcastRecordingCommand("START", forceSolo),
    stopRecording: () => broadcastRecordingCommand("STOP"),
    dismissError: () => setErrorMessage(null),
    dismissWarning: () => setWarningMessage(null),
    dismissMissingWarning: () => setMissingWarning(null),
  };
}
