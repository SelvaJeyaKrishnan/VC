"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Radio,
  FileVideo,
  Sliders,
  Plus,
  Video,
  Mic,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Disc,
  Sparkles,
  Layers,
  ChevronRight,
  Menu,
  X,
  Calendar,
  Clock,
  Trash2,
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Lock,
} from "lucide-react";
import { generateRoomId } from "@/lib/utils";
import { PreflightMediaTest } from "./PreflightMediaTest";
import { RecordingsLibrary } from "./RecordingsLibrary";
import type { Interview } from "@/types/studio";
import type { RecordingSession } from "@/lib/recordingStore";

export type DashboardTab = "dashboard" | "interviews" | "recordings" | "settings";

type StatusFilter = "all" | "scheduled" | "active" | "completed";

export function DashboardLayout() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<DashboardTab>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Quick host launcher state
  const [hostName, setHostName] = useState("Creator Host");
  const [sessionTitle, setSessionTitle] = useState("Creator Deep Dive");
  const [roomId, setRoomId] = useState("og-studio");
  const [origin, setOrigin] = useState("");
  const [copiedQuickLink, setCopiedQuickLink] = useState(false);
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
  const [modalError, setModalError] = useState<string | null>(null);

  // Data cache
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [recordingsByRoom, setRecordingsByRoom] = useState<Record<string, RecordingSession>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    setRoomId(generateRoomId("og"));
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // Handle guest invite link redirection: If guest arrives via ?room= or ?code=, take directly to Green Room
  useEffect(() => {
    const roomParam = searchParams.get("room") || searchParams.get("code");
    const nameParam = searchParams.get("name") || "";
    if (roomParam) {
      const query = new URLSearchParams({ role: "guest" });
      if (nameParam) query.set("name", nameParam);
      router.replace(`/room/${encodeURIComponent(roomParam.trim())}?${query.toString()}`);
      return;
    }

    const tabParam = searchParams.get("tab");
    if (tabParam === "dashboard") {
      setActiveTab("dashboard");
    } else if (tabParam === "recordings") {
      setActiveTab("recordings");
    } else if (tabParam === "settings") {
      setActiveTab("settings");
    } else if (tabParam === "interviews" || tabParam === "overview" || tabParam === "sessions") {
      setActiveTab("interviews");
    }
  }, [searchParams, router]);

  const loadData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [intRes, recRes] = await Promise.all([
        fetch("/api/interviews"),
        fetch("/api/recordings"),
      ]);

      if (intRes.ok) {
        const intData = await intRes.json();
        setInterviews(intData.interviews || []);
      }

      if (recRes.ok) {
        const recData = await recRes.json();
        const map: Record<string, RecordingSession> = {};
        for (const s of recData.sessions || []) {
          map[s.roomId] = s;
        }
        setRecordingsByRoom(map);
      }
    } catch {
      // background fetch error
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const buildGuestLink = (interviewId: string, guest?: string) => {
    const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
    const guestParam = guest ? `&name=${encodeURIComponent(guest)}` : "";
    return `${base}/join?code=${encodeURIComponent(interviewId)}${guestParam}`;
  };

  const handleCopyHostInvite = async () => {
    const inviteUrl = buildGuestLink(roomId, "Guest");
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedQuickLink(true);
      setTimeout(() => setCopiedQuickLink(false), 2500);
    } catch {
      prompt("Copy Guest Invite Link:", inviteUrl);
    }
  };

  const handleCopySessionLink = async (interview: Interview) => {
    const inviteUrl = buildGuestLink(interview.id, interview.guestName);
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedSessionId(interview.id);
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
          title: sessionTitle.trim() || `Studio Interview - ${roomId}`,
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
    setModalError(null);
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
      if (!res.ok) {
        throw new Error(data.error || "Failed to create interview");
      }
      setCreatedInviteUrl(data.inviteUrl);
      setModalTitle("");
      setModalGuestName("");
      setModalPasscode("");
      await loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Error creating interview");
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleDeleteInterview = async (id: string) => {
    if (!confirm("Are you sure you want to delete this interview record?")) return;
    try {
      const res = await fetch(`/api/interviews/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setInterviews((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // Filtered interviews for the Interviews Tab
  const filteredInterviews = interviews.filter((i) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      i.title.toLowerCase().includes(q) ||
      i.id.toLowerCase().includes(q) ||
      i.hostName.toLowerCase().includes(q) ||
      (i.guestName && i.guestName.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (statusFilter === "all") return true;
    if (statusFilter === "completed") {
      return i.status === "completed" || !!recordingsByRoom[i.id];
    }
    if (statusFilter === "active") {
      return i.status === "active";
    }
    if (statusFilter === "scheduled") {
      return i.status === "scheduled" && !recordingsByRoom[i.id];
    }
    return true;
  });

  const totalRecordedStems = Object.values(recordingsByRoom).reduce(
    (acc, session) => acc + (session.tracks?.length || 0),
    0
  );

  return (
    <div className="flex min-h-screen bg-[#0a0c10] text-slate-100 font-sans select-none antialiased">
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
                <span className="truncate">Creator Interviews</span>
              </div>
            </div>
          </div>

          {/* 1-on-1 Studio Badge */}
          <div className="rounded-xl border border-[#202534] bg-[#161822] px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span className="text-xs font-semibold text-slate-200">1 Host • 1 Guest</span>
            </div>
            <span className="text-[10px] font-mono text-purple-300 uppercase">Isolated REC</span>
          </div>

          {/* Primary "+ New Interview" Action */}
          <button
            type="button"
            onClick={() => {
              setCreatedInviteUrl(null);
              setShowCreateModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 text-xs font-bold shadow-lg shadow-purple-950/40 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.8]" />
            <span>New Interview</span>
          </button>

          {/* Navigation Items (The 4 Core Riverside Views) */}
          <nav className="space-y-1">
            {/* 1. Dashboard */}
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-[#1d212d] text-white border border-[#2b3244] shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#161922]"
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className={`h-4 w-4 ${activeTab === "dashboard" ? "text-purple-400" : "text-slate-400"}`} />
                <span>Dashboard</span>
              </div>
            </button>

            {/* 2. Interviews */}
            <button
              type="button"
              onClick={() => setActiveTab("interviews")}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "interviews"
                  ? "bg-[#1d212d] text-white border border-[#2b3244] shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#161922]"
              }`}
            >
              <div className="flex items-center gap-3">
                <Radio className={`h-4 w-4 ${activeTab === "interviews" ? "text-purple-400" : "text-slate-400"}`} />
                <span>Interviews</span>
              </div>
              {interviews.length > 0 && (
                <span className="rounded-full bg-[#202533] px-2 py-0.5 text-[10px] font-mono font-medium text-slate-300">
                  {interviews.length}
                </span>
              )}
            </button>

            {/* 3. Recordings */}
            <button
              type="button"
              onClick={() => setActiveTab("recordings")}
              className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "recordings"
                  ? "bg-[#1d212d] text-white border border-[#2b3244] shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#161922]"
              }`}
            >
              <div className="flex items-center gap-3">
                <FileVideo className={`h-4 w-4 ${activeTab === "recordings" ? "text-purple-400" : "text-slate-400"}`} />
                <span>Recordings</span>
              </div>
              {Object.keys(recordingsByRoom).length > 0 && (
                <span className="rounded-full bg-[#202533] px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-400">
                  {Object.keys(recordingsByRoom).length}
                </span>
              )}
            </button>

            {/* 4. Settings */}
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
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer: Production Engine Status */}
        <div className="rounded-xl border border-[#1e2330] bg-[#14161f] p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-slate-200">Recording Engine</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold">READY</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            4-stem lossless isolated track capture enabled
          </p>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0c10]">
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
              {activeTab === "dashboard"
                ? "Dashboard Overview"
                : activeTab === "interviews"
                ? "Interviews & Studio Rooms"
                : activeTab === "recordings"
                ? "Recording Library & Stems"
                : "Hardware & Studio Settings"}
            </span>
          </div>

          {/* Top Bar Actions */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setCreatedInviteUrl(null);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 text-xs font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.8]" />
              <span>New Interview</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-[#1e2230] bg-[#11131a] p-3 space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab("dashboard");
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-[#1a1d27]"
            >
              <LayoutDashboard className="h-4 w-4 text-purple-400" />
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("interviews");
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-[#1a1d27]"
            >
              <div className="flex items-center gap-2.5">
                <Radio className="h-4 w-4 text-purple-400" />
                <span>Interviews</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{interviews.length}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("recordings");
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-[#1a1d27]"
            >
              <div className="flex items-center gap-2.5">
                <FileVideo className="h-4 w-4 text-emerald-400" />
                <span>Recordings</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{Object.keys(recordingsByRoom).length}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("settings");
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-[#1a1d27]"
            >
              <Sliders className="h-4 w-4 text-slate-400" />
              <span>Settings</span>
            </button>
          </div>
        )}

        {/* Main Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-6xl w-full mx-auto">
          {/* ========================================================= */}
          {/* TAB 1: DASHBOARD (Overview & High-Level Studio Metrics)   */}
          {/* ========================================================= */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* Studio Welcome & Summary Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-[#202534] bg-gradient-to-r from-[#141724] via-[#11131c] to-[#0e1017] p-6 shadow-xl">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                      Creator Interview Studio
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Welcome to OneGuest Studio
                  </h2>
                  <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                    A dedicated remote recording platform for 1-on-1 creator interviews. Capture pristine, isolated host & guest audio and video tracks ready for post-production editing.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedInviteUrl(null);
                      setShowCreateModal(true);
                    }}
                    className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 text-xs font-bold shadow-lg shadow-purple-950/40 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Plus className="h-4 w-4 stroke-[2.8]" />
                    <span>Create Interview</span>
                  </button>
                </div>
              </div>

              {/* 4 Summary Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-[#202534] bg-[#12141d] p-4.5 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Interviews</span>
                    <Radio className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-extrabold text-white">{interviews.length}</div>
                  <p className="text-[11px] text-slate-400">Scheduled & completed sessions</p>
                </div>

                <div className="rounded-2xl border border-[#202534] bg-[#12141d] p-4.5 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Recorded Sessions</span>
                    <FileVideo className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-extrabold text-white">{Object.keys(recordingsByRoom).length}</div>
                  <p className="text-[11px] text-slate-400">Stored in recording manifest</p>
                </div>

                <div className="rounded-2xl border border-[#202534] bg-[#12141d] p-4.5 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Isolated Stems</span>
                    <Layers className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-extrabold text-white">{totalRecordedStems}</div>
                  <p className="text-[11px] text-slate-400">Host & Guest separate files</p>
                </div>

                <div className="rounded-2xl border border-[#202534] bg-[#12141d] p-4.5 space-y-2 shadow-lg">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Engine Status</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="text-base font-extrabold text-emerald-400">100% Ready</div>
                  <p className="text-[11px] text-slate-400">Lossless 4-stem recording</p>
                </div>
              </div>

              {/* Riverside Launch Deck (Host + Guest) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Instant Host Studio Session Card */}
                <div className="rounded-2xl border border-[#202534] bg-gradient-to-b from-[#141722] to-[#0f1118] p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1f2433] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                        <Mic className="h-5 w-5 stroke-[2.2]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-wide">Instant Studio Room</h3>
                        <p className="text-xs text-slate-400">Launch studio now & invite 1 guest</p>
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
                        placeholder="e.g. Creator Host"
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
                          {copiedQuickLink ? (
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
                        <span>Green Room Experience</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Test your camera, microphone, and lighting before joining the live studio broadcast.
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

              {/* Recent Interviews Snapshot on Dashboard */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-purple-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Recent Interviews & Quick Status
                    </h3>
                  </div>
                  {interviews.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("interviews")}
                      className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>View all ({interviews.length})</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {interviews.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#232736] bg-[#12141c]/50 p-8 text-center text-xs text-slate-400 space-y-2">
                    <p className="font-semibold text-slate-200">No interviews created yet</p>
                    <p className="text-[11px] text-slate-400">
                      Click &quot;New Interview&quot; above to create a private studio room and generate guest invitation links.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {interviews.slice(0, 3).map((interview) => {
                      const sessionRec = recordingsByRoom[interview.id];
                      const hasRecordings = sessionRec && sessionRec.tracks.length > 0;

                      return (
                        <div
                          key={interview.id}
                          className="rounded-2xl border border-[#202534] bg-[#141721] p-4.5 space-y-3 shadow-xl hover:border-[#2e3549] transition-all flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                                {interview.id}
                              </span>
                              {hasRecordings ? (
                                <button
                                  type="button"
                                  onClick={() => setActiveTab("recordings")}
                                  className="rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-300 flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="h-2.5 w-2.5" />
                                  <span>{sessionRec.tracks.length} Stems Ready</span>
                                </button>
                              ) : (
                                <span className="text-[9px] uppercase font-bold text-slate-300 bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded-md">
                                  {interview.status || "Ready"}
                                </span>
                              )}
                            </div>

                            <h4 className="text-xs font-bold text-white line-clamp-1">{interview.title}</h4>
                            <p className="text-[11px] text-slate-400">
                              Host: <span className="text-slate-300 font-semibold">{interview.hostName}</span> • Guest:{" "}
                              <span className="text-slate-300 font-semibold">{interview.guestName || "Guest"}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-[#1c202d]">
                            <button
                              type="button"
                              onClick={() => {
                                const params = new URLSearchParams({
                                  role: "host",
                                  name: interview.hostName || "Creator Host",
                                  title: interview.title,
                                });
                                router.push(`/room/${encodeURIComponent(interview.id)}?${params.toString()}`);
                              }}
                              className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold py-2 text-center transition-colors cursor-pointer shadow-md shadow-purple-950/40"
                            >
                              Enter Studio
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopySessionLink(interview)}
                              className="rounded-xl border border-[#2b3144] bg-[#1a1e2b] p-2 text-slate-300 hover:text-white cursor-pointer transition-colors"
                              title="Copy Guest Invite Link"
                            >
                              {copiedSessionId === interview.id ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: INTERVIEWS (Dedicated Interview Management)        */}
          {/* ========================================================= */}
          {activeTab === "interviews" && (
            <div className="space-y-6">
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#202534] bg-[#141721] p-5 shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      Creator Interview Sessions
                    </h3>
                    <span className="rounded-full bg-[#1e2330] px-2 py-0.5 text-[10px] font-mono font-medium text-purple-300">
                      {interviews.length} Total
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Create, manage, and reopen 1-on-1 remote recording sessions with secure guest invitation links.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedInviteUrl(null);
                      setShowCreateModal(true);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 text-xs font-bold shadow-md shadow-purple-950/40 transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[2.8]" />
                    <span>Create Interview</span>
                  </button>
                  <button
                    type="button"
                    onClick={loadData}
                    title="Refresh interviews"
                    className="rounded-xl border border-[#282d3d] bg-[#1a1e2b] p-2 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoadingData ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Status Filters & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Status Filter Buttons */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl border border-[#202534] bg-[#12141c]">
                  {(["all", "scheduled", "active", "completed"] as StatusFilter[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setStatusFilter(tab)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer ${
                        statusFilter === tab
                          ? "bg-purple-600 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {tab === "all" ? "All Interviews" : tab}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search interviews..."
                    className="rounded-xl border border-[#232736] bg-[#12141c] pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none transition-colors w-full sm:w-64"
                  />
                </div>
              </div>

              {/* Empty State */}
              {filteredInterviews.length === 0 && !isLoadingData && (
                <div className="rounded-2xl border border-dashed border-[#232736] bg-[#12141c]/50 p-12 text-center text-xs text-slate-400 space-y-3">
                  <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Calendar className="h-6 w-6 stroke-[1.8]" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200 text-sm">
                      {searchQuery || statusFilter !== "all"
                        ? "No interviews match your filter"
                        : "No interviews created yet"}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                      Click &quot;Create Interview&quot; above to schedule an interview with unique guest invite links and separate track recording.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedInviteUrl(null);
                      setShowCreateModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[2.8]" />
                    <span>Create Interview</span>
                  </button>
                </div>
              )}

              {/* Interview Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInterviews.map((interview) => {
                  const sessionRec = recordingsByRoom[interview.id];
                  const hasRecordings = sessionRec && sessionRec.tracks.length > 0;

                  return (
                    <div
                      key={interview.id}
                      className="rounded-2xl border border-[#202534] bg-[#141721] overflow-hidden hover:border-[#2e3549] transition-all flex flex-col justify-between shadow-xl group"
                    >
                      {/* Video Thumbnail Header */}
                      <div className="relative h-28 w-full bg-gradient-to-tr from-[#161925] via-[#1a1d2d] to-[#0f1118] border-b border-[#1c202d] flex items-center justify-between p-3.5 overflow-hidden">
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-purple-600/10 rounded-full blur-xl pointer-events-none" />

                        {/* Top room badge & status */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                          <span className="font-mono text-[9px] font-bold text-purple-300 bg-black/60 border border-purple-500/30 px-2 py-0.5 rounded-md backdrop-blur-sm">
                            {interview.id}
                          </span>
                          {hasRecordings ? (
                            <button
                              type="button"
                              onClick={() => setActiveTab("recordings")}
                              className="rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-300 flex items-center gap-1 backdrop-blur-sm hover:bg-emerald-500/30 transition-colors cursor-pointer"
                              title="Click to view recorded tracks in library"
                            >
                              <Check className="h-2.5 w-2.5" />
                              <span>{sessionRec.tracks.length} Stems Ready</span>
                            </button>
                          ) : (
                            <span className="text-[9px] uppercase font-bold text-slate-300 bg-black/60 border border-slate-700 px-2 py-0.5 rounded-md backdrop-blur-sm">
                              {interview.status || "Ready"}
                            </span>
                          )}
                        </div>

                        {/* Visual dual avatars for 1 Host + 1 Guest */}
                        <div className="flex items-center gap-2 mt-4">
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white font-bold text-xs shadow-md ring-2 ring-[#141721]"
                            title={`Host: ${interview.hostName}`}
                          >
                            {interview.hostName[0]?.toUpperCase() || "H"}
                          </div>
                          <span className="text-slate-500 text-xs font-bold">+</span>
                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 text-white font-bold text-xs shadow-md ring-2 ring-[#141721]"
                            title={`Guest: ${interview.guestName || "Guest"}`}
                          >
                            {(interview.guestName || "G")[0]?.toUpperCase() || "G"}
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
                            {interview.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                            Host: <strong className="text-slate-300">{interview.hostName}</strong> • Guest:{" "}
                            <strong className="text-slate-300">{interview.guestName || "Any Guest"}</strong>
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="pt-2 border-t border-[#1c202d] flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const params = new URLSearchParams({
                                role: "host",
                                name: interview.hostName || "Creator Host",
                                title: interview.title,
                              });
                              router.push(`/room/${encodeURIComponent(interview.id)}?${params.toString()}`);
                            }}
                            className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold py-2 text-center transition-colors cursor-pointer shadow-md shadow-purple-950/40"
                          >
                            Enter Studio
                          </button>

                          {hasRecordings && (
                            <button
                              type="button"
                              onClick={() => setActiveTab("recordings")}
                              className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-2 text-emerald-300 hover:text-emerald-200 cursor-pointer transition-colors"
                              title="View recordings in library"
                            >
                              <FileVideo className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCopySessionLink(interview)}
                            className="rounded-xl border border-[#2b3144] bg-[#1a1e2b] p-2 text-slate-300 hover:text-white cursor-pointer transition-colors"
                            title="Copy Private Guest Invite Link"
                          >
                            {copiedSessionId === interview.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteInterview(interview.id)}
                            className="rounded-xl border border-[#2b3144] bg-[#1a1e2b] p-2 text-slate-400 hover:text-rose-400 cursor-pointer transition-colors"
                            title="Delete Interview"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: RECORDINGS LIBRARY (Pristine Separate Stems)       */}
          {/* ========================================================= */}
          {activeTab === "recordings" && (
            <div className="space-y-6">
              <RecordingsLibrary onStartSession={() => setActiveTab("interviews")} />
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: SETTINGS & HARDWARE DIAGNOSTICS                    */}
          {/* ========================================================= */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-3xl">
              {/* Hardware Diagnostics Card */}
              <div className="rounded-2xl border border-[#202534] bg-[#141721] p-6 space-y-4 shadow-xl">
                <div className="flex items-center gap-3 border-b border-[#1f2433] pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Audio & Video Hardware Diagnostics</h3>
                    <p className="text-xs text-slate-400">
                      Verify your local camera feed, microphone VU level, audio devices, and selfie video enhancer
                    </p>
                  </div>
                </div>

                <PreflightMediaTest />
              </div>

              {/* Studio Recording Architecture Card */}
              <div className="rounded-2xl border border-[#202534] bg-[#141721] p-6 space-y-4 shadow-xl">
                <div className="flex items-center gap-3 border-b border-[#1f2433] pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Multi-Track Recording Architecture</h3>
                    <p className="text-xs text-slate-400">
                      Riverside-inspired 4-stem separate recording pipeline
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-[#232736] bg-[#0c0d14] p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <span className="h-2 w-2 rounded-full bg-purple-500" />
                      <span>Host Video Stem</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Captured directly from local camera stream at pristine resolution (1080p WebM/VP9).
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#232736] bg-[#0c0d14] p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <span className="h-2 w-2 rounded-full bg-purple-400" />
                      <span>Host Audio Stem</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Clean isolated microphone capture. Zero cross-talk or background bleed from the guest.
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#232736] bg-[#0c0d14] p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <span className="h-2 w-2 rounded-full bg-cyan-500" />
                      <span>Guest Video Stem</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Captured losslessly from remote guest track publication without downscaling.
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#232736] bg-[#0c0d14] p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" />
                      <span>Guest Audio Stem</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Dedicated guest voice track (48kHz Opus) ready for Adobe Premiere or DaVinci Resolve.
                    </p>
                  </div>
                </div>
              </div>

              {/* Storage & Deployment Configuration */}
              <div className="rounded-2xl border border-[#202534] bg-[#141721] p-6 space-y-4 shadow-xl">
                <div className="flex items-center gap-3 border-b border-[#1f2433] pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <HardDrive className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Persistent Recording Storage</h3>
                    <p className="text-xs text-slate-400">
                      Render & Cloud deployment disk configuration
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3.5 space-y-1 text-amber-200">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                      <span>Notice for Render.com / Ephemeral Cloud Deployments</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-300/90">
                      Render&apos;s free web services use ephemeral disks that reset upon every redeploy. By default, OneGuest Studio stores recordings in <code className="font-mono text-purple-300">data/recordings</code>. For persistent production, attach a Persistent Disk on Render (e.g. at <code className="font-mono text-purple-300">/var/data/recordings</code>) and set the environment variable:
                    </p>
                    <div className="rounded-lg bg-black/60 p-2 font-mono text-[11px] text-emerald-300 mt-1.5">
                      RECORDINGS_STORAGE_PATH=/var/data/recordings
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#232736] bg-[#0c0d14] p-3.5 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <Lock className="h-4 w-4 text-purple-400" />
                      <span>Guest Privacy & Security</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Guest links do not expose sensitive LiveKit API keys. Secure short-lived WebRTC tokens are minted on-demand server-side using your protected <code className="font-mono text-slate-300">LIVEKIT_API_SECRET</code>. Guests never need to register an account or provide payment credentials.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* CREATE INTERVIEW MODAL */}
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
                  Create Creator Interview
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

            {modalError && (
              <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300 font-medium">
                {modalError}
              </div>
            )}

            {createdInviteUrl ? (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <Check className="h-4 w-4" />
                  <span>Interview Session Created!</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Share this private guest link. The guest can join directly without creating an account:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdInviteUrl}
                    className="flex-1 rounded-xl border border-emerald-800 bg-[#0a0c10] px-3 py-2 text-xs text-emerald-300 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdInviteUrl);
                      alert("Guest invite link copied to clipboard!");
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
                  className="w-full mt-2 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs text-slate-200 font-semibold cursor-pointer transition-colors"
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
                    placeholder="e.g. Episode 12: Building with AI"
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
                      className="w-full rounded-xl border border-[#282d3d] bg-[#0c0e14] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
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
                      className="w-full rounded-xl border border-[#282d3d] bg-[#0c0e14] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
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
                    placeholder="Leave blank for automatic secure room"
                    className="w-full rounded-xl border border-[#282d3d] bg-[#0c0e14] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none font-mono"
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
                    className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{isCreatingSession ? "Creating..." : "Create Interview"}</span>
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
