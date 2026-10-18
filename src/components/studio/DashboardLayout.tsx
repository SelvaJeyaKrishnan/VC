"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
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
  ChevronRight,
  Menu,
  X,
  Calendar,
  Trash2,
  RefreshCw,
  Search,
  AlertCircle,
  HardDrive,
  Lock,
  Layers,
  Sparkles,
  ExternalLink,
  Scissors,
  Download,
  Tv,
  Smartphone,
  Play,
  Subtitles,
  FileText,
  LogIn,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { generateRoomId } from "@/lib/utils";
import { PreflightMediaTest } from "./PreflightMediaTest";
import { RecordingsLibrary } from "./RecordingsLibrary";
import type { Interview } from "@/types/studio";
import type { RecordingSession } from "@/lib/recordingStore";

export type DashboardTab = "dashboard" | "interviews" | "recordings" | "editor" | "streaming" | "settings";

type StatusFilter = "all" | "scheduled" | "active" | "completed";

export function DashboardLayout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: authStatus } = useSession();
  const [authConfiguration, setAuthConfiguration] = useState<
    | { status: "loading" }
    | { status: "configured" }
    | { status: "missing"; variables: string[] }
    | { status: "error"; message: string }
  >({ status: "loading" });

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
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Quick guest join state
  const [guestCode, setGuestCode] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPasscode, setGuestPasscode] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);

  // Create Interview Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalGuestName, setModalGuestName] = useState("");
  const [modalPasscode, setModalPasscode] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [createdGuestPasscode, setCreatedGuestPasscode] = useState<string | null>(null);
  const [copiedModalLink, setCopiedModalLink] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Data cache
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [recordingsByRoom, setRecordingsByRoom] = useState<Record<string, RecordingSession>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let active = true;

    fetch("/api/auth/configuration", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Configuration check failed (${response.status}).`);
        }

        const data = (await response.json()) as { configured?: boolean; missing?: string[] };
        if (typeof data.configured !== "boolean" || !Array.isArray(data.missing)) {
          throw new Error("Configuration check returned an invalid response.");
        }

        if (active) {
          setAuthConfiguration(
            data.configured
              ? { status: "configured" }
              : { status: "missing", variables: data.missing }
          );
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to check Google sign-in configuration:", error);
        if (active) {
          setAuthConfiguration({
            status: "error",
            message: error instanceof Error ? error.message : "Unknown configuration error.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setRoomId(generateRoomId("og"));
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // Dashboard tab selection
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "dashboard") {
      setActiveTab("dashboard");
    } else if (tabParam === "recordings") {
      setActiveTab("recordings");
    } else if (tabParam === "editor") {
      setActiveTab("editor");
    } else if (tabParam === "streaming" || tabParam === "stream") {
      setActiveTab("streaming");
    } else if (tabParam === "settings") {
      setActiveTab("settings");
    } else if (tabParam === "interviews" || tabParam === "overview" || tabParam === "sessions") {
      setActiveTab("interviews");
    }
  }, [searchParams]);

  const loadData = useCallback(async () => {
    if (authStatus !== "authenticated") {
      setIsLoadingData(authStatus === "loading");
      return;
    }

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
  }, [authStatus]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      loadData();
    }
  }, [loadData]);

  const buildGuestLink = (inviteToken: string, guest?: string) => {
    const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
    const guestParam = guest ? `?name=${encodeURIComponent(guest)}` : "";
    return `${base}/join/${encodeURIComponent(inviteToken)}${guestParam}`;
  };

  const handleCopyHostInvite = async () => {
    let interview = interviews.find((item) => item.id === roomId);
    if (!interview) {
      try {
        const response = await fetch("/api/interviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: roomId,
            title: sessionTitle.trim() || `Studio Interview - ${roomId}`,
            hostName: hostName.trim() || "Creator Host",
            guestName: "Guest",
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create studio invitation.");
        const createdInterview = data.interview as Interview;
        interview = createdInterview;
        setInterviews((current) => [createdInterview, ...current]);
      } catch (error) {
        setLaunchError(error instanceof Error ? error.message : "Failed to create studio invitation.");
        return;
      }
    }
    const inviteUrl = buildGuestLink(interview.inviteToken, interview.guestName);
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedQuickLink(true);
      setTimeout(() => setCopiedQuickLink(false), 2500);
    } catch {
      prompt("Copy Guest Invite Link:", inviteUrl);
    }
  };

  const handleCopySessionLink = async (interview: Interview) => {
    const inviteUrl = buildGuestLink(interview.inviteToken, interview.guestName);
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
    setLaunchError(null);
    try {
      const response = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: roomId.trim(),
          title: sessionTitle.trim() || `Studio Interview - ${roomId}`,
          hostName: hostName.trim(),
          guestName: "Guest",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create studio session.");
      }

      router.push(`/studio/${encodeURIComponent(data.interview.id)}`);
    } catch (err: unknown) {
      setLaunchError(err instanceof Error ? err.message : "Failed to create studio session.");
    } finally {
      setIsLaunching(false);
    }
  };

  const handleJoinGuest = (e: React.FormEvent) => {
    e.preventDefault();
    setGuestError(null);

    let cleanCode = guestCode.trim();
    if (!cleanCode) {
      setGuestError("Please enter a studio room code or invite URL.");
      return;
    }

    try {
      if (cleanCode.startsWith("http://") || cleanCode.startsWith("https://")) {
        const url = new URL(cleanCode);
        const segments = url.pathname.split("/").filter(Boolean);
        cleanCode = segments[0] === "join" && segments[1] ? segments[1] : "";
      }
    } catch {
      if (!/^[A-Za-z0-9_-]{40,}$/.test(cleanCode)) cleanCode = "";
    }

    if (!cleanCode) {
      setGuestError("That is not a secure invitation link. Ask the host to send you a valid link.");
      return;
    }

    const name = guestName.trim() || "Guest Participant";
    const params = new URLSearchParams({
      name,
    });
    if (guestPasscode.trim()) {
      window.sessionStorage.setItem(`oneguest:invite:${cleanCode}`, guestPasscode.trim());
    }
    router.push(`/join/${encodeURIComponent(cleanCode)}?${params.toString()}`);
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
        throw new Error(data.error || "Failed to create studio session");
      }
      setCreatedInviteUrl(data.inviteUrl);
      setCreatedGuestPasscode(data.guestPasscode || null);
      setModalTitle("");
      setModalGuestName("");
      setModalPasscode("");
      await loadData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Error creating session");
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleDeleteInterview = async (id: string) => {
    if (!confirm("Are you sure you want to delete this studio session?")) return;
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

  if (authConfiguration.status === "loading" || (authStatus === "loading" && authConfiguration.status === "configured")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0b0e] text-sm text-[#8c94a4]">
        Checking sign-in setup…
      </div>
    );
  }

  if (!session?.user?.email) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0b0e] p-5 text-[#f3f4f6]">
        <section className="w-full max-w-md rounded-2xl border border-[#242a36] bg-[#13161c] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#c0915a] text-[#0a0b0e]">
            <Radio className="h-6 w-6" />
          </div>
          <h1 className="font-heading text-xl font-bold text-white">OneGuest Studio</h1>
          <p className="mt-2 text-sm text-[#9ca3af]">Sign in with Google to manage your studios and recordings.</p>
          {authConfiguration.status === "configured" ? (
            <button
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-[#c0915a] px-5 py-3 text-sm font-bold text-[#0a0b0e] transition-colors hover:bg-[#cf9f67]"
              onClick={() => signIn("google", { callbackUrl: "/" })}
              type="button"
            >
              <LogIn className="h-4 w-4" />
              Sign in with Google
            </button>
          ) : (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-left text-xs leading-relaxed text-amber-100"
            >
              {authConfiguration.status === "missing"
                ? `Google sign-in is unavailable. Configure: ${authConfiguration.variables.join(", ")}.`
                : authConfiguration.status === "error"
                  ? `Unable to verify sign-in configuration: ${authConfiguration.message}`
                  : "Checking Google sign-in configuration…"}
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a0b0e] text-[#f3f4f6] font-sans antialiased">
      {/* 1. RIVERSIDE-STYLE SIDEBAR (Desktop) */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-[#1a1e26] bg-[#0f1115] p-4 shrink-0 justify-between select-none">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#c0915a] text-[#0a0b0e] font-bold shadow-md shadow-[#c0915a]/20">
              <Radio className="h-4.5 w-4.5 stroke-[2.4]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-bold text-white text-base tracking-tight">OneGuest</span>
                <span className="rounded bg-[#c0915a]/15 border border-[#c0915a]/30 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-[#cf9f67]">
                  Studio
                </span>
              </div>
              <p className="text-[11px] text-[#8c94a4] font-medium truncate">Remote Recording Studio</p>
            </div>
          </div>

          {/* Primary "+ New Studio" Action */}
          <button
            type="button"
            onClick={() => {
              setCreatedInviteUrl(null);
              setCreatedGuestPasscode(null);
              setCopiedModalLink(false);
              setShowCreateModal(true);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] text-[#0a0b0e] px-4 py-2.5 text-xs font-bold transition-all active:scale-[0.98] shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.6]" />
            <span>New Studio Session</span>
          </button>

          {/* Navigation Items */}
          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-[#181c24] text-white font-semibold border-l-2 border-[#c0915a]"
                  : "text-[#9ca3af] hover:text-white hover:bg-[#14171d]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className={`h-4 w-4 ${activeTab === "dashboard" ? "text-[#c0915a]" : "text-[#8c94a4]"}`} />
                <span>Dashboard</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("interviews")}
              className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "interviews"
                  ? "bg-[#181c24] text-white font-semibold border-l-2 border-[#c0915a]"
                  : "text-[#9ca3af] hover:text-white hover:bg-[#14171d]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Radio className={`h-4 w-4 ${activeTab === "interviews" ? "text-[#c0915a]" : "text-[#8c94a4]"}`} />
                <span>Studios</span>
              </div>
              {interviews.length > 0 && (
                <span className="rounded bg-[#1a1e26] px-1.5 py-0.5 text-[10px] font-mono text-[#9ca3af]">
                  {interviews.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("recordings")}
              className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "recordings"
                  ? "bg-[#181c24] text-white font-semibold border-l-2 border-[#c0915a]"
                  : "text-[#9ca3af] hover:text-white hover:bg-[#14171d]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileVideo className={`h-4 w-4 ${activeTab === "recordings" ? "text-[#c0915a]" : "text-[#8c94a4]"}`} />
                <span>Recordings</span>
              </div>
              {Object.keys(recordingsByRoom).length > 0 && (
                <span className="rounded bg-[#10b981]/15 border border-[#10b981]/30 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[#10b981]">
                  {Object.keys(recordingsByRoom).length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("editor")}
              className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "editor"
                  ? "bg-[#181c24] text-white font-semibold border-l-2 border-[#c0915a]"
                  : "text-[#9ca3af] hover:text-white hover:bg-[#14171d]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className={`h-4 w-4 ${activeTab === "editor" ? "text-[#c0915a]" : "text-[#8c94a4]"}`} />
                <span>Editor & Clips</span>
              </div>
              <span className="rounded bg-[#c0915a]/15 border border-[#c0915a]/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#cf9f67]">
                AI
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("streaming")}
              className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "streaming"
                  ? "bg-[#181c24] text-white font-semibold border-l-2 border-[#c0915a]"
                  : "text-[#9ca3af] hover:text-white hover:bg-[#14171d]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Radio className={`h-4 w-4 ${activeTab === "streaming" ? "text-rose-400" : "text-[#8c94a4]"}`} />
                <span>Live Streaming</span>
              </div>
              <span className="rounded bg-rose-950/60 border border-rose-500/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-300">
                RTMP
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                activeTab === "settings"
                  ? "bg-[#181c24] text-white font-semibold border-l-2 border-[#c0915a]"
                  : "text-[#9ca3af] hover:text-white hover:bg-[#14171d]"
              }`}
            >
              <Sliders className={`h-4 w-4 ${activeTab === "settings" ? "text-[#c0915a]" : "text-[#8c94a4]"}`} />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* User / Studio Profile Widget */}
        <div className="border-t border-[#1a1e26] pt-3.5">
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[#14171d] transition-colors">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1e2430] border border-[#2a313e] font-bold text-xs text-[#c0915a]">
              H
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{hostName || "Host Creator"}</p>
              <p className="text-[10px] text-[#8c94a4] truncate">Primary Host Account</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0b0e]">
        {/* Top Header */}
        <header className="h-14 border-b border-[#1a1e26] bg-[#0f1115]/95 px-4 sm:px-8 flex items-center justify-between shrink-0 backdrop-blur-md sticky top-0 z-30 select-none">
          {/* Mobile hamburger & brand */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="p-1.5 rounded-md border border-[#242a36] bg-[#14171d] text-[#d1d5db]"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-[#c0915a] text-[#0a0b0e] font-bold text-xs">
                <Radio className="h-3.5 w-3.5" />
              </div>
              <span className="font-heading font-bold text-white text-sm">OneGuest Studio</span>
            </div>
          </div>

          {/* Desktop Breadcrumbs */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-[#8c94a4]">
            <span className="text-[#6b7280] font-medium">OneGuest Studio</span>
            <ChevronRight className="h-3 w-3 text-[#4b5563]" />
            <span className="font-semibold text-[#e5e7eb] capitalize">
              {activeTab === "dashboard"
                ? "Studio Overview"
                : activeTab === "interviews"
                ? "Studio Sessions"
                : activeTab === "recordings"
                ? "Recording Library"
                : activeTab === "editor"
                ? "Studio Editor"
                : activeTab === "streaming"
                ? "RTMP Live Streaming Hub"
                : "Studio Hardware & Preferences"}
            </span>
          </div>

          {/* Top Bar Actions */}
          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline max-w-48 truncate text-xs text-[#8c94a4]">
              {session.user.email}
            </span>
            <button
              aria-label="Sign out"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#242a36] bg-[#14171d] px-3 py-2 text-xs font-semibold text-[#9ca3af] transition-colors hover:text-white"
              onClick={() => signOut({ callbackUrl: "/" })}
              type="button"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatedInviteUrl(null);
                setCreatedGuestPasscode(null);
                setCopiedModalLink(false);
                setShowCreateModal(true);
              }}
              className="lg:hidden flex items-center gap-1.5 rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] text-[#0a0b0e] px-3 py-1.5 text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.6]" />
              <span>New Studio</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-[#1a1e26] bg-[#0f1115] p-3 space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab("dashboard");
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#d1d5db] hover:bg-[#14171d]"
            >
              <LayoutDashboard className="h-4 w-4 text-[#c0915a]" />
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("interviews");
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-[#d1d5db] hover:bg-[#14171d]"
            >
              <div className="flex items-center gap-2.5">
                <Radio className="h-4 w-4 text-[#c0915a]" />
                <span>Studios</span>
              </div>
              <span className="text-[10px] font-mono text-[#8c94a4]">{interviews.length}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("recordings");
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-[#d1d5db] hover:bg-[#14171d]"
            >
              <div className="flex items-center gap-2.5">
                <FileVideo className="h-4 w-4 text-[#10b981]" />
                <span>Recordings</span>
              </div>
              <span className="text-[10px] font-mono text-[#8c94a4]">{Object.keys(recordingsByRoom).length}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("editor");
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-[#d1d5db] hover:bg-[#14171d]"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-[#cf9f67]" />
                <span>Editor & Clips</span>
              </div>
              <span className="text-[10px] font-mono text-[#cf9f67] font-bold">AI</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("streaming");
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-[#d1d5db] hover:bg-[#14171d]"
            >
              <div className="flex items-center gap-2.5">
                <Radio className="h-4 w-4 text-rose-400" />
                <span>Live Streaming</span>
              </div>
              <span className="text-[10px] font-mono text-rose-300 font-bold">RTMP</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("settings");
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#d1d5db] hover:bg-[#14171d]"
            >
              <Sliders className="h-4 w-4 text-[#8c94a4]" />
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
              {/* Studio Overview Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1a1e26]">
                <div>
                  <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Studio Overview
                  </h2>
                  <p className="text-xs text-[#8c94a4] mt-0.5">
                    1-on-1 remote recording studio with isolated local audio & video tracks.
                  </p>
                </div>
              </div>

              {/* 3 High-Impact Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-[#1f242e] bg-[#13161c] p-4.5 space-y-2">
                  <div className="flex items-center justify-between text-[#8c94a4]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Total Studios</span>
                    <Radio className="h-4 w-4 text-[#c0915a]" />
                  </div>
                  <div className="font-heading text-2xl font-bold text-white">{interviews.length}</div>
                  <p className="text-[11px] text-[#8c94a4]">Configured studio rooms</p>
                </div>

                <div className="rounded-xl border border-[#1f242e] bg-[#13161c] p-4.5 space-y-2">
                  <div className="flex items-center justify-between text-[#8c94a4]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Recorded Takes</span>
                    <FileVideo className="h-4 w-4 text-[#10b981]" />
                  </div>
                  <div className="font-heading text-2xl font-bold text-white">{Object.keys(recordingsByRoom).length}</div>
                  <p className="text-[11px] text-[#8c94a4]">Sessions ready in library</p>
                </div>

                <div className="rounded-xl border border-[#1f242e] bg-[#13161c] p-4.5 space-y-2">
                  <div className="flex items-center justify-between text-[#8c94a4]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">Isolated Stems</span>
                    <Layers className="h-4 w-4 text-[#4c6a92]" />
                  </div>
                  <div className="font-heading text-2xl font-bold text-white">{totalRecordedStems}</div>
                  <p className="text-[11px] text-[#8c94a4]">Separate host & guest files</p>
                </div>
              </div>

              {/* Riverside Launch Deck (Host + Guest) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Instant Host Studio Session Card */}
                <div className="rounded-xl border border-[#1f242e] bg-[#13161c] p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#1a1e26] pb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#c0915a]/15 text-[#c0915a] border border-[#c0915a]/30">
                        <Mic className="h-4.5 w-4.5 stroke-[2.2]" />
                      </div>
                      <div>
                        <h3 className="font-heading text-sm font-bold text-white">Instant Studio Room</h3>
                        <p className="text-xs text-[#8c94a4]">Launch recording studio & invite guest</p>
                      </div>
                    </div>
                    <span className="rounded bg-[#c0915a]/15 border border-[#c0915a]/30 px-2 py-0.5 text-[10px] font-bold text-[#cf9f67] uppercase tracking-wider">
                      Host
                    </span>
                  </div>

                  <form onSubmit={handleLaunchQuickStudio} className="space-y-3.5 pt-1">
                    {launchError && (
                      <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-2.5 text-xs text-rose-300">
                        {launchError}
                      </div>
                    )}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9ca3af] mb-1">
                        Host Name
                      </label>
                      <input
                        type="text"
                        required
                        value={hostName}
                        onChange={(e) => setHostName(e.target.value)}
                        placeholder="e.g. Creator Host"
                        className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3 py-2 text-xs text-white placeholder-[#6b7280] focus:border-[#c0915a] focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9ca3af] mb-1">
                        Studio Session Title
                      </label>
                      <input
                        type="text"
                        value={sessionTitle}
                        onChange={(e) => setSessionTitle(e.target.value)}
                        placeholder="e.g. Episode 10: Building with AI"
                        className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3 py-2 text-xs text-white placeholder-[#6b7280] focus:border-[#c0915a] focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Room code & copy */}
                    <div className="rounded-lg border border-[#1a1e26] bg-[#0a0b0e] p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-[#8c94a4]">Studio Room ID</span>
                        <button
                          type="button"
                          onClick={() => setRoomId(generateRoomId("og"))}
                          className="text-[10px] text-[#c0915a] hover:text-[#cf9f67] font-semibold cursor-pointer"
                        >
                          Generate New
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={roomId}
                          className="flex-1 font-mono text-xs font-semibold text-[#cf9f67] bg-transparent focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleCopyHostInvite}
                          className="flex items-center gap-1.5 rounded border border-[#242a36] bg-[#14171d] px-2.5 py-1 text-xs text-[#d1d5db] hover:text-white cursor-pointer transition-colors"
                        >
                          {copiedQuickLink ? (
                            <>
                              <Check className="h-3 w-3 text-[#10b981]" />
                              <span className="text-[#10b981] text-[11px]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 text-[#8c94a4]" />
                              <span className="text-[11px]">Copy Invite</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLaunching}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] text-[#0a0b0e] px-4 py-2.5 text-xs font-bold transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
                    >
                      {isLaunching ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#0a0b0e] border-t-transparent" />
                          <span>Preparing Studio Lobby...</span>
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
                <div className="rounded-xl border border-[#1f242e] bg-[#13161c] p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#1a1e26] pb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4c6a92]/15 text-[#4c6a92] border border-[#4c6a92]/30">
                        <Video className="h-4.5 w-4.5 stroke-[2.2]" />
                      </div>
                      <div>
                        <h3 className="font-heading text-sm font-bold text-white">Join as Guest</h3>
                        <p className="text-xs text-[#8c94a4]">Enter with invite link or room code</p>
                      </div>
                    </div>
                    <span className="rounded bg-[#4c6a92]/15 border border-[#4c6a92]/30 px-2 py-0.5 text-[10px] font-bold text-[#82a4d4] uppercase tracking-wider">
                      Guest Pass
                    </span>
                  </div>

                  {guestError && (
                    <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-2.5 text-xs text-rose-300 font-medium">
                      {guestError}
                    </div>
                  )}

                  <form onSubmit={handleJoinGuest} className="space-y-3.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9ca3af] mb-1">
                        Studio Code or Invite Link
                      </label>
                      <input
                        type="text"
                        required
                        value={guestCode}
                        onChange={(e) => setGuestCode(e.target.value)}
                        placeholder="e.g. og-xxxxxx or paste link"
                        className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3 py-2 text-xs text-white placeholder-[#6b7280] focus:border-[#4c6a92] focus:outline-none font-mono transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9ca3af] mb-1">
                        Your Display Name
                      </label>
                      <input
                        type="text"
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="e.g. Jordan Lee"
                        className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3 py-2 text-xs text-white placeholder-[#6b7280] focus:border-[#4c6a92] focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#9ca3af] mb-1">
                        Studio Passcode <span className="normal-case font-normal">(if required)</span>
                      </label>
                      <input
                        type="password"
                        autoComplete="one-time-code"
                        value={guestPasscode}
                        onChange={(e) => setGuestPasscode(e.target.value)}
                        className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3 py-2 text-xs text-white focus:border-[#4c6a92] focus:outline-none font-mono transition-colors"
                      />
                    </div>

                    <div className="rounded-lg border border-[#1a1e26] bg-[#0a0b0e] p-3 space-y-1 text-xs text-[#8c94a4]">
                      <div className="flex items-center gap-1.5 text-[#d1d5db] font-semibold text-[11px]">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#4c6a92]" />
                        <span>Green Room Pre-Flight</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Test your microphone, camera preview, and headphones before crossing into the live studio.
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#4c6a92] hover:bg-[#5a7ca9] text-white px-4 py-2.5 text-xs font-bold transition-all cursor-pointer active:scale-[0.98]"
                    >
                      <span>Join Studio Room</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Recent Studios Snapshot */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-[#c0915a]" />
                    <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#9ca3af]">
                      Recent Studio Sessions
                    </h3>
                  </div>
                  {interviews.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("interviews")}
                      className="text-xs font-semibold text-[#c0915a] hover:text-[#cf9f67] flex items-center gap-1 cursor-pointer"
                    >
                      <span>View all ({interviews.length})</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {interviews.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#1f242e] bg-[#111318]/50 p-8 text-center text-xs text-[#8c94a4] space-y-2">
                    <p className="font-semibold text-white">No studios created yet</p>
                    <p className="text-[11px] text-[#8c94a4]">
                      Click &quot;New Studio Session&quot; above to launch a private recording room and generate guest invitation links.
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
                          className="rounded-xl border border-[#1f242e] bg-[#13161c] p-4.5 space-y-3 hover:border-[#2a313e] transition-all flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] font-semibold text-[#cf9f67] bg-[#c0915a]/10 border border-[#c0915a]/20 px-2 py-0.5 rounded">
                                {interview.id}
                              </span>
                              {hasRecordings ? (
                                <button
                                  type="button"
                                  onClick={() => setActiveTab("recordings")}
                                  className="rounded bg-[#10b981]/15 border border-[#10b981]/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#10b981] flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="h-2.5 w-2.5" />
                                  <span>{sessionRec.tracks.length} Stems Ready</span>
                                </button>
                              ) : (
                                <span className="text-[9px] uppercase font-bold text-[#9ca3af] bg-[#1a1e26] border border-[#242a36] px-2 py-0.5 rounded">
                                  {interview.status || "Ready"}
                                </span>
                              )}
                            </div>

                            <h4 className="font-heading text-xs font-bold text-white line-clamp-1">{interview.title}</h4>
                            <p className="text-[11px] text-[#8c94a4]">
                              Host: <span className="text-[#d1d5db] font-medium">{interview.hostName}</span> • Guest:{" "}
                              <span className="text-[#d1d5db] font-medium">{interview.guestName || "Guest"}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-[#1a1e26]">
                            <button
                              type="button"
                              onClick={() => {
                                router.push(`/studio/${encodeURIComponent(interview.id)}`);
                              }}
                              className="flex-1 rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] text-[#0a0b0e] text-[11px] font-bold py-2 text-center transition-colors cursor-pointer"
                            >
                              Enter Studio
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopySessionLink(interview)}
                              className="rounded-lg border border-[#242a36] bg-[#161a22] p-2 text-[#9ca3af] hover:text-white cursor-pointer transition-colors"
                              title="Copy Guest Invite Link"
                            >
                              {copiedSessionId === interview.id ? (
                                <Check className="h-3.5 w-3.5 text-[#10b981]" />
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
          {/* TAB 2: INTERVIEWS (Studio Sessions Management)            */}
          {/* ========================================================= */}
          {activeTab === "interviews" && (
            <div className="space-y-6">
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#1f242e] bg-[#13161c] p-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-[#c0915a]" />
                    <h3 className="font-heading text-sm font-bold text-white tracking-wide">
                      Creator Studio Sessions
                    </h3>
                    <span className="rounded bg-[#1a1e26] px-2 py-0.5 text-[10px] font-mono font-medium text-[#cf9f67]">
                      {interviews.length} Total
                    </span>
                  </div>
                  <p className="text-xs text-[#8c94a4]">
                    Manage and open studio sessions with separate audio/video stems and secure guest invite links.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedInviteUrl(null);
                      setCreatedGuestPasscode(null);
                      setShowCreateModal(true);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] text-[#0a0b0e] px-3.5 py-2 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[2.6]" />
                    <span>Create Studio</span>
                  </button>
                  <button
                    type="button"
                    onClick={loadData}
                    title="Refresh sessions"
                    className="rounded-lg border border-[#242a36] bg-[#161a22] p-2 text-[#9ca3af] hover:text-white transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoadingData ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Status Filters & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Status Filter Buttons */}
                <div className="flex items-center gap-1 p-1 rounded-lg border border-[#1f242e] bg-[#111318]">
                  {(["all", "scheduled", "active", "completed"] as StatusFilter[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setStatusFilter(tab)}
                      className={`px-3 py-1.5 text-xs font-medium rounded capitalize transition-all cursor-pointer ${
                        statusFilter === tab
                          ? "bg-[#c0915a] text-[#0a0b0e] font-bold"
                          : "text-[#8c94a4] hover:text-[#d1d5db]"
                      }`}
                    >
                      {tab === "all" ? "All Studios" : tab}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6b7280]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search studios..."
                    className="rounded-lg border border-[#242a36] bg-[#111318] pl-8 pr-3 py-1.5 text-xs text-[#e5e7eb] placeholder-[#6b7280] focus:border-[#c0915a] focus:outline-none transition-colors w-full sm:w-64"
                  />
                </div>
              </div>

              {/* Empty State */}
              {filteredInterviews.length === 0 && !isLoadingData && (
                <div className="rounded-xl border border-dashed border-[#1f242e] bg-[#111318]/50 p-12 text-center text-xs text-[#8c94a4] space-y-3">
                  <div className="flex h-11 w-11 mx-auto items-center justify-center rounded-xl bg-[#c0915a]/10 text-[#c0915a] border border-[#c0915a]/20">
                    <Calendar className="h-5 w-5 stroke-[1.8]" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-white text-sm">
                      {searchQuery || statusFilter !== "all"
                        ? "No studios match your filter"
                        : "No studio sessions yet"}
                    </p>
                    <p className="text-[11px] text-[#8c94a4] mt-1 max-w-sm mx-auto">
                      Click &quot;Create Studio&quot; to set up your recording session with isolated multi-track recording.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedInviteUrl(null);
                      setCreatedGuestPasscode(null);
                      setShowCreateModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] px-4 py-2 text-xs font-bold text-[#0a0b0e] transition-all cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[2.6]" />
                    <span>Create Studio</span>
                  </button>
                </div>
              )}

              {/* Studio Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInterviews.map((interview) => {
                  const sessionRec = recordingsByRoom[interview.id];
                  const hasRecordings = sessionRec && sessionRec.tracks.length > 0;

                  return (
                    <div
                      key={interview.id}
                      className="rounded-xl border border-[#1f242e] bg-[#13161c] overflow-hidden hover:border-[#2a313e] transition-all flex flex-col justify-between group"
                    >
                      {/* Video Thumbnail Header */}
                      <div className="relative h-24 w-full bg-[#161a22] border-b border-[#1a1e26] flex items-center justify-between p-3 overflow-hidden">
                        {/* Top room badge & status */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                          <span className="font-mono text-[9px] font-semibold text-[#cf9f67] bg-[#0a0b0e]/80 border border-[#c0915a]/30 px-2 py-0.5 rounded backdrop-blur-sm">
                            {interview.id}
                          </span>
                          {hasRecordings ? (
                            <button
                              type="button"
                              onClick={() => setActiveTab("recordings")}
                              className="rounded bg-[#10b981]/20 border border-[#10b981]/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#10b981] flex items-center gap-1 backdrop-blur-sm cursor-pointer"
                            >
                              <Check className="h-2.5 w-2.5" />
                              <span>{sessionRec.tracks.length} Stems</span>
                            </button>
                          ) : (
                            <span className="text-[9px] uppercase font-bold text-[#9ca3af] bg-[#0a0b0e]/80 border border-[#242a36] px-2 py-0.5 rounded backdrop-blur-sm">
                              {interview.status || "Ready"}
                            </span>
                          )}
                        </div>

                        {/* Dual avatars for 1 Host + 1 Guest */}
                        <div className="flex items-center gap-2 mt-4">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c0915a] text-[#0a0b0e] font-bold text-xs ring-2 ring-[#13161c]"
                            title={`Host: ${interview.hostName}`}
                          >
                            {interview.hostName[0]?.toUpperCase() || "H"}
                          </div>
                          <span className="text-[#6b7280] text-xs font-bold">+</span>
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4c6a92] text-white font-bold text-xs ring-2 ring-[#13161c]"
                            title={`Guest: ${interview.guestName || "Guest"}`}
                          >
                            {(interview.guestName || "G")[0]?.toUpperCase() || "G"}
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-heading text-xs font-bold text-white line-clamp-1 group-hover:text-[#cf9f67] transition-colors">
                            {interview.title}
                          </h4>
                          <p className="text-[11px] text-[#8c94a4] mt-1 line-clamp-1">
                            Host: <strong className="text-[#d1d5db] font-medium">{interview.hostName}</strong> • Guest:{" "}
                            <strong className="text-[#d1d5db] font-medium">{interview.guestName || "Any Guest"}</strong>
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="pt-2 border-t border-[#1a1e26] flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              router.push(`/studio/${encodeURIComponent(interview.id)}`);
                            }}
                            className="flex-1 rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] text-[#0a0b0e] text-[11px] font-bold py-2 text-center transition-colors cursor-pointer"
                          >
                            Enter Studio
                          </button>

                          {hasRecordings && (
                            <button
                              type="button"
                              onClick={() => setActiveTab("recordings")}
                              className="rounded-lg border border-[#10b981]/30 bg-[#10b981]/10 p-2 text-[#10b981] hover:bg-[#10b981]/20 cursor-pointer transition-colors"
                              title="View recordings in library"
                            >
                              <FileVideo className="h-3.5 w-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCopySessionLink(interview)}
                            className="rounded-lg border border-[#242a36] bg-[#161a22] p-2 text-[#9ca3af] hover:text-white cursor-pointer transition-colors"
                            title="Copy Guest Invite Link"
                          >
                            {copiedSessionId === interview.id ? (
                              <Check className="h-3.5 w-3.5 text-[#10b981]" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteInterview(interview.id)}
                            className="rounded-lg border border-[#242a36] bg-[#161a22] p-2 text-[#8c94a4] hover:text-rose-400 cursor-pointer transition-colors"
                            title="Delete Studio"
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
          {/* TAB 4: STUDIO EDITOR & AI MAGIC CLIPS                     */}
          {/* ========================================================= */}
          {activeTab === "editor" && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="rounded-xl border border-[#1f242e] bg-[#13161c] p-6 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#c0915a]/15 text-[#c0915a] border border-[#c0915a]/30 shrink-0">
                      <Sparkles className="h-5 w-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="font-heading text-base font-bold text-white">
                        Text-Based Studio Editor
                      </h3>
                      <p className="text-xs text-[#8c94a4]">
                        Edit an available transcript and preview caption styles. Speech-to-text and rendered video exports are not configured.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#c0915a]/15 border border-[#c0915a]/30 px-2.5 py-1 text-xs font-mono font-bold text-[#cf9f67]">
                      {Object.keys(recordingsByRoom).length} Editable Session{Object.keys(recordingsByRoom).length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sessions to edit */}
              {Object.keys(recordingsByRoom).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.values(recordingsByRoom).map((session) => {
                    const interview = interviews.find((i) => i.id === session.roomId);
                    const title = interview?.title || `Studio Session ${session.roomId}`;
                    return (
                      <div
                        key={session.roomId}
                        className="rounded-xl border border-[#1f242e] bg-[#13161c] p-5 flex flex-col justify-between gap-4 hover:border-[#c0915a]/40 transition-all shadow-sm"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-mono text-[10px] text-[#cf9f67] bg-[#c0915a]/10 px-2 py-0.5 rounded border border-[#c0915a]/20">
                              {session.roomId}
                            </span>
                            <span className="text-[11px] text-[#8c94a4]">
                              {new Date(session.recordedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white mb-1">{title}</h4>
                          <p className="text-xs text-[#8c94a4]">
                            {session.tracks?.length || 0} tracks • {Math.round((session.durationSeconds || 0) / 60)}m {((session.durationSeconds || 0) % 60)}s duration
                          </p>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-[#1a1e26]">
                          <Link
                            href={`/editor/${encodeURIComponent(session.roomId)}`}
                            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] text-[#0a0b0e] py-2 px-3 text-xs font-bold transition-colors shadow-sm"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Launch Studio Editor</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-[#1f242e] bg-[#13161c] p-12 text-center space-y-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#c0915a]/10 text-[#c0915a] border border-[#c0915a]/20 mx-auto">
                    <FileVideo className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">No recorded episodes yet</h4>
                    <p className="text-xs text-[#8c94a4] max-w-md mx-auto">
                      Transcript editing requires a supplied transcript. This deployment does not generate transcripts or render edited video exports.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("dashboard")}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] text-[#0a0b0e] px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Launch Studio to Record</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: RTMP LIVE STREAMING HUB                            */}
          {/* ========================================================= */}
          {activeTab === "streaming" && (
            <div className="space-y-6 max-w-4xl">
              <div className="rounded-xl border border-[#1f242e] bg-[#13161c] p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-[#1a1e26] pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    <Radio className="h-5 w-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-heading text-base font-bold text-white">
                      RTMP Multi-Destination Live Streaming Hub
                    </h3>
                    <p className="text-xs text-[#8c94a4]">
                      Broadcast high-fidelity studio feeds across YouTube Live, Twitch, Facebook Live, and custom RTMP endpoints while preserving isolated local stems.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg border border-[#1f242e] bg-[#0c0e12] p-4 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <Tv className="h-4 w-4 text-[#ef4444]" />
                      <span>YouTube Live</span>
                    </div>
                    <p className="text-[11px] text-[#8c94a4] leading-relaxed">
                      Primary broadcast endpoint: rtmp://a.rtmp.youtube.com/live2 at 1080p60.
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#1f242e] bg-[#0c0e12] p-4 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <Radio className="h-4 w-4 text-[#a855f7]" />
                      <span>Twitch</span>
                    </div>
                    <p className="text-[11px] text-[#8c94a4] leading-relaxed">
                      High-fps ingest: rtmp://live.twitch.tv/app/ with ultra-low latency chat sync.
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#1f242e] bg-[#0c0e12] p-4 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <Radio className="h-4 w-4 text-[#38bdf8]" />
                      <span>Facebook Live</span>
                    </div>
                    <p className="text-[11px] text-[#8c94a4] leading-relaxed">
                      Secure RTMPS stream: rtmps://live-api-s.facebook.com:443/rtmp/
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1a1e26] flex items-center justify-between">
                  <span className="text-xs text-[#8c94a4]">
                    Simulcast keys can be customized directly during any studio session via the in-studio toolbar.
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("dashboard")}
                    className="flex items-center gap-1.5 rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] text-[#0a0b0e] px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Radio className="h-3.5 w-3.5" />
                    <span>Launch Studio with Live Streaming</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: SETTINGS & HARDWARE DIAGNOSTICS                    */}
          {/* ========================================================= */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-3xl">
              {/* Hardware Diagnostics Card */}
              <div className="rounded-xl border border-[#1f242e] bg-[#13161c] p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-[#1a1e26] pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#c0915a]/10 text-[#c0915a] border border-[#c0915a]/20">
                    <Sliders className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="font-heading text-sm font-bold text-white">Audio & Video Hardware Diagnostics</h3>
                    <p className="text-xs text-[#8c94a4]">
                      Verify your local camera feed, microphone input meter, audio devices, and studio camera enhancer
                    </p>
                  </div>
                </div>

                <PreflightMediaTest />
              </div>

              {/* Studio Recording Architecture Card */}
              <div className="rounded-xl border border-[#1f242e] bg-[#13161c] p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-[#1a1e26] pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                    <Layers className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="font-heading text-sm font-bold text-white">Multi-Track Recording Architecture</h3>
                    <p className="text-xs text-[#8c94a4]">
                      Isolated separate recording pipeline (Host & Guest isolated stems)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-[#1f242e] bg-[#0c0e12] p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <span className="h-2 w-2 rounded-full bg-[#c0915a]" />
                      <span>Host Video Stem</span>
                    </div>
                    <p className="text-[11px] text-[#8c94a4] leading-relaxed">
                      Captured directly from local camera stream at pristine resolution (1080p WebM/VP9).
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#1f242e] bg-[#0c0e12] p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <span className="h-2 w-2 rounded-full bg-[#cf9f67]" />
                      <span>Host Audio Stem</span>
                    </div>
                    <p className="text-[11px] text-[#8c94a4] leading-relaxed">
                      Clean isolated microphone capture. Zero cross-talk or background bleed from the guest.
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#1f242e] bg-[#0c0e12] p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <span className="h-2 w-2 rounded-full bg-[#4c6a92]" />
                      <span>Guest Video Stem</span>
                    </div>
                    <p className="text-[11px] text-[#8c94a4] leading-relaxed">
                      Captured losslessly from remote guest track publication without downscaling.
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#1f242e] bg-[#0c0e12] p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <span className="h-2 w-2 rounded-full bg-[#5a7ca9]" />
                      <span>Guest Audio Stem</span>
                    </div>
                    <p className="text-[11px] text-[#8c94a4] leading-relaxed">
                      Dedicated guest voice track (48kHz Opus) ready for Adobe Premiere or DaVinci Resolve.
                    </p>
                  </div>
                </div>
              </div>

              {/* Storage & Deployment Configuration */}
              <div className="rounded-xl border border-[#1f242e] bg-[#13161c] p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-[#1a1e26] pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4c6a92]/10 text-[#4c6a92] border border-[#4c6a92]/20">
                    <HardDrive className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="font-heading text-sm font-bold text-white">Persistent Recording Storage</h3>
                    <p className="text-xs text-[#8c94a4]">
                      Disk path & production deployment configuration
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-[#d1d5db]">
                  <div className="rounded-lg border border-[#2a2217] bg-[#18140f] p-3.5 space-y-1 text-[#f3d9b8]">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#c0915a]">
                      <AlertCircle className="h-4 w-4" />
                      <span>Storage Notice for Cloud Deployments</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[#d9c4aa]">
                      By default, OneGuest Studio stores recordings in <code className="font-mono text-[#cf9f67]">data/recordings</code>. For persistent production on cloud containers, attach a persistent volume and configure:
                    </p>
                    <div className="rounded bg-[#0a0b0e] p-2 font-mono text-[11px] text-[#10b981] mt-1.5">
                      RECORDINGS_STORAGE_PATH=/var/data/recordings
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#1f242e] bg-[#0c0e12] p-3.5 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <Lock className="h-4 w-4 text-[#c0915a]" />
                      <span>Guest Privacy & Security</span>
                    </div>
                    <p className="text-[11px] text-[#8c94a4] leading-relaxed">
                      Guest links do not expose sensitive LiveKit API keys. Secure short-lived WebRTC tokens are minted on-demand server-side using your protected <code className="font-mono text-[#d1d5db]">LIVEKIT_API_SECRET</code>. Guests never need an account.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* CREATE STUDIO MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleModalCreate}
            className="w-full max-w-lg rounded-xl border border-[#242a36] bg-[#13161c] p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#1a1e26] pb-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-[#c0915a]" />
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-white">
                  Create Studio Session
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[#8c94a4] hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300 font-medium">
                {modalError}
              </div>
            )}

            {createdInviteUrl ? (
              <div className="rounded-lg border border-[#10b981]/30 bg-[#10b981]/10 p-4 space-y-3">
                <div className="flex items-center gap-2 text-[#10b981] text-xs font-bold">
                  <Check className="h-4 w-4" />
                  <span>Studio Session Created!</span>
                </div>
                <p className="text-xs text-[#d1d5db] leading-relaxed">
                  Share this guest invitation link. Guests can join without creating an account.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdInviteUrl}
                    className="flex-1 rounded-lg border border-[#10b981]/40 bg-[#0a0b0e] px-3 py-2 text-xs text-[#10b981] font-mono"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!createdInviteUrl) return;
                      await navigator.clipboard.writeText(createdInviteUrl);
                      setCopiedModalLink(true);
                      setTimeout(() => setCopiedModalLink(false), 2500);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] px-3.5 py-2 text-xs font-bold text-[#0a0b0e] cursor-pointer transition-colors"
                  >
                    {copiedModalLink ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                {createdGuestPasscode && (
                  <div className="rounded-lg border border-amber-900/60 bg-amber-950/30 p-3 text-xs text-amber-100">
                    <p className="font-semibold">Share this passcode separately:</p>
                    <code className="mt-1 block font-mono">{createdGuestPasscode}</code>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCreatedInviteUrl(null);
                    setCreatedGuestPasscode(null);
                    setShowCreateModal(false);
                  }}
                  className="w-full mt-2 rounded-lg bg-[#1a1e26] hover:bg-[#242a36] py-2 text-xs text-[#d1d5db] font-semibold cursor-pointer transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#d1d5db] mb-1">
                    Studio Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={modalTitle}
                    onChange={(e) => setModalTitle(e.target.value)}
                    placeholder="e.g. Episode 12: Building with AI"
                    className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3 py-2 text-xs text-white placeholder-[#6b7280] focus:border-[#c0915a] focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#d1d5db] mb-1">
                      Host Name
                    </label>
                    <input
                      type="text"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      placeholder="e.g. Creator Host"
                      className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3 py-2 text-xs text-white placeholder-[#6b7280] focus:border-[#c0915a] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#d1d5db] mb-1">
                      Guest Name
                    </label>
                    <input
                      type="text"
                      value={modalGuestName}
                      onChange={(e) => setModalGuestName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3 py-2 text-xs text-white placeholder-[#6b7280] focus:border-[#c0915a] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#d1d5db] mb-1">
                    Optional Passcode
                  </label>
                  <input
                    type="password"
                    value={modalPasscode}
                    onChange={(e) => setModalPasscode(e.target.value)}
                    placeholder="Leave blank for an unprotected guest link"
                    className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3 py-2 text-xs text-white placeholder-[#6b7280] focus:border-[#c0915a] focus:outline-none font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-lg border border-[#242a36] px-4 py-2 text-xs text-[#9ca3af] hover:bg-[#1a1e26] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingSession || !modalTitle.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] px-4 py-2 text-xs font-bold text-[#0a0b0e] disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    <span>{isCreatingSession ? "Creating..." : "Create Studio"}</span>
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
