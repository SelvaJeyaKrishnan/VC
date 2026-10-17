"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import Link from "next/link";
import { ShieldAlert, RefreshCw, Home, Terminal } from "lucide-react";

interface Props {
  children: ReactNode;
  roomId?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class StudioErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Studio Room caught an error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || "An unknown media error occurred";
      const isApiKeyIssue =
        errorMsg.toLowerCase().includes("api key") ||
        errorMsg.toLowerCase().includes("credentials") ||
        errorMsg.toLowerCase().includes("signal connection") ||
        errorMsg.toLowerCase().includes("region settings") ||
        errorMsg.toLowerCase().includes("could not fetch") ||
        errorMsg.toLowerCase().includes("could not establish") ||
        errorMsg.toLowerCase().includes("region");

      return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a0b0e] p-4 text-center select-none">
          <div className="w-full max-w-lg rounded-xl border border-[#1f242e] bg-[#13161c] p-6 sm:p-8 shadow-2xl text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldAlert className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-white">Connection Error</h2>
                <p className="text-xs text-[#8c94a4]">
                  {isApiKeyIssue ? "Invalid LiveKit Credentials" : "LiveKit Media Stream Error"}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-200 mb-5 leading-relaxed font-mono">
              {errorMsg}
            </div>

            {isApiKeyIssue && (
              <div className="rounded-lg border border-[#3b2a1a] bg-[#1c140d] p-4 mb-5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#cf9f67]">
                  <Terminal className="h-4 w-4" />
                  <span>How to fix: Add Real LiveKit Credentials</span>
                </div>
                <p className="text-[11px] text-[#d1d5db]">
                  Update your <code className="text-[#cf9f67] bg-[#0a0b0e] px-1 py-0.5 rounded">.env.local</code> with credentials from your{" "}
                  <a
                    href="https://cloud.livekit.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-[#c0915a] hover:text-[#cf9f67]"
                  >
                    LiveKit Cloud Dashboard
                  </a>:
                </p>
                <pre className="rounded bg-[#0a0b0e] p-2.5 text-[11px] font-mono text-[#d1d5db] overflow-x-auto">
{`LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxx
LIVEKIT_API_SECRET=sec_yyyyyyyyyyyyyyyyyyyyyyyyyyyy`}
                </pre>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#c0915a] hover:bg-[#cf9f67] px-4 py-2.5 text-xs font-bold text-[#0a0b0e] transition-all cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Connection</span>
              </button>

              <Link
                href="/"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg border border-[#242a36] bg-[#161a22] px-4 py-2.5 text-xs font-semibold text-[#d1d5db] hover:bg-[#202534] hover:text-white transition-colors cursor-pointer"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Return to Home</span>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
