"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText,
  Play,
  Pause,
  RotateCcw,
  X,
  Type,
  ChevronDown,
  ChevronUp,
  Sliders,
  Sparkles,
} from "lucide-react";

interface TeleprompterProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Teleprompter({ roomId, isOpen, onClose }: TeleprompterProps) {
  const [script, setScript] = useState("");
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(1.5); // pixels per frame
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg" | "xl">("base");
  const [isMinimized, setIsMinimized] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Load saved script for this room, or default to structured interview prompt
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `oneguest_teleprompter_${roomId}`;
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      setScript(saved);
    } else {
      setScript(
        `Welcome to OneGuest Studio!\n\n` +
          `[INTRO]\n` +
          `• Welcome our guest to today's interview\n` +
          `• Brief intro & background\n\n` +
          `[CORE DISCUSSION]\n` +
          `1. What inspired your recent project / breakthrough?\n` +
          `2. What was the hardest technical or creative challenge?\n` +
          `3. How did you navigate the inflection point?\n\n` +
          `[RAPID FIRE / INSIGHTS]\n` +
          `• Best advice for creators starting today\n` +
          `• Tools and workflows you rely on daily\n\n` +
          `[OUTRO]\n` +
          `• Where our audience can find and follow you\n` +
          `• Thank you for joining us on OneGuest!`
      );
    }
  }, [roomId]);

  // Persist script changes
  const handleScriptChange = (text: string) => {
    setScript(text);
    if (typeof window !== "undefined") {
      localStorage.setItem(`oneguest_teleprompter_${roomId}`, text);
    }
  };

  // Auto-scroll loop
  useEffect(() => {
    if (!isScrolling) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const scrollStep = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop += scrollSpeed;
        // Stop if reached bottom
        if (
          scrollContainerRef.current.scrollTop + scrollContainerRef.current.clientHeight >=
          scrollContainerRef.current.scrollHeight
        ) {
          setIsScrolling(false);
          return;
        }
      }
      animationFrameRef.current = requestAnimationFrame(scrollStep);
    };

    animationFrameRef.current = requestAnimationFrame(scrollStep);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isScrolling, scrollSpeed]);

  const handleResetScroll = () => {
    setIsScrolling(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  if (!isOpen) return null;

  const fontClasses = {
    sm: "text-xs leading-relaxed",
    base: "text-sm leading-relaxed",
    lg: "text-base leading-loose",
    xl: "text-lg leading-loose font-medium",
  }[fontSize];

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="rounded-2xl border border-[#2b3145] bg-[#12141f]/95 shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col ring-1 ring-white/10">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#232736] px-4 py-2.5 bg-[#0e1018]">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold text-white tracking-wide">
              Interview Teleprompter & Notes
            </span>
            <span className="rounded bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider text-purple-300">
              Studio Prompter
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close prompter"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Scroll View / Text Area */}
            <div
              ref={scrollContainerRef}
              className="relative h-48 sm:h-56 overflow-y-auto p-4 bg-[#0a0c12]/80 select-text font-sans scroll-smooth"
            >
              <textarea
                value={script}
                onChange={(e) => handleScriptChange(e.target.value)}
                placeholder="Type or paste your interview questions here..."
                className={`w-full h-full bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none resize-none font-sans ${fontClasses}`}
              />
            </div>

            {/* Prompter Controls Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-[#232736] px-4 py-2 bg-[#0e1018] text-xs">
              <div className="flex items-center gap-2">
                {/* Play / Pause Auto-scroll */}
                <button
                  type="button"
                  onClick={() => setIsScrolling(!isScrolling)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    isScrolling
                      ? "bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-950/40"
                      : "bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-950/40"
                  }`}
                >
                  {isScrolling ? (
                    <>
                      <Pause className="h-3.5 w-3.5 fill-white" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-white" />
                      <span>Auto-Scroll</span>
                    </>
                  )}
                </button>

                {/* Reset to top */}
                <button
                  type="button"
                  onClick={handleResetScroll}
                  className="rounded-lg border border-[#2b3144] bg-[#161924] p-1.5 text-slate-300 hover:text-white hover:bg-[#1e2333] transition-colors cursor-pointer"
                  title="Rewind to Top"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>

                {/* Speed Selector */}
                <div className="flex items-center gap-1 text-[11px] text-slate-400 pl-2">
                  <span>Speed:</span>
                  {[1, 1.5, 2.5].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setScrollSpeed(spd)}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                        scrollSpeed === spd
                          ? "bg-purple-600 text-white"
                          : "bg-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size Adjuster */}
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Type className="h-3.5 w-3.5 text-slate-500" />
                {(["sm", "base", "lg", "xl"] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setFontSize(sz)}
                    className={`rounded px-1.5 py-0.5 text-[10px] uppercase font-bold cursor-pointer transition-colors ${
                      fontSize === sz
                        ? "bg-purple-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
