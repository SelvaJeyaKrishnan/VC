import fs from "fs";
import path from "path";
import { randomBytes, timingSafeEqual } from "crypto";
import type { Interview } from "../types/studio.ts";
import { generateRoomId } from "./utils.ts";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "interviews.json");

function ensureStorage(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
    }
  } catch (err) {
    console.error("Failed to initialize interview storage:", err);
  }
}

function readAll(): Interview[] {
  ensureStorage();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const records = JSON.parse(raw) as (Omit<Interview, "inviteToken"> & {
      inviteToken?: string;
      inviteExpiresAt?: string;
    })[];
    let changed = false;
    const interviews = records.map((interview) => {
      if (
        interview.inviteToken &&
        /^[A-Za-z0-9_-]{40,}$/.test(interview.inviteToken) &&
        interview.inviteExpiresAt
      ) {
        return interview as Interview;
      }
      changed = true;
      return {
        ...interview,
        inviteToken:
          interview.inviteToken && /^[A-Za-z0-9_-]{40,}$/.test(interview.inviteToken)
            ? interview.inviteToken
            : randomBytes(32).toString("base64url"),
        inviteExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      } as Interview;
    });
    if (changed) writeAll(interviews);
    return interviews;
  } catch (err) {
    console.error("Failed to read interviews:", err);
    return [];
  }
}

function writeAll(interviews: Interview[]): void {
  ensureStorage();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(interviews, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write interviews:", err);
  }
}

export const interviewStore = {
  getAll(): Interview[] {
    return readAll().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getAllForOwner(ownerEmail: string): Interview[] {
    const normalizedEmail = ownerEmail.trim().toLowerCase();
    const legacyOwner = process.env.LEGACY_DATA_OWNER_EMAIL?.trim().toLowerCase();
    return this.getAll().filter(
      (interview) =>
        (interview.ownerEmail || legacyOwner)?.trim().toLowerCase() === normalizedEmail
    );
  },

  getById(id: string): Interview | null {
    const list = readAll();
    const item = list.find((it) => it.id === id);
    return item || null;
  },

  create(data: {
    title: string;
    hostName: string;
    guestName: string;
    id?: string;
    passcode?: string;
    ownerEmail?: string;
  }): Interview {
    const list = readAll();
    const roomId = data.id?.trim() || generateRoomId("og");
    const passcode = data.passcode?.trim() || undefined;

    // Check if room ID already exists
    const existingIndex = list.findIndex((it) => it.id === roomId);
    const now = new Date().toISOString();

    const newInterview: Interview = {
      id: roomId,
      inviteToken: randomBytes(32).toString("base64url"),
      inviteExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      title: data.title.trim() || "1-on-1 Creator Interview",
      hostName: data.hostName.trim() || "Host",
      guestName: data.guestName.trim() || "Guest",
      passcode,
      ownerEmail: data.ownerEmail?.trim().toLowerCase(),
      status: "scheduled",
      createdAt: existingIndex >= 0 ? list[existingIndex].createdAt : now,
      updatedAt: now,
      recordingStatus: "not_started",
    };

    if (existingIndex >= 0) {
      list[existingIndex] = newInterview;
    } else {
      list.unshift(newInterview);
    }

    writeAll(list);
    return newInterview;
  },

  update(id: string, updates: Partial<Interview>): Interview | null {
    const list = readAll();
    const index = list.findIndex((it) => it.id === id);
    if (index === -1) return null;

    list[index] = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    writeAll(list);
    return list[index];
  },

  delete(id: string): boolean {
    const list = readAll();
    const filtered = list.filter((it) => it.id !== id);
    if (filtered.length === list.length) return false;
    writeAll(filtered);
    return true;
  },

  validateAccess(id: string, passcode?: string): { valid: boolean; reason?: string; interview?: Interview } {
    const interview = this.getById(id);
    if (!interview) {
      return { valid: false, reason: "Interview room does not exist or has expired." };
    }

    if (interview.passcode && interview.passcode !== passcode?.trim()) {
      return { valid: false, reason: "Invalid private interview passcode.", interview };
    }

    return { valid: true, interview };
  },

  validateInvitation(token: string, passcode?: string): { valid: boolean; reason?: string; interview?: Interview } {
    if (!/^[A-Za-z0-9_-]{40,}$/.test(token)) {
      return { valid: false, reason: "Invitation link is invalid or has expired." };
    }
    const interview = this.getAll().find((item) => {
      const saved = Buffer.from(item.inviteToken);
      const candidate = Buffer.from(token);
      return saved.length === candidate.length && timingSafeEqual(saved, candidate);
    });
    if (!interview) {
      return { valid: false, reason: "Invitation link is invalid or has expired." };
    }
    const expiresAt = Date.parse(interview.inviteExpiresAt || "");
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return { valid: false, reason: "Invitation link is invalid or has expired.", interview };
    }
    if (interview.passcode && interview.passcode !== passcode?.trim()) {
      return { valid: false, reason: "Invalid private interview passcode.", interview };
    }
    return { valid: true, interview };
  },
};
