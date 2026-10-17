"use client";

import { useState } from "react";
import {
  Sparkles,
  Sun,
  Eye,
  Sliders,
  Columns2,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SelfieEnhancerConfig } from "@/lib/videoFilters/selfieEnhancerProcessor";

interface SelfieEnhancerControlProps {
  config: SelfieEnhancerConfig;
  onToggleEnabled: () => void;
  onSetStrength: (val: number) => void;
  onSetLighting: (val: number) => void;
  onSetSkinSmooth: (val: number) => void;
  onToggleCompare: () => void;
  onClose?: () => void;
  variant?: "popover" | "embedded";
}

export function SelfieEnhancerControl({
  config,
  onToggleEnabled,
  onSetStrength,
  onSetLighting,
  onSetSkinSmooth,
  onToggleCompare,
  onClose,
  variant = "popover",
}: SelfieEnhancerControlProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const presets = [
    { label: "Subtle", strength: 35, smooth: 45, light: 40 },
    { label: "Studio Soft", strength: 70, smooth: 75, light: 60 },
    { label: "Broadcast Glow", strength: 95, smooth: 90, light: 85 },
  ];

  const applyPreset = (preset: (typeof presets)[0]) => {
    if (!config.enabled) {
      onToggleEnabled();
    }
    onSetStrength(preset.strength);
    onSetSkinSmooth(preset.smooth);
    onSetLighting(preset.light);
  };

  const content = (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[#222736] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Selfie Enhancer
            </h4>
            <span className="text-[10px] text-slate-400">
              Natural beauty & studio lighting
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Main Toggle Switch */}
          <button
            type="button"
            onClick={onToggleEnabled}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
              config.enabled ? "bg-purple-600 shadow-md shadow-purple-900/50" : "bg-[#252a38]"
            )}
            role="switch"
            aria-checked={config.enabled}
            title={config.enabled ? "Turn Off Enhancer" : "Turn On Enhancer"}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                config.enabled ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ml-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Master Strength Slider */}
      <div className={cn("space-y-2 transition-opacity", !config.enabled && "opacity-50 pointer-events-none")}>
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
            <Sparkles className="h-3 w-3 text-purple-400" />
            <span>Master Enhancement Strength</span>
          </label>
          <span className="font-mono font-bold text-purple-300 text-xs">
            {config.strength}%
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={config.strength}
          onChange={(e) => onSetStrength(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#202534] accent-purple-500 focus:outline-none"
        />

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 pt-1">
          {presets.map((preset) => {
            const isMatch = Math.abs(config.strength - preset.strength) <= 5;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className={cn(
                  "flex-1 rounded-lg border py-1.5 text-[10px] font-semibold transition-all cursor-pointer",
                  isMatch && config.enabled
                    ? "border-purple-500 bg-purple-950/40 text-purple-300"
                    : "border-[#252a3a] bg-[#141723] text-slate-400 hover:border-slate-600 hover:text-slate-200"
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Split Comparison Mode Toggle */}
      <div className={cn("rounded-xl border border-[#232737] bg-[#0f111a] p-3 space-y-2", !config.enabled && "opacity-50 pointer-events-none")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Columns2 className="h-4 w-4 text-cyan-400" />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200 block">
                Split Comparison Mode
              </span>
              <span className="text-[10px] text-slate-400 block">
                Left: Raw Video • Right: Enhanced
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleCompare}
            className={cn(
              "px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border",
              config.compareMode
                ? "bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-900/40"
                : "bg-[#181c28] border-[#2b3145] text-slate-400 hover:text-white"
            )}
          >
            {config.compareMode ? "Comparing" : "Compare"}
          </button>
        </div>
      </div>

      {/* Advanced Tuning Toggle */}
      <div className={cn("space-y-3", !config.enabled && "opacity-50 pointer-events-none")}>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Sliders className="h-3 w-3 text-purple-400" />
            <span>Detailed Adjustments (Skin & Lighting)</span>
          </span>
          {showAdvanced ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {showAdvanced && (
          <div className="space-y-3 rounded-xl border border-[#222736] bg-[#0f111a] p-3 pt-2 text-xs">
            {/* Skin Smoothing Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 flex items-center gap-1">
                  <Eye className="h-3 w-3 text-purple-400" />
                  Bilateral Skin Softening
                </span>
                <span className="font-mono text-purple-300 font-semibold">{config.skinSmooth}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.skinSmooth}
                onChange={(e) => onSetSkinSmooth(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#202534] accent-purple-500 focus:outline-none"
              />
            </div>

            {/* Studio Lighting Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 flex items-center gap-1">
                  <Sun className="h-3 w-3 text-amber-400" />
                  Studio Ring Lighting & Exposure
                </span>
                <span className="font-mono text-amber-300 font-semibold">{config.lighting}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.lighting}
                onChange={(e) => onSetLighting(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#202534] accent-amber-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Hardware Acceleration Note */}
      <div className="flex items-start gap-2 rounded-xl border border-[#222736] bg-[#0c0e15] p-2.5 text-[10px] text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          Zero latency hardware GPU WebGL filter. Transmits over WebRTC to guests & is captured directly into multi-track master files.
        </span>
      </div>
    </div>
  );

  if (variant === "embedded") {
    return (
      <div className="rounded-2xl border border-[#232736] bg-[#141721] p-4 shadow-xl">
        {content}
      </div>
    );
  }

  return (
    <div className="w-80 sm:w-96 rounded-2xl border border-[#282d3d] bg-[#13151f] p-4 shadow-2xl backdrop-blur-xl">
      {content}
    </div>
  );
}
