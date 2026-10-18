import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateRoomId(prefix = "studio"): string {
  const characters = "abcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return `${prefix}-${result}`;
}

export function isValidRoomId(roomId: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(roomId);
}

export function generateGuestCode(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `OG-${num}`;
}

export function getInitials(name: string): string {
  if (!name) return "P";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
