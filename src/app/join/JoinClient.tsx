"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Radio, Video, ArrowRight, ShieldCheck, ArrowLeft } from "lucide-react";

export function JoinClient() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let cleanCode = code.trim();
    if (!cleanCode) {
      setError("Please enter your interview room code or paste your invitation link.");
      return;
    }

    // Support pasted URLs
    try {
      if (cleanCode.startsWith("http://") || cleanCode.startsWith("https://")) {
        const url = new URL(cleanCode);
        const queryRoom = url.searchParams.get("room") || url.searchParams.get("code");
        if (queryRoom) {
          cleanCode = queryRoom.trim();
        } else {
          const segs = url.pathname.split("/").filter(Boolean);
          if (segs[0] === "room" && segs[1]) {
            cleanCode = segs[1].trim();
          }
        }
      }
    } catch {
      // Not a URL, use raw string
    }

    const cleanName = name.trim() || "Guest Participant";
    setIsSubmitting(true);

    const query = new URLSearchParams({
      role: "guest",
      name: cleanName,
    });

    router.push(`/room/${encodeURIComponent(cleanCode)}?${query.toString()}`);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a0c10] p-4 text-slate-100 antialiased select-none">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 text-white shadow-xl shadow-purple-950/50 ring-1 ring-purple-400/30">
            <Radio className="h-6 w-6 stroke-[2.2]" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            OneGuest Studio
          </h1>
          <p className="text-xs text-slate-400">
            Private 1-on-1 creator interview room
          </p>
        </div>

        {/* Join Card */}
        <div className="rounded-2xl border border-[#202534] bg-[#12141c] p-6 sm:p-7 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1f2433] pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                <Video className="h-4 w-4 stroke-[2]" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                  Join Interview as Guest
                </h2>
                <p className="text-[11px] text-slate-400">
                  No account or login required
                </p>
              </div>
            </div>
            <span className="rounded-md bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-cyan-300">
              Guest
            </span>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Room Code or Invitation Link *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. og-abcdef or paste full invite URL"
                className="w-full rounded-xl border border-[#262c3b] bg-[#0a0c10] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none font-mono transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Your Display Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="w-full rounded-xl border border-[#262c3b] bg-[#0a0c10] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition-colors"
              />
            </div>

            <div className="rounded-xl border border-[#1f2433] bg-[#0c0e14] p-3 text-xs text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                <span>Green Room Setup</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Before entering the live studio, you will preview your camera, select your microphone, and check your lighting.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !code.trim() || !name.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-3 text-xs font-bold shadow-lg shadow-cyan-950/50 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
            >
              <span>{isSubmitting ? "Entering Green Room..." : "Enter Green Room"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Studio Host Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
