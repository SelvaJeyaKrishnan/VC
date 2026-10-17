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
} from "lucide-react";

interface TeleprompterProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Teleprompter({ roomId, isOpen, onClose }: TeleprompterProps) {
  const [script, setScript] = useState("");
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(1.5);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg" | "xl">("base");
  const [isMinimized, setIsMinimized] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  const handleScriptChange = (text: string) => {
    setScript(text);
    if (typeof window !== "undefined") {
      localStorage.setItem(`oneguest_teleprompter_${roomId}`, text);
    }
  };

  useEffect(() => {
    if (!isScrolling) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const scrollStep = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop += scrollSpeed;
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
      <div className="rounded-xl border border-[#242a36] bg-[#13161c]/95 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#1a1e26] px-4 py-2 bg-[#0f1115]">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-[#c0915a]/15 text-[#c0915a] border border-[#c0915a]/30">
              <FileText className="h-3 w-3" />
            </div>
            <span className="font-heading text-xs font-bold text-white tracking-wide">
              Studio Script Prompter
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded text-[#8c94a4] hover:text-white hover:bg-[#1a1e26] transition-colors cursor-pointer"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-[#8c94a4] hover:text-white hover:bg-[#1a1e26] transition-colors cursor-pointer"
              title="Close prompter"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div
              ref={scrollContainerRef}
              className="relative h-48 sm:h-56 overflow-y-auto p-4 bg-[#0c0e12] select-text font-sans scroll-smooth"
            >
              <textarea
                value={script}
                onChange={(e) => handleScriptChange(e.target.value)}
                placeholder="Type or paste your interview questions here..."
                className={`w-full h-full bg-transparent text-[#e5e7eb] placeholder-[#6b7280] focus:outline-none resize-none font-sans ${fontClasses}`}
              />
            </div>

            {/* Prompter Controls Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-[#1a1e26] px-4 py-2 bg-[#0f1115] text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsScrolling(!isScrolling)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    isScrolling
                      ? "bg-amber-600 hover:bg-amber-500 text-white"
                      : "bg-[#c0915a] hover:bg-[#cf9f67] text-[#0a0b0e]"
                  }`}
                >
                  {isScrolling ? (
                    <>
                      <Pause className="h-3 w-3 fill-white" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 fill-[#0a0b0e]" />
                      <span>Auto-Scroll</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResetScroll}
                  className="rounded border border-[#242a36] bg-[#161a22] p-1.5 text-[#d1d5db] hover:text-white transition-colors cursor-pointer"
                  title="Rewind to Top"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>

                <div className="flex items-center gap-1 text-[11px] text-[#8c94a4] pl-2">
                  <span>Speed:</span>
                  {[1, 1.5, 2.5].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setScrollSpeed(spd)}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                        scrollSpeed === spd
                          ? "bg-[#c0915a] text-[#0a0b0e]"
                          : "bg-[#1a1e26] text-[#8c94a4] hover:text-[#d1d5db]"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size Adjuster */}
              <div className="flex items-center gap-1 text-[11px] text-[#8c94a4]">
                <Type className="h-3.5 w-3.5 text-[#6b7280]" />
                {(["sm", "base", "lg", "xl"] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setFontSize(sz)}
                    className={`rounded px-1.5 py-0.5 text-[10px] uppercase font-bold cursor-pointer transition-colors ${
                      fontSize === sz
                        ? "bg-[#c0915a] text-[#0a0b0e]"
                        : "bg-[#1a1e26] text-[#8c94a4] hover:text-[#d1d5db]"
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
