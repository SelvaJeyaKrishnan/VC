"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mic,
  Video,
  Radio,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Headphones,
  Sparkles,
  Lock,
  Camera,
  Calendar,
} from "lucide-react";
import { generateRoomId, cn } from "@/lib/utils";
import { PreflightMediaTest } from "./PreflightMediaTest";
import { InterviewDashboard } from "./InterviewDashboard";

export function CombinedStudioHub() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"host" | "guest" | "dashboard">("host");
  const [hostName, setHostName] = useState("Creator Host");
  const [sessionTitle, setSessionTitle] = useState("1-on-1 Creator Interview");
  const [roomId, setRoomId] = useState("og-studio");
  const [origin, setOrigin] = useState("");
  const [copiedHostLink, setCopiedHostLink] = useState(false);
  const [isLaunchingHost, setIsLaunchingHost] = useState(false);
  const [showPreflight, setShowPreflight] = useState(false);

  useEffect(() => {
    setRoomId(generateRoomId("og"));
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const [guestRoomInput, setGuestRoomInput] = useState("");
  const [guestName, setGuestName] = useState("");
  const [isJoiningGuest, setIsJoiningGuest] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

  useEffect(() => {
    const roomParam = searchParams.get("room") || searchParams.get("code");
    const tabParam = searchParams.get("tab");

    if (roomParam) {
      setGuestRoomInput(roomParam);
      setActiveTab("guest");
    } else if (tabParam === "guest") {
      setActiveTab("guest");
    } else if (tabParam === "host") {
      setActiveTab("host");
    } else if (tabParam === "dashboard" || tabParam === "interviews") {
      setActiveTab("dashboard");
    }
  }, [searchParams]);

  const getInviteUrl = () => {
    const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
    return `${base}/?room=${encodeURIComponent(roomId)}`;
  };

  const handleCopyHostInvite = async () => {
    const url = getInviteUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopiedHostLink(true);
      setTimeout(() => setCopiedHostLink(false), 2500);
    } catch {
      prompt("Copy Guest Invite Link:", url);
    }
  };

  const handleRegenerateCode = () => {
    setRoomId(generateRoomId("og"));
  };

  const handleHostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim() || !hostName.trim()) return;

    setIsLaunchingHost(true);

    try {
      await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: roomId.trim(),
          title: sessionTitle.trim(),
          hostName: hostName.trim(),
          guestName: "Guest Participant",
        }),
      });
    } catch {
      // Continue anyway
    }

    const params = new URLSearchParams({
      role: "host",
      name: hostName.trim(),
      title: sessionTitle.trim(),
    });
    router.push(`/room/${encodeURIComponent(roomId.trim())}?${params.toString()}`);
  };

  const extractRoomCode = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return "";

    try {
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        const url = new URL(trimmed);
        const queryRoom = url.searchParams.get("room") || url.searchParams.get("code");
        if (queryRoom) return queryRoom.trim();

        const segments = url.pathname.split("/").filter(Boolean);
        if (segments[0] === "room" && segments[1]) {
          return segments[1].trim();
        }
      }
    } catch {
      // not a url
    }

    return trimmed;
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGuestError(null);

    const targetRoom = extractRoomCode(guestRoomInput);
    if (!targetRoom) {
      setGuestError("Please enter a valid room code or invite link.");
      return;
    }

    const name = guestName.trim() || "Guest Participant";
    setIsJoiningGuest(true);

    const params = new URLSearchParams({
      role: "guest",
      name,
    });
    router.push(`/room/${encodeURIComponent(targetRoom)}?${params.toString()}`);
  };

  return (
    <div
      className={cn(
        "w-full mx-auto transition-all duration-300",
        activeTab === "dashboard" ? "max-w-3xl" : "max-w-xl"
      )}
    >
      <div className="relative rounded-3xl border border-[#202534] bg-gradient-to-b from-[#141722] to-[#0f1118] p-5 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 grid grid-cols-3 gap-2 rounded-2xl border border-[#232736] bg-[#0c0e14] p-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("host")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer",
              activeTab === "host"
                ? "bg-purple-600 text-white shadow-md shadow-purple-950/40"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Mic className="h-4 w-4 stroke-[2.2]" />
            <span className="truncate">Host Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("guest")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer",
              activeTab === "guest"
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-950/40"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Video className="h-4 w-4 stroke-[2.2]" />
            <span className="truncate">Join as Guest</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer",
              activeTab === "dashboard"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/40"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Calendar className="h-4 w-4 stroke-[2.2]" />
            <span className="truncate">Sessions</span>
          </button>
        </div>

        {activeTab === "dashboard" ? (
          <InterviewDashboard />
        ) : (
          <>
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowPreflight((prev) => !prev)}
                className="w-full flex items-center justify-between rounded-2xl border border-[#232736] bg-[#0c0e14] hover:bg-[#141722] px-4 py-2.5 text-xs transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-slate-300">
                  <Camera className="h-3.5 w-3.5 text-purple-400" />
                  <span className="font-semibold">Quick Camera & Mic Hardware Test</span>
                </div>
                <span className="rounded-lg bg-purple-500/10 px-2.5 py-1 text-[11px] font-bold text-purple-400 border border-purple-500/30">
                  {showPreflight ? "Hide Test" : "Test Now"}
                </span>
              </button>

              {showPreflight && (
                <div className="mt-3">
                  <PreflightMediaTest onClose={() => setShowPreflight(false)} />
                </div>
              )}
            </div>

            {activeTab === "host" ? (
              <form onSubmit={handleHostSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Host Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full rounded-xl border border-[#282d3d] bg-[#0c0e14] px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Session Title
                  </label>
                  <input
                    type="text"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    placeholder="e.g. Creator Deep-Dive"
                    className="w-full rounded-xl border border-[#282d3d] bg-[#0c0e14] px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-colors focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="rounded-2xl border border-[#232736] bg-[#0c0e14] p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Studio Room Code
                    </span>
                    <button
                      type="button"
                      onClick={handleRegenerateCode}
                      className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                    >
                      Generate New Code
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      className="flex-1 font-mono text-sm tracking-wide rounded-xl border border-[#282d3d] bg-[#12151f] px-3.5 py-2 text-purple-300 focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyHostInvite}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#2b3144] bg-[#1a1e2b] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-[#23283a] transition-colors cursor-pointer"
                    >
                      {copiedHostLink ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-400" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLaunchingHost}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-purple-950/40 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {isLaunchingHost ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Entering Setup...</span>
                    </>
                  ) : (
                    <>
                      <Radio className="h-4 w-4 stroke-[2.2]" />
                      <span>Start Interview & Setup Devices</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleGuestSubmit} className="space-y-4">
                {guestError && (
                  <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300">
                    {guestError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Room Code or Invite Link
                  </label>
                  <input
                    type="text"
                    required
                    value={guestRoomInput}
                    onChange={(e) => setGuestRoomInput(e.target.value)}
                    placeholder="e.g. og-xxxxxx or paste link"
                    className="w-full rounded-xl border border-[#282d3d] bg-[#0c0e14] px-4 py-2.5 font-mono text-sm text-cyan-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Guest Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Jordan Lee"
                    className="w-full rounded-xl border border-[#282d3d] bg-[#0c0e14] px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isJoiningGuest}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-cyan-950/40 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {isJoiningGuest ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Entering Setup...</span>
                    </>
                  ) : (
                    <>
                      <Radio className="h-4 w-4 stroke-[2.2]" />
                      <span>Join Interview & Setup Devices</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
