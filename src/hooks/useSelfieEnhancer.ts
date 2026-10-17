"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { LocalParticipant } from "livekit-client";
import { Track } from "livekit-client";
import {
  SelfieEnhancerProcessor,
  getSharedSelfieEnhancer,
  DEFAULT_ENHANCER_CONFIG,
  type SelfieEnhancerConfig,
} from "@/lib/videoFilters/selfieEnhancerProcessor";

const STORAGE_KEY = "oneguest_selfie_enhancer_config_v1";

export function useSelfieEnhancer(localParticipant?: LocalParticipant | null) {
  const [config, setConfig] = useState<SelfieEnhancerConfig>(DEFAULT_ENHANCER_CONFIG);
  const processorRef = useRef<SelfieEnhancerProcessor | null>(null);
  const isSyncingWithTrack = useRef(false);

  // 1. Initialize from localStorage and singleton
  useEffect(() => {
    let saved: Partial<SelfieEnhancerConfig> = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        saved = JSON.parse(raw);
      }
    } catch {
      // ignore
    }

    const merged: SelfieEnhancerConfig = {
      ...DEFAULT_ENHANCER_CONFIG,
      ...saved,
    };

    setConfig(merged);
    const processor = getSharedSelfieEnhancer(merged);
    processorRef.current = processor;
  }, []);

  // 2. Persist state changes and update processor instance
  const updateSettings = useCallback((partial: Partial<SelfieEnhancerConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      if (processorRef.current) {
        processorRef.current.updateConfig(next);
      }
      return next;
    });
  }, []);

  const toggleEnabled = useCallback(() => {
    updateSettings({ enabled: !config.enabled });
  }, [config.enabled, updateSettings]);

  const setStrength = useCallback((strength: number) => {
    updateSettings({ strength: Math.max(0, Math.min(100, strength)) });
  }, [updateSettings]);

  const setLighting = useCallback((lighting: number) => {
    updateSettings({ lighting: Math.max(0, Math.min(100, lighting)) });
  }, [updateSettings]);

  const setSkinSmooth = useCallback((skinSmooth: number) => {
    updateSettings({ skinSmooth: Math.max(0, Math.min(100, skinSmooth)) });
  }, [updateSettings]);

  const toggleCompareMode = useCallback(() => {
    updateSettings({ compareMode: !config.compareMode });
  }, [config.compareMode, updateSettings]);

  // 3. Sync processor with LiveKit localParticipant's LocalVideoTrack
  useEffect(() => {
    if (!localParticipant) return;

    const syncProcessor = async () => {
      if (isSyncingWithTrack.current) return;
      isSyncingWithTrack.current = true;

      try {
        let camPub = localParticipant.getTrackPublication(Track.Source.Camera);
        if (!camPub && localParticipant.videoTrackPublications) {
          const pubs = Array.from(localParticipant.videoTrackPublications.values());
          camPub = pubs.find((p) => p.source === Track.Source.Camera);
        }

        const localTrack = camPub?.track as
          | (import("livekit-client").LocalVideoTrack & {
              setProcessor?: (proc: unknown, showLocally?: boolean) => Promise<void>;
              stopProcessor?: () => Promise<void>;
              getProcessor?: () => unknown;
            })
          | undefined;

        if (!localTrack || typeof localTrack.setProcessor !== "function") {
          return;
        }

        const processor = processorRef.current || getSharedSelfieEnhancer(config);
        processorRef.current = processor;
        processor.updateConfig(config);

        const currentProcessor = localTrack.getProcessor?.();

        if (config.enabled) {
          if (currentProcessor !== processor) {
            await localTrack.setProcessor(processor, true);
          }
        } else {
          if (currentProcessor === processor && typeof localTrack.stopProcessor === "function") {
            await localTrack.stopProcessor();
          }
        }
      } catch (err) {
        console.warn("Error synchronizing selfie enhancer with video track:", err);
      } finally {
        isSyncingWithTrack.current = false;
      }
    };

    syncProcessor();

    // Re-sync on track lifecycle events (mute/unmute, publish/unpublish, device switch)
    const handleTrackUpdate = () => {
      syncProcessor();
    };

    // ParticipantEvent import or string names
    localParticipant.on("localTrackPublished" as any, handleTrackUpdate);
    localParticipant.on("localTrackUnpublished" as any, handleTrackUpdate);
    localParticipant.on("trackMuted" as any, handleTrackUpdate);
    localParticipant.on("trackUnmuted" as any, handleTrackUpdate);

    return () => {
      localParticipant.off("localTrackPublished" as any, handleTrackUpdate);
      localParticipant.off("localTrackUnpublished" as any, handleTrackUpdate);
      localParticipant.off("trackMuted" as any, handleTrackUpdate);
      localParticipant.off("trackUnmuted" as any, handleTrackUpdate);
    };
  }, [localParticipant, config.enabled]);

  return {
    config,
    isEnabled: config.enabled,
    strength: config.strength,
    lighting: config.lighting,
    skinSmooth: config.skinSmooth,
    compareMode: config.compareMode,
    toggleEnabled,
    setStrength,
    setLighting,
    setSkinSmooth,
    toggleCompareMode,
    updateSettings,
    processor: processorRef.current,
  };
}
