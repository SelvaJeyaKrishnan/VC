"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio, Video, ArrowRight, ShieldCheck } from "lucide-react";

interface JoinClientProps {
  initialCode?: string;
  initialName?: string;
  initialInviteToken?: string;
  initialRoomId?: string;
  initialError?: string;
}

export function JoinClient({
  initialCode = "",
  initialName = "",
  initialInviteToken = "",
  initialRoomId = "",
  initialError,
}: JoinClientProps) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState(initialName);
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(
    initialError === "invalid_invitation"
      ? "The invitation or studio passcode could not be verified. Check the passcode or ask the host for a new invitation."
      : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!initialInviteToken) return;
    const savedPasscode = window.sessionStorage.getItem(`oneguest:invite:${initialInviteToken}`);
    if (savedPasscode) setPasscode(savedPasscode);
  }, [initialInviteToken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let token = initialInviteToken;
    const cleanCode = code.trim();
    if (!token && cleanCode) {
      try {
        const url = new URL(cleanCode);
        const segments = url.pathname.split("/").filter(Boolean);
        if (segments[0] === "join" && segments[1]) token = segments[1];
      } catch {
        if (/^[A-Za-z0-9_-]{40,}$/.test(cleanCode)) token = cleanCode;
      }
    }
    if (!token) {
      setError("Use the secure invitation link provided by your host. Studio codes alone cannot join a room.");
      return;
    }

    const cleanName = name.trim() || "Guest Participant";
    const query = new URLSearchParams({
      role: "guest",
      name: cleanName,
    });
    if (passcode.trim()) {
      window.sessionStorage.setItem(`oneguest:invite:${token}`, passcode.trim());
    }
    if (!initialInviteToken || !initialRoomId) {
      setIsSubmitting(true);
      router.push(`/join/${encodeURIComponent(token)}?${query.toString()}`);
      return;
    }

    query.set("invitationToken", token);
    router.push(`/room/${encodeURIComponent(initialRoomId)}?${query.toString()}`);
    setIsSubmitting(true);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a0b0e] p-4 text-[#f3f4f6] antialiased select-none">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#c0915a] text-[#0a0b0e] shadow-md shadow-[#c0915a]/20">
            <Radio className="h-5 w-5 stroke-[2.4]" />
          </div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-white">
            OneGuest Studio
          </h1>
          <p className="text-xs text-[#8c94a4]">
            Private 1-on-1 remote recording studio
          </p>
        </div>

        {/* Join Card */}
        <div className="rounded-xl border border-[#1f242e] bg-[#13161c] p-6 sm:p-7 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[#1a1e26] pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4c6a92]/15 text-[#4c6a92] border border-[#4c6a92]/30">
                <Video className="h-4 w-4 stroke-[2]" />
              </div>
              <div>
                <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-white">
                  Join Studio as Guest
                </h2>
                <p className="text-[11px] text-[#8c94a4]">
                  No account or login required
                </p>
              </div>
            </div>
            <span className="rounded bg-[#4c6a92]/15 border border-[#4c6a92]/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#82a4d4]">
              Guest Pass
            </span>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8c94a4] mb-1">
                {initialInviteToken ? "Invitation link" : "Secure Invitation Link *"}
              </label>
              <input
                type="text"
                required={!initialInviteToken}
                readOnly={!!initialInviteToken}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste the secure invitation link from your host"
                className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3.5 py-2 text-xs text-white placeholder-[#6b7280] focus:border-[#4c6a92] focus:outline-none font-mono transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8c94a4] mb-1">
                Your Display Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3.5 py-2 text-xs text-white placeholder-[#6b7280] focus:border-[#4c6a92] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8c94a4] mb-1">
                Studio Passcode <span className="normal-case font-normal">(if required)</span>
              </label>
              <input
                type="password"
                autoComplete="one-time-code"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full rounded-lg border border-[#242a36] bg-[#0c0e12] px-3.5 py-2 text-xs text-white placeholder-[#6b7280] focus:border-[#4c6a92] focus:outline-none font-mono transition-colors"
              />
            </div>

            <div className="rounded-lg border border-[#1a1e26] bg-[#0a0b0e] p-3 text-xs text-[#8c94a4] space-y-1">
              <div className="flex items-center gap-1.5 text-[#d1d5db] font-semibold text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#4c6a92]" />
                <span>Green Room Setup</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Before entering the live studio, you will preview your camera, select your microphone, and check your lighting.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !code.trim() || !name.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#4c6a92] hover:bg-[#5a7ca9] text-white px-4 py-2.5 text-xs font-bold shadow-md active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
            >
              <span>{isSubmitting ? "Entering Green Room..." : "Enter Green Room"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
