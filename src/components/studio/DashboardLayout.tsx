"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Radio,
  FileVideo,
  Settings,
  Plus,
  Video,
  Mic,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Disc,
  Sparkles,
  ExternalLink,
  Sliders,
  Camera,
  Layers,
  ChevronRight,
  Menu,
  X,
  User,
  Calendar,
  Clock,
  ChevronDown,
  Activity,
  Headphones,
} from "lucide-react";
import { generateRoomId } from "@/lib/utils";
import { PreflightMediaTest } from "./PreflightMediaTest";
import { InterviewDashboard } from "./InterviewDashboard";
import { RecordingsLibrary } from "./RecordingsLibrary";
import type { Interview } from "@/types/studio";

type DashboardTab = "overview" | "sessions" | "recordings" | "settings";

export function DashboardLayout() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Quick host launcher state
  const [hostName, setHostName] = useState("Creator Host");
  const [sessionTitle, setSessionTitle] = useState("Creator Deep Dive");
  const [roomId, setRoomId] = useState("og-studio");
  const [origin, setOrigin] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  // Quick guest join state
  const [guestCode, setGuestCode] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);

  // Create Interview Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalGuestName, setModalGuestName] = useState("");
  const [modalPasscode, setModalPasscode] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);

  // Recent interviews cache
  const [recentInterviews, setRecentInterviews] = useState<Interview[]>([]);
  const [isLoadingInterviews, setIsLoadingInterviews] = useState(true);

  useEffect(() => {
    setRoomId(generateRoomId("og"));
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // Sync tab with URL query params
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const roomParam = searchParams.get("room") || searchParams.get("code");

    if (roomParam) {
      setGuestCode(roomParam);
      setActiveTab("overview");
    } else if (tabParam === "sessions") {
      setActiveTab("sessions");
    } else if (tabParam === "recordings") {
      setActiveTab("recordings");
    } else if (tabParam === "settings") {
      setActiveTab("settings");
    } else if (tabParam === "overview") {
      setActiveTab("overview");
    }
  }, [searchParams]);

  const loadRecentInterviews = useCallback(async () => {
    setIsLoadingInterviews(true);
    try {
      const res = await fetch("/api/interviews");
      if (res.ok) {
        const data = await res.json();
        setRecentInterviews(data.interviews || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingInterviews(false);
    }
  }, []);

  useEffect(() => {
    loadRecentInterviews();
  }, [loadRecentInterviews]);

  const handleCopyHostInvite = async () => {
    const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
    const inviteUrl = `${base}/?room=${encodeURIComponent(roomId)}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      prompt("Copy Guest Invite Link:", inviteUrl);
    }
  };

  const handleCopySessionLink = async (interviewId: string, guest?: string) => {
    const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
    const guestParam = guest ? `&name=${encodeURIComponent(guest)}` : "";
    const inviteUrl = `${base}/?room=${encodeURIComponent(interviewId)}${guestParam}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedSessionId(interviewId);
      setTimeout(() => setCopiedSessionId(null), 2500);
    } catch {
      prompt("Copy Guest Invite Link:", inviteUrl);
    }
  };

  const handleLaunchQuickStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId.trim() || !hostName.trim()) return;

    setIsLaunching(true);
    try {
      await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: roomId.trim(),
          title: sessionTitle.trim(),
          hostName: hostName.trim(),
          guestName: "Guest",
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

  const handleJoinGuest = (e: React.FormEvent) => {
    e.preventDefault();
    setGuestError(null);

    let cleanCode = guestCode.trim();
    if (!cleanCode) {
      setGuestError("Please enter a room code or invite URL.");
      return;
    }

    try {
      if (cleanCode.startsWith("http://") || cleanCode.startsWith("https://")) {
        const url = new URL(cleanCode);
        const queryRoom = url.searchParams.get("room") || url.searchParams.get("code");
        if (queryRoom) cleanCode = queryRoom.trim();
        else {
          const segs = url.pathname.split("/").filter(Boolean);
          if (segs[0] === "room" && segs[1]) cleanCode = segs[1].trim();
        }
      }
    } catch {
      // not a url
    }

    const name = guestName.trim() || "Guest Participant";
    const params = new URLSearchParams({
      role: "guest",
      name,
    });
    router.push(`/room/${encodeURIComponent(cleanCode)}?${params.toString()}`);
  };

  const handleModalCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) return;

    setIsCreatingSession(true);
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: modalTitle.trim(),
          hostName: hostName.trim() || "Creator Host",
          guestName: modalGuestName.trim() || "Guest",
          passcode: modalPasscode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedInviteUrl(data.inviteUrl);
        setModalTitle("");
        setModalGuestName("");
        setModalPasscode("");
        await loadRecentInterviews();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingSession(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0c0d12] text-slate-100 font-sans select-none antialiased">
      {/* 1. RIVERSIDE-STYLE SIDEBAR (Desktop) */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-[#1e2230] bg-[#11131a] p-4 shrink-0 justify-between">
        <div className="space-y-5">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 text-white shadow-lg shadow-purple-950/40 ring-1 ring-purple-400/20">
              <Radio className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-white text-sm">OneGuest</span>
                <span className="rounded bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider text-purple-300">
                  Studio
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <span className="truncate">Creator Workspace</span>
              </div>
            </div>
          </div>

          {/* Workspace Switcher Pill */}
          <div className="rounded-xl border border-[#202533] bg-[#161822] px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span className="text-xs font-semibold text-slate-200">Main Studio Space</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase">1-on-1</span>
          </div>

          {/* Primary "+ Create Studio Session" Button (Riverside style prominent action) */}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 text-xs font-bold shadow-lg shadow-purple-950/40 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.8]" />
            <span>New Studio Session</span>
          </button>

          {/* Navigation Items */}
          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-[#1d212d] text-white border border-[#2b3244] shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#161922]"
              }`}
            >
              <LayoutDashboard className={`h-4 w-4 ${activeTab === "overview" ? "text-purple-400" : "text-slate-400"}`} />
              <span>Studio Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("sessions")}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "sessions"
                  ? "bg-[#1d212d] text-white border border-[#2b3244] shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#161922]"
              }`}
            >
              <div className="flex items-center gap-3">
                <Radio className={`h-4 w-4 ${activeTab === "sessions" ? "text-purple-400" : "text-slate-400"}`} />
                <span>Interviews</span>
              </div>
              {recentInterviews.length > 0 && (
                <span className="rounded-full bg-[#202533] px-2 py-0.5 text-[10px] font-mono font-medium text-slate-300">
                  {recentInterviews.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("recordings")}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "recordings"
                  ? "bg-[#1d212d] text-white border border-[#2b3244] shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#161922]"
              }`}
            >
              <FileVideo className={`h-4 w-4 ${activeTab === "recordings" ? "text-purple-400" : "text-slate-400"}`} />
              <span>Recordings Library</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "settings"
                  ? "bg-[#1d212d] text-white border border-[#2b3244] shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#161922]"
              }`}
            >
              <Sliders className={`h-4 w-4 ${activeTab === "settings" ? "text-purple-400" : "text-slate-400"}`} />
              <span>Hardware & Settings</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer: Engine Status */}
        <div className="rounded-xl border border-[#1e2330] bg-[#14161f] p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-slate-200">LiveKit WebRTC</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">ONLINE</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Hardware multi-track capture ready
          </p>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0c0d12]">
        {/* Top Navbar */}
        <header className="h-16 border-b border-[#1e2230] bg-[#10121a]/95 px-4 sm:px-8 flex items-center justify-between shrink-0 backdrop-blur-md sticky top-0 z-30">
          {/* Mobile hamburger & brand */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-2 rounded-lg border border-[#232736] bg-[#161922] text-slate-300"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-purple-400" />
              <span className="font-bold text-white text-sm">OneGuest Studio</span>
            </div>
          </div>

          {/* Desktop Breadcrumbs */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
            <span className="text-slate-500 font-medium">OneGuest Studio</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
            <span className="font-semibold text-slate-200 capitalize">
              {activeTab === "overview"
                ? "Studio Overview"
                : activeTab === "sessions"
                ? "Interviews & Schedules"
                : activeTab === "recordings"
                ? "Recordings Library"
                : "Hardware Diagnostics"}
            </span>
          </div>

          {/* Top Bar Actions */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 text-xs font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.8]" />
              <span className="hidden sm:inline">Schedule Interview</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-[#1e2230] bg-[#11131a] p-3 space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab("overview");
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-[#1a1d27]"
            >
              <LayoutDashboard className="h-4 w-4 text-purple-400" />
              <span>Studio Overview</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("sessions");
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-[#1a1d27]"
            >
              <Radio className="h-4 w-4 text-indigo-400" />
              <span>Interviews</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("recordings");
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-[#1a1d27]"
            >
              <FileVideo className="h-4 w-4 text-emerald-400" />
              <span>Recordings</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("settings");
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-[#1a1d27]"
            >
              <Sliders className="h-4 w-4 text-slate-400" />
              <span>Settings</span>
            </button>
          </div>
        )}

        {/* Main Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-6xl w-full mx-auto">
          {/* TAB 1: STUDIO OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Riverside-Inspired Launch Deck (Host + Guest) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Host Studio Session Card */}
                <div className="rounded-2xl border border-[#202534] bg-gradient-to-b from-[#141722] to-[#0f1118] p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1f2433] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                        <Mic className="h-5 w-5 stroke-[2.2]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-wide">Host Studio Session</h3>
                        <p className="text-xs text-slate-400">Launch studio room & invite 1 guest</p>
                      </div>
                    </div>
                    <span className="rounded-md bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-extrabold text-purple-300 uppercase tracking-wider">
                      Host Mode
                    </span>
                  </div>

                  <form onSubmit={handleLaunchQuickStudio} className="space-y-3.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Host Display Name
                      </label>
                      <input
                        type="text"
                        required
                        value={hostName}
                        onChange={(e) => setHostName(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        className="w-full rounded-xl border border-[#262c3b] bg-[#0c0e14] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Interview Session Title
                      </label>
                      <input
                        type="text"
                        value={sessionTitle}
                        onChange={(e) => setSessionTitle(e.target.value)}
                        placeholder="e.g. Episode 10: Building with AI"
                        className="w-full rounded-xl border border-[#262c3b] bg-[#0c0e14] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Room code & copy */}
                    <div className="rounded-xl border border-[#212634] bg-[#0a0c10] p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Private Room ID</span>
                        <button
                          type="button"
                          onClick={() => setRoomId(generateRoomId("og"))}
                          className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                        >
                          Generate New
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={roomId}
                          className="flex-1 font-mono text-xs font-bold text-purple-300 bg-transparent focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleCopyHostInvite}
                          className="flex items-center gap-1.5 rounded-lg border border-[#2d3446] bg-[#161a24] px-2.5 py-1 text-xs text-slate-200 hover:text-white cursor-pointer transition-colors"
                        >
                          {copiedLink ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-300 text-[11px]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 text-slate-400" />
                              <span className="text-[11px]">Copy Invite</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLaunching}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-4 py-3 text-xs font-bold shadow-lg shadow-purple-950/40 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {isLaunching ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Preparing Green Room...</span>
                        </>
                      ) : (
                        <>
                          <span>Enter Studio as Host</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* 2. Join as Guest Card */}
                <div className="rounded-2xl border border-[#202534] bg-gradient-to-b from-[#141722] to-[#0f1118] p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1f2433] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                        <Video className="h-5 w-5 stroke-[2.2]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-wide">Join as Guest</h3>
                        <p className="text-xs text-slate-400">Enter with a private invite link or code</p>
                      </div>
                    </div>
                    <span className="rounded-md bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-extrabold text-cyan-300 uppercase tracking-wider">
                      No Login Needed
                    </span>
                  </div>

                  {guestError && (
                    <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-2.5 text-xs text-rose-300 font-medium">
                      {guestError}
                    </div>
                  )}

                  <form onSubmit={handleJoinGuest} className="space-y-3.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Room Code or Invite Link
                      </label>
                      <input
                        type="text"
                        required
                        value={guestCode}
                        onChange={(e) => setGuestCode(e.target.value)}
                        placeholder="e.g. og-xxxxxx or paste link"
                        className="w-full rounded-xl border border-[#262c3b] bg-[#0c0e14] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none font-mono transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="e.g. Jordan Lee"
                        className="w-full rounded-xl border border-[#262c3b] bg-[#0c0e14] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="rounded-xl border border-[#212634] bg-[#0a0c10] p-3 space-y-1 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px]">
                        <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Green Room Protocol</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        You will test your camera and microphone in the Green Room before joining the live studio broadcast.
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-3 text-xs font-bold shadow-lg shadow-cyan-950/40 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <span>Join Studio Room</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Recent Sessions Deck */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-purple-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Recent Studio Sessions
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("sessions")}
                    className="text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
                  >
                    View All Sessions →
                  </button>
                </div>

                {recentInterviews.length === 0 && !isLoadingInterviews && (
                  <div className="rounded-2xl border border-dashed border-[#232736] bg-[#12141c]/50 p-8 text-center text-xs text-slate-400 space-y-3">
                    <Calendar className="h-8 w-8 text-slate-600 mx-auto" />
                    <p className="font-medium text-slate-300">No scheduled sessions found</p>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                      Create a scheduled interview session or use the quick host launcher above to begin your recording.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recentInterviews.slice(0, 3).map((interview) => (
                    <div
                      key={interview.id}
                      className="rounded-xl border border-[#202534] bg-[#141721] p-4 space-y-3 hover:border-[#2e3549] transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                          {interview.id}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-slate-400 bg-[#1e2330] border border-[#2a3042] px-2 py-0.5 rounded-md">
                          {interview.status}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-white truncate">{interview.title}</h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          Host: <strong className="text-slate-300">{interview.hostName}</strong> • Guest: <strong className="text-slate-300">{interview.guestName || "Any Guest"}</strong>
                        </p>
                      </div>

                      <div className="pt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const params = new URLSearchParams({
                              role: "host",
                              name: interview.hostName,
                              title: interview.title,
                            });
                            router.push(`/room/${encodeURIComponent(interview.id)}?${params.toString()}`);
                          }}
                          className="flex-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold py-1.5 text-center transition-colors cursor-pointer"
                        >
                          Enter Studio
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopySessionLink(interview.id, interview.guestName)}
                          className="rounded-lg border border-[#2b3144] bg-[#1a1e2b] p-1.5 text-slate-300 hover:text-white cursor-pointer"
                          title="Copy Guest Link"
                        >
                          {copiedSessionId === interview.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTERVIEWS / SESSIONS */}
          {activeTab === "sessions" && (
            <div className="space-y-6">
              <InterviewDashboard />
            </div>
          )}

          {/* TAB 3: RECORDINGS LIBRARY */}
          {activeTab === "recordings" && (
            <div className="space-y-6">
              <RecordingsLibrary onStartSession={() => setActiveTab("overview")} />
            </div>
          )}

          {/* TAB 4: SETTINGS & HARDWARE */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-2xl">
              <div className="rounded-2xl border border-[#202534] bg-[#141721] p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-[#1f2433] pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Audio & Video Hardware Diagnostics</h3>
                    <p className="text-xs text-slate-400">Verify your local camera resolution and microphone signal</p>
                  </div>
                </div>

                <PreflightMediaTest />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* SCHEDULE INTERVIEW MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <form
            onSubmit={handleModalCreate}
            className="w-full max-w-lg rounded-2xl border border-[#282d3d] bg-[#12151f] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#232736] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Schedule New Remote Interview
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createdInviteUrl ? (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <Check className="h-4 w-4" />
                  <span>Interview Session Created!</span>
                </div>
                <p className="text-xs text-slate-300">
                  Share this invitation link with your guest to join:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdInviteUrl}
                    className="flex-1 rounded-xl border border-emerald-800 bg-black px-3 py-2 text-xs text-emerald-300 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdInviteUrl);
                      alert("Guest invite copied!");
                    }}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedInviteUrl(null);
                    setShowCreateModal(false);
                  }}
                  className="w-full mt-2 rounded-xl bg-slate-800 py-2 text-xs text-slate-300 font-semibold cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Interview Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={modalTitle}
                    onChange={(e) => setModalTitle(e.target.value)}
                    placeholder="e.g. Episode 12: Building Generative Media"
                    className="w-full rounded-xl border border-[#282d3d] bg-[#0c0e14] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Host Name
                    </label>
                    <input
                      type="text"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      placeholder="e.g. Creator Host"
                      className="w-full rounded-xl border border-[#282d3d] bg-[#0c0e14] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Guest Name
                    </label>
                    <input
                      type="text"
                      value={modalGuestName}
                      onChange={(e) => setModalGuestName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full rounded-xl border border-[#282d3d] bg-[#0c0e14] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Optional Room Passcode
                  </label>
                  <input
                    type="text"
                    value={modalPasscode}
                    onChange={(e) => setModalPasscode(e.target.value)}
                    placeholder="Leave blank for automatic secure code"
                    className="w-full rounded-xl border border-[#282d3d] bg-[#0c0e14] px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl border border-[#282d3d] px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingSession || !modalTitle.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{isCreatingSession ? "Creating..." : "Generate Session"}</span>
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
