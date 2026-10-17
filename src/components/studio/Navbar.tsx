import Link from "next/link";
import { Mic, Radio, Video } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#1e2230] bg-[#10121a]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-lg shadow-purple-950/40 border border-purple-400/20 transition-transform group-hover:scale-105">
            <Radio className="h-5 w-5 text-white stroke-[2.2]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">OneGuest</span>
              <span className="rounded bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider text-purple-300">
                Studio
              </span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">Remote Creator Studio</span>
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/?tab=sessions"
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-[#232736] bg-[#141721] px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:text-white hover:bg-[#1c202d]"
          >
            <span>Sessions</span>
          </Link>
          <Link
            href="/?tab=overview"
            className="flex items-center gap-1.5 rounded-xl border border-[#232736] bg-[#141721] px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:text-white hover:bg-[#1c202d]"
          >
            <Video className="h-3.5 w-3.5 text-slate-400" />
            <span>Join as Guest</span>
          </Link>
          <Link
            href="/?tab=overview"
            className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-purple-950/40 transition-all active:scale-[0.98]"
          >
            <Mic className="h-3.5 w-3.5 stroke-[2.2]" />
            <span>Host Studio</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
