"use client";

import { useState, useCallback } from "react";
import type { RecordingStatePlaceholder } from "@/types/studio";

/**
 * Architecture hook for Milestone 2 Local Recording.
 * Prepares the recording state, local audio/video media tap points, and status indicators
 * without executing full client-side WebM/MP4 encoders or cloud uploads in Milestone 1.
 */
export function useStudioRecording() {
  const [recordingState, setRecordingState] = useState<RecordingStatePlaceholder>({
    isRecording: false,
    durationSeconds: 0,
    localStreamReady: false,
    milestone: "ready_for_milestone_2",
  });

  const prepareLocalMediaRecorder = useCallback((_localAudioTrack?: MediaStreamTrack, _localVideoTrack?: MediaStreamTrack) => {
    // Scaffold hook point for Milestone 2: MediaRecorder with audio/video stream muxing
    setRecordingState((prev) => ({
      ...prev,
      localStreamReady: true,
    }));
  }, []);

  return {
    recordingState,
    prepareLocalMediaRecorder,
  };
}
