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
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0d0f15] p-4 text-center">
          <div className="w-full max-w-lg rounded-3xl border border-[#232736] bg-[#141721] p-6 sm:p-8 shadow-2xl text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30">
                <ShieldAlert className="h-6 w-6 stroke-[2]" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Connection Error</h2>
                <p className="text-xs text-slate-400">
                  {isApiKeyIssue ? "Invalid LiveKit Credentials" : "LiveKit Media Stream Error"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-3.5 text-xs text-rose-200 mb-5 leading-relaxed font-mono">
              {errorMsg}
            </div>

            {isApiKeyIssue && (
              <div className="rounded-xl border border-purple-800/60 bg-purple-950/20 p-4 mb-5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                  <Terminal className="h-4 w-4" />
                  <span>How to fix: Add Real LiveKit Credentials</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  The current API key is a placeholder. Update your <code className="text-purple-200 bg-slate-900 px-1 py-0.5 rounded">.env.local</code> with credentials from your{" "}
                  <a
                    href="https://cloud.livekit.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-purple-300 hover:text-purple-200"
                  >
                    LiveKit Cloud Dashboard
                  </a>:
                </p>
                <pre className="rounded-lg bg-slate-950 p-2.5 text-[11px] font-mono text-purple-200/90 overflow-x-auto">
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
