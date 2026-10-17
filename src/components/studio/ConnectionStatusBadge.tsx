"use client";

import { useConnectionState } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionStatusBadgeProps {
  className?: string;
  explicitState?: ConnectionState;
}

export function ConnectionStatusBadge({ className, explicitState }: ConnectionStatusBadgeProps) {
  // Try hook if within LiveKitRoom, fallback to explicitState
  let roomState: ConnectionState = ConnectionState.Disconnected;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const hookState = useConnectionState();
    roomState = hookState ?? explicitState ?? ConnectionState.Disconnected;
  } catch {
    roomState = explicitState ?? ConnectionState.Disconnected;
  }

  const getStatusConfig = () => {
    switch (roomState) {
      case ConnectionState.Connected:
        return {
          label: "Live / Connected",
          dotColor: "bg-emerald-500",
          ringColor: "ring-emerald-500/30",
          textColor: "text-emerald-400",
          bgColor: "bg-emerald-950/40 border-emerald-800/40",
          icon: Wifi,
        };
      case ConnectionState.Connecting:
        return {
          label: "Connecting...",
          dotColor: "bg-amber-400 animate-ping",
          ringColor: "ring-amber-400/40",
          textColor: "text-amber-300",
          bgColor: "bg-amber-950/40 border-amber-800/40",
          icon: Wifi,
        };
      case ConnectionState.Reconnecting:
        return {
          label: "Reconnecting...",
          dotColor: "bg-amber-500 animate-pulse",
          ringColor: "ring-amber-500/40",
          textColor: "text-amber-400",
          bgColor: "bg-amber-950/40 border-amber-800/40",
          icon: Wifi,
        };
      case ConnectionState.Disconnected:
      default:
        return {
          label: "Disconnected",
          dotColor: "bg-rose-500",
          ringColor: "ring-rose-500/30",
          textColor: "text-rose-400",
          bgColor: "bg-rose-950/40 border-rose-800/40",
          icon: WifiOff,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur-sm transition-all",
        config.bgColor,
        className
      )}
      title={`LiveKit Connection State: ${roomState}`}
    >
      <span className="relative flex h-2 w-2">
        <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", config.dotColor)} />
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", config.dotColor)} />
      </span>
      <Icon className={cn("h-3 w-3", config.textColor)} />
      <span className={cn("font-medium tracking-wide text-[11px]", config.textColor)}>{config.label}</span>
    </div>
  );
}
