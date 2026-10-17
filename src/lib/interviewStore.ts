import fs from "fs";
import path from "path";
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
    return JSON.parse(raw) as Interview[];
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
  }): Interview {
    const list = readAll();
    const roomId = data.id?.trim() || generateRoomId("og");
    const passcode = data.passcode?.trim() || Math.floor(100000 + Math.random() * 900000).toString();

    // Check if room ID already exists
    const existingIndex = list.findIndex((it) => it.id === roomId);
    const now = new Date().toISOString();

    const newInterview: Interview = {
      id: roomId,
      title: data.title.trim() || "1-on-1 Creator Interview",
      hostName: data.hostName.trim() || "Host",
      guestName: data.guestName.trim() || "Guest",
      passcode,
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

    if (interview.passcode && passcode && interview.passcode !== passcode.trim()) {
      return { valid: false, reason: "Invalid private interview passcode.", interview };
    }

    return { valid: true, interview };
  },
};
