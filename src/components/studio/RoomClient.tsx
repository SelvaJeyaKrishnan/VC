"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Radio,
  RefreshCw,
  Home,
  ShieldAlert,
  Terminal,
  ArrowLeft,
  Camera,
  Sliders,
} from "lucide-react";
import { StudioRoom } from "./StudioRoom";
import { StudioErrorBoundary } from "./StudioErrorBoundary";
import { PreflightMediaTest } from "./PreflightMediaTest";
import { GreenRoom } from "./GreenRoom";
import type { TokenResponse, ParticipantRole } from "@/types/studio";

interface RoomClientProps {
  roomId: string;
  initialRole?: string;
  initialName?: string;
  initialTitle?: string;
}

export function RoomClient({
  roomId,
  initialRole,
  initialName,
  initialTitle,
}: RoomClientProps) {
  const router = useRouter();

  const role: ParticipantRole = initialRole === "host" ? "host" : "guest";
  const defaultName = initialName || (role === "host" ? "Creator Host" : "Guest Participant");
  const defaultTitle = initialTitle || `Studio Session - ${roomId}`;

  // Session metadata
  const [sessionTitle, setSessionTitle] = useState(defaultTitle);
  const [displayName, setDisplayName] = useState(defaultName);

  // Flow states
  const [inGreenRoom, setInGreenRoom] = useState(true);
  const [deviceSelection, setDeviceSelection] = useState<{
    cameraId: string;
    microphoneId: string;
    speakerId: string;
  }>({
    cameraId: "",
    microphoneId: "",
    speakerId: "",
  });

  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMissingConfig, setIsMissingConfig] = useState(false);
  const [hasConnected, setHasConnected] = useState(false);
  const [showPreflight, setShowPreflight] = useState(false);
  const isErrorRef = useRef(false);

  // Fetch session title from interview store if available
  useEffect(() => {
    let isMounted = true;
    fetch(`/api/interviews/${encodeURIComponent(roomId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.interview?.title) {
          setSessionTitle(data.interview.title);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [roomId]);

  const fetchToken = useCallback(
    async (activeName: string) => {
      setIsLoading(true);
      setErrorMessage(null);
      setIsMissingConfig(false);

      try {
        // Generate a unique identity prefix for this participant
        const identity = `${role}-${Math.random().toString(36).substring(2, 8)}`;

        const res = await fetch("/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room: roomId,
            identity,
            name: activeName,
            role,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.error && data.error.includes("Missing LiveKit credentials")) {
            setIsMissingConfig(true);
          }
          throw new Error(data.error || `Failed to connect (Status ${res.status})`);
        }

        // Defensively sanitize serverUrl on the client
        if (data && data.serverUrl) {
          data.serverUrl = data.serverUrl.trim().split(/[\s\r\n]+/)[0];
        }

        setTokenData(data);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while entering the studio";
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [roomId, role]
  );

  const handleEnterStudio = (settings: {
    name: string;
    cameraId: string;
    microphoneId: string;
    speakerId: string;
  }) => {
    setDisplayName(settings.name);
    setDeviceSelection({
      cameraId: settings.cameraId,
      microphoneId: settings.microphoneId,
      speakerId: settings.speakerId,
    });
    setInGreenRoom(false);
    fetchToken(settings.name);
  };

  const handleConnected = () => {
    setHasConnected(true);
    isErrorRef.current = false;
  };

  const handleDisconnected = () => {
    // If an error occurred or the room never established a connection, do not redirect!
    // Keep user on the configuration / error screen so they can see what needs fixing.
    if (isErrorRef.current || !hasConnected) {
      console.warn("Disconnected due to error or failed handshake; retaining error screen.");
      return;
    }
    router.push(`/?left=true&room=${encodeURIComponent(roomId)}`);
  };

  const handleRoomError = (error: Error) => {
    console.error("LiveKit Studio Error:", error);
    isErrorRef.current = true;
    setErrorMessage(error.message);
    const msg = error.message.toLowerCase();
    if (
      msg.includes("api key") ||
      msg.includes("credentials") ||
      msg.includes("signal connection") ||
      msg.includes("could not establish") ||
      msg.includes("region settings") ||
      msg.includes("could not fetch") ||
      msg.includes("region")
    ) {
      setIsMissingConfig(true);
    }
  };

  // 1. PHASE 2: Green Room / Pre-flight waiting room
  if (inGreenRoom) {
    return (
      <GreenRoom
        roomId={roomId}
        sessionTitle={sessionTitle}
        initialName={displayName}
        role={role}
        onEnterStudio={handleEnterStudio}
      />
    );
  }

  // 2. Loading State during LiveKit token & signaling negotiation
  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0d0f15] p-4 text-center">
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute -inset-4 rounded-full bg-purple-500/15 blur-xl animate-pulse" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-purple-500/30 bg-[#141721] shadow-2xl">
            <Radio className="h-8 w-8 text-purple-400 stroke-[2.2]" />
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
          Connecting to OneGuest Studio
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-6">
          Initializing WebRTC media engine for session{" "}
          <span className="font-mono text-purple-300 font-semibold">{roomId}</span>...
        </p>

        {/* Pulse Bar */}
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-full bg-gradient-to-r from-purple-500 to-indigo-400 animate-pulse" />
        </div>
      </div>
    );
  }

  // 3. Error State with Fallbacks and return to Green Room
  if (errorMessage || !tokenData) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0d0f15] p-4 text-center">
        <div className="w-full max-w-lg rounded-3xl border border-[#232736] bg-[#141721] p-6 sm:p-8 shadow-2xl text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30">
              <ShieldAlert className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Studio Connection Error</h2>
              <p className="text-xs text-slate-400">
                {isMissingConfig ? "Invalid or Missing LiveKit Credentials" : `Session: ${roomId}`}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-3.5 text-xs text-rose-200 mb-5 leading-relaxed font-mono">
            {errorMessage || "Failed to receive authorization token from studio server."}
          </div>

          {isMissingConfig && (
            <div className="rounded-xl border border-purple-800/60 bg-purple-950/20 p-4 mb-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                <Terminal className="h-4 w-4" />
                <span>LiveKit Environment Variables Required</span>
              </div>
              <p className="text-[11px] text-slate-400">
                To connect to real LiveKit video servers, configure your <code className="text-purple-200 bg-slate-900 px-1 py-0.5 rounded">.env.local</code> file with your actual keys from{" "}
                <a
                  href="https://cloud.livekit.io"
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-300 underline hover:text-purple-200"
                >
                  LiveKit Cloud
                </a>:
              </p>
              <pre className="rounded-lg bg-slate-950 p-2.5 text-[11px] font-mono text-purple-200/90 overflow-x-auto">
{`LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxx
LIVEKIT_API_SECRET=sec_yyyyyyyyyyyyyyyyyyyyyyyyyyyy`}
              </pre>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => setInGreenRoom(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#2b3144] bg-[#1a1e2b] px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-[#23283a] hover:text-white transition-colors cursor-pointer"
            >
              <Sliders className="h-4 w-4 text-purple-400" />
              <span>Return to Device Setup (Green Room)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPreflight((prev) => !prev)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition-colors cursor-pointer"
            >
              <Camera className="h-4 w-4 text-purple-400" />
              <span>{showPreflight ? "Hide Local Camera & Mic Test" : "Test Local Camera & Mic Feed"}</span>
            </button>

            {showPreflight && (
              <div className="pt-1">
                <PreflightMediaTest onClose={() => setShowPreflight(false)} />
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => fetchToken(displayName)}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-3 text-xs font-bold text-white transition-all active:scale-[0.98] cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Connection</span>
              </button>

              <Link
                href="/"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-[#2b3144] bg-[#1a1e2b] px-4 py-3 text-xs font-semibold text-slate-300 hover:bg-[#23283a] hover:text-white transition-colors cursor-pointer"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Exit to Home</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Connected Studio Stage wrapped in ErrorBoundary
  return (
    <StudioErrorBoundary roomId={roomId} onReset={() => fetchToken(displayName)}>
      <StudioRoom
        token={tokenData.token}
        serverUrl={tokenData.serverUrl}
        roomId={roomId}
        roomName={sessionTitle}
        role={role}
        videoOptions={
          deviceSelection.cameraId ? { deviceId: deviceSelection.cameraId } : true
        }
        audioOptions={
          deviceSelection.microphoneId ? { deviceId: deviceSelection.microphoneId } : true
        }
        onConnected={handleConnected}
        onDisconnected={handleDisconnected}
        onError={handleRoomError}
      />
    </StudioErrorBoundary>
  );
}
