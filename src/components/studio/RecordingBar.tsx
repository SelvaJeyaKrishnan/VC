"use client";

import { Disc, UploadCloud, CheckCircle2, AlertTriangle, Download, X } from "lucide-react";
import type { RecordingStatus } from "@/hooks/useLocalRecorder";

interface RecordingBarProps {
  status: RecordingStatus;
  duration: number;
  fileSizeMb: number;
  uploadProgress: number;
  errorMessage: string | null;
  localDownloadUrl: string | null;
  role: "host" | "guest";
  onDismissError: () => void;
}

export function RecordingBar({
  status,
  duration,
  fileSizeMb,
  uploadProgress,
  errorMessage,
  localDownloadUrl,
  role,
  onDismissError,
}: RecordingBarProps) {
  if (status === "idle" && !errorMessage && !localDownloadUrl) {
    return null;
  }

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-3 select-none">
      {/* 1. Active Recording Banner */}
      {status === "recording" && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/50 bg-[#160d11]/90 px-4 py-2.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-md bg-rose-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              <span>REC</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-white tracking-wider">
                {formatTimer(duration)}
              </span>
              <span className="text-slate-500 text-xs">•</span>
              <span className="text-xs font-mono text-slate-300">
                {fileSizeMb > 0 ? `${fileSizeMb} MB` : "Capturing raw stream..."}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-rose-300 font-medium">
            <span className="hidden sm:inline">Isolated 1080p Stream</span>
            <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[10px] uppercase font-bold text-rose-300 border border-rose-500/30">
              {role} Track
            </span>
          </div>
        </div>
      )}

      {/* 2. Uploading Track Progress Banner */}
      {status === "uploading" && (
        <div className="rounded-xl border border-purple-500/40 bg-[#141624]/90 px-4 py-3 shadow-2xl backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-purple-300 font-semibold">
              <UploadCloud className="h-4 w-4 animate-bounce text-purple-400" />
              <span>Syncing raw {role} track to studio library...</span>
            </div>
            <span className="font-mono text-xs text-purple-400 font-bold">{uploadProgress}%</span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 3. Upload Completed */}
      {status === "uploaded" && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-2.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Master {role} recording saved to studio library!</span>
          </div>

          {localDownloadUrl && (
            <a
              href={localDownloadUrl}
              download={`${role}-backup-recording.webm`}
              className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              <Download className="h-3 w-3" />
              <span>Save Local Backup</span>
            </a>
          )}
        </div>
      )}

      {/* 4. Error or Safety Backup Banner */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/50 bg-rose-950/70 p-3 shadow-2xl text-xs space-y-1">
          <div className="flex items-center gap-2 text-rose-200">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>

          <div className="flex items-center gap-2">
            {localDownloadUrl && (
              <a
                href={localDownloadUrl}
                download={`${role}-emergency-backup.webm`}
                className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
              >
                <Download className="h-3 w-3" />
                <span>Download Local Copy</span>
              </a>
            )}
            <button
              type="button"
              onClick={onDismissError}
              className="rounded-lg p-1 text-rose-300 hover:text-white cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
