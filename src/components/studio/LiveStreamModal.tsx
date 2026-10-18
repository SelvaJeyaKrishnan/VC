"use client";

import { AlertCircle, Radio, X } from "lucide-react";

interface LiveStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LiveStreamModal({ isOpen, onClose }: LiveStreamModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <section
        aria-labelledby="streaming-modal-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl border border-[#242a36] bg-[#0f1115] p-6 shadow-2xl"
        role="dialog"
      >
        <header className="mb-5 flex items-start justify-between border-b border-[#1a1e26] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#c0915a]/15 text-[#c0915a]">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <h2 id="streaming-modal-title" className="font-heading text-base font-bold text-white">
                Live streaming
              </h2>
              <p className="text-xs text-[#8c94a4]">RTMP output is not configured</p>
            </div>
          </div>
          <button
            aria-label="Close live streaming information"
            className="rounded-lg p-1.5 text-[#8c94a4] transition-colors hover:bg-[#1f242e] hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex items-start gap-3 rounded-xl border border-amber-900/60 bg-amber-950/30 p-4">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="space-y-2 text-sm leading-relaxed text-amber-100">
            <p className="font-semibold">No stream is being sent to an external destination.</p>
            <p>
              This project does not currently include a media relay or LiveKit Egress service.
              Destination credentials are not requested or stored, and the studio will not show a
              live status until a real stream backend is configured.
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-[#8c94a4]">
          Enabling this feature requires a server-side RTMP egress pipeline, protected credential
          storage, and real stream-health reporting. Recording in the studio remains available
          independently.
        </p>
      </section>
    </div>
  );
}
