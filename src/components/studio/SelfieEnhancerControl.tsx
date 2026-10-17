"use client";

import { useState } from "react";
import {
  Sparkles,
  Sun,
  Eye,
  Sliders,
  Columns2,
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
    { label: "Studio", strength: 70, smooth: 75, light: 60 },
    { label: "Glow", strength: 95, smooth: 90, light: 85 },
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
      <div className="flex items-center justify-between border-b border-[#1a1e26] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#c0915a]/15 text-[#c0915a] border border-[#c0915a]/30">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-white">
              Camera Enhancer
            </h4>
            <span className="text-[10px] text-[#8c94a4]">
              Studio lighting & subtle tone
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Main Toggle Switch */}
          <button
            type="button"
            onClick={onToggleEnabled}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
              config.enabled ? "bg-[#c0915a]" : "bg-[#242a36]"
            )}
            role="switch"
            aria-checked={config.enabled}
            title={config.enabled ? "Turn Off Enhancer" : "Turn On Enhancer"}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#0a0b0e] shadow ring-0 transition duration-200 ease-in-out",
                config.enabled ? "translate-x-4" : "translate-x-0"
              )}
            />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ml-1 text-[#8c94a4] hover:text-white transition-colors cursor-pointer"
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
          <label className="font-medium text-[#d1d5db] flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
            <Sparkles className="h-3 w-3 text-[#c0915a]" />
            <span>Enhancement Strength</span>
          </label>
          <span className="font-mono font-semibold text-[#cf9f67] text-xs">
            {config.strength}%
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="100"
          value={config.strength}
          onChange={(e) => onSetStrength(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[#1f242e] accent-[#c0915a] focus:outline-none"
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
                  "flex-1 rounded border py-1 text-[10px] font-semibold transition-all cursor-pointer",
                  isMatch && config.enabled
                    ? "border-[#c0915a] bg-[#c0915a]/15 text-[#cf9f67]"
                    : "border-[#242a36] bg-[#111318] text-[#8c94a4] hover:text-[#d1d5db]"
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Split Comparison Mode Toggle */}
      <div className={cn("rounded-lg border border-[#1f242e] bg-[#0c0e12] p-3 space-y-2", !config.enabled && "opacity-50 pointer-events-none")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Columns2 className="h-4 w-4 text-[#4c6a92]" />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#d1d5db] block">
                Split Comparison
              </span>
              <span className="text-[10px] text-[#8c94a4] block">
                Left: Raw • Right: Enhanced
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleCompare}
            className={cn(
              "px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer border",
              config.compareMode
                ? "bg-[#4c6a92]/20 border-[#4c6a92] text-[#82a4d4]"
                : "bg-[#14171d] border-[#242a36] text-[#8c94a4] hover:text-white"
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
          className="flex w-full items-center justify-between text-[11px] font-medium text-[#8c94a4] hover:text-[#d1d5db] transition-colors py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Sliders className="h-3 w-3 text-[#c0915a]" />
            <span>Tone & Lighting Adjustments</span>
          </span>
          {showAdvanced ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        {showAdvanced && (
          <div className="space-y-3 rounded-lg border border-[#1f242e] bg-[#0c0e12] p-3 pt-2 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#d1d5db] flex items-center gap-1">
                  <Eye className="h-3 w-3 text-[#c0915a]" />
                  Skin Softening
                </span>
                <span className="font-mono text-[#cf9f67] font-semibold">{config.skinSmooth}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.skinSmooth}
                onChange={(e) => onSetSkinSmooth(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded bg-[#1f242e] accent-[#c0915a] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#d1d5db] flex items-center gap-1">
                  <Sun className="h-3 w-3 text-[#f59e0b]" />
                  Studio Exposure
                </span>
                <span className="font-mono text-[#f59e0b] font-semibold">{config.lighting}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.lighting}
                onChange={(e) => onSetLighting(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded bg-[#1f242e] accent-[#f59e0b] focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-[#1f242e] bg-[#0a0b0e] p-2.5 text-[10px] text-[#8c94a4]">
        <ShieldCheck className="h-3.5 w-3.5 text-[#10b981] shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          Zero latency hardware GPU WebGL filter rendered directly into camera stream.
        </span>
      </div>
    </div>
  );

  if (variant === "embedded") {
    return (
      <div className="rounded-xl border border-[#1f242e] bg-[#13161c] p-4 shadow-sm">
        {content}
      </div>
    );
  }

  return (
    <div className="w-80 sm:w-96 rounded-xl border border-[#242a36] bg-[#13161c] p-4 shadow-2xl backdrop-blur-xl">
      {content}
    </div>
  );
}
