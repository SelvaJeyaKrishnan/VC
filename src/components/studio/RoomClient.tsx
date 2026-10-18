"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Radio,
  RefreshCw,
  Home,
  ShieldAlert,
  Terminal,
  Sliders,
  Camera,
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
  initialInviteToken?: string;
}

export function RoomClient({
  roomId,
  initialRole,
  initialName,
  initialTitle,
  initialInviteToken,
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

  const fetchToken = useCallback(
    async (activeName: string) => {
      setIsLoading(true);
      setErrorMessage(null);
      setIsMissingConfig(false);

      try {
        const identity = `${role}-${Math.random().toString(36).substring(2, 8)}`;

        const res = await fetch("/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room: roomId,
            identity,
            name: activeName,
            role,
            passcode:
              role === "guest" && initialInviteToken
                ? window.sessionStorage.getItem(`oneguest:invite:${initialInviteToken}`) || undefined
                : undefined,
            inviteToken: role === "guest" ? initialInviteToken : undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.error && data.error.includes("Missing LiveKit credentials")) {
            setIsMissingConfig(true);
          }
          throw new Error(data.error || `Failed to connect (Status ${res.status})`);
        }

        if (data && data.serverUrl) {
          data.serverUrl = data.serverUrl.trim().split(/[\s\r\n]+/)[0];
        }

        setTokenData(data);
        if (role === "guest" && initialInviteToken) {
          window.sessionStorage.removeItem(`oneguest:invite:${initialInviteToken}`);
        }
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
    [roomId, role, initialInviteToken]
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
    if (isErrorRef.current || !hasConnected) {
      console.warn("Disconnected due to error; retaining error screen.");
      return;
    }
    if (role === "guest" && initialInviteToken) {
      router.push(`/join/${encodeURIComponent(initialInviteToken)}?name=${encodeURIComponent(displayName)}`);
      return;
    }
    router.push("/dashboard");
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

  // 1. Green Room / Pre-flight waiting room
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

  // 2. Loading State
  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a0b0e] p-4 text-center select-none">
        <div className="relative mb-5 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#c0915a] text-[#0a0b0e] shadow-lg shadow-[#c0915a]/20">
            <Radio className="h-7 w-7 stroke-[2.4]" />
          </div>
        </div>

        <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
          Connecting to Studio
        </h2>
        <p className="text-xs text-[#8c94a4] max-w-sm mb-6">
          Initializing high-definition media engine for studio{" "}
          <span className="font-mono text-[#cf9f67] font-semibold">{roomId}</span>...
        </p>

        <div className="h-1 w-44 overflow-hidden rounded-full bg-[#1a1e26]">
          <div className="h-full w-full bg-[#c0915a] animate-pulse" />
        </div>
      </div>
    );
  }

  // 3. Error State with Diagnostics
  if (errorMessage || !tokenData) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a0b0e] p-4 text-center select-none">
        <div className="w-full max-w-lg rounded-xl border border-[#1f242e] bg-[#13161c] p-6 sm:p-8 shadow-2xl text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-white">Studio Connection Error</h2>
              <p className="text-xs text-[#8c94a4]">
                {isMissingConfig ? "Invalid or Missing LiveKit Credentials" : `Studio: ${roomId}`}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-200 mb-5 leading-relaxed font-mono">
            {errorMessage || "Failed to receive authorization token from studio server."}
          </div>

          {isMissingConfig && (
            <div className="rounded-lg border border-[#3b2a1a] bg-[#1c140d] p-4 mb-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#cf9f67]">
                <Terminal className="h-4 w-4" />
                <span>LiveKit Environment Variables Required</span>
              </div>
              <p className="text-[11px] text-[#d1d5db]">
                To connect to real LiveKit video servers, configure your <code className="text-[#cf9f67] bg-[#0a0b0e] px-1 py-0.5 rounded">.env.local</code> file with your actual keys from{" "}
                <a
                  href="https://cloud.livekit.io"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#c0915a] underline hover:text-[#cf9f67]"
                >
                  LiveKit Cloud
                </a>:
              </p>
              <pre className="rounded bg-[#0a0b0e] p-2.5 text-[11px] font-mono text-[#d1d5db] overflow-x-auto">
{`LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxx
LIVEKIT_API_SECRET=sec_yyyyyyyyyyyyyyyyyyyyyyyyyyyy`}
              </pre>
            </div>
          )}

          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={() => setInGreenRoom(true)}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#242a36] bg-[#161a22] px-4 py-2 text-xs font-semibold text-[#d1d5db] hover:bg-[#1e2330] hover:text-white transition-colors cursor-pointer"
            >
              <Sliders className="h-4 w-4 text-[#c0915a]" />
              <span>Return to Device Setup (Green Room)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPreflight((prev) => !prev)}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#c0915a]/30 bg-[#c0915a]/10 px-4 py-2 text-xs font-semibold text-[#cf9f67] hover:bg-[#c0915a]/20 transition-colors cursor-pointer"
            >
              <Camera className="h-4 w-4 text-[#c0915a]" />
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
                className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] px-4 py-2.5 text-xs font-bold text-[#0a0b0e] transition-all cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Connection</span>
              </button>

              <Link
                href={
                  role === "guest" && initialInviteToken
                    ? `/join/${encodeURIComponent(initialInviteToken)}`
                    : "/dashboard"
                }
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg border border-[#242a36] bg-[#161a22] px-4 py-2.5 text-xs font-semibold text-[#d1d5db] hover:bg-[#1e2330] hover:text-white transition-colors cursor-pointer"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Return Home</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Connected Studio Stage
  return (
    <StudioErrorBoundary roomId={roomId} onReset={() => fetchToken(displayName)}>
      <StudioRoom
        token={tokenData.token}
        serverUrl={tokenData.serverUrl}
        roomId={roomId}
        inviteToken={initialInviteToken}
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
