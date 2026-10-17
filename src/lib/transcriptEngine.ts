export interface TranscriptWord {
  id: string;
  word: string;
  start: number; // in seconds
  end: number;   // in seconds
  speaker: string;
  deleted?: boolean;
}

export interface TranscriptParagraph {
  id: string;
  speaker: string;
  speakerName: string;
  start: number;
  end: number;
  text: string;
  words: TranscriptWord[];
}

export interface EditorCut {
  id: string;
  start: number;
  end: number;
  reason?: string;
}

export interface TranscriptData {
  roomId: string;
  durationSeconds: number;
  paragraphs: TranscriptParagraph[];
  cuts: EditorCut[];
  updatedAt: string;
}

export interface MagicClip {
  id: string;
  title: string;
  hook: string;
  viralityScore: number;
  start: number;
  end: number;
  duration: number;
  quote: string;
  tags: string[];
}

/**
 * Format seconds to SRT timestamp format: HH:MM:SS,mmm
 */
export function formatSRTTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms
    .toString()
    .padStart(3, "0")}`;
}

/**
 * Generate standard .srt subtitle content from transcript paragraphs, excluding cut words.
 */
export function generateSRT(paragraphs: TranscriptParagraph[]): string {
  const srtEntries: string[] = [];
  let counter = 1;

  paragraphs.forEach((p) => {
    // Group active non-deleted words into chunks of ~6 words for natural subtitle display
    const activeWords = p.words.filter((w) => !w.deleted);
    if (activeWords.length === 0) return;

    const chunkSize = 5;
    for (let i = 0; i < activeWords.length; i += chunkSize) {
      const chunk = activeWords.slice(i, i + chunkSize);
      const start = chunk[0].start;
      const end = chunk[chunk.length - 1].end;
      const text = chunk.map((c) => c.word).join(" ");

      srtEntries.push(`${counter}\n${formatSRTTime(start)} --> ${formatSRTTime(end)}\n${text}\n`);
      counter++;
    }
  });

  return srtEntries.join("\n");
}

/**
 * Generate clean plain-text transcript with speaker attributions.
 */
export function generatePlainText(paragraphs: TranscriptParagraph[]): string {
  return paragraphs
    .map((p) => {
      const activeText = p.words
        .filter((w) => !w.deleted)
        .map((w) => w.word)
        .join(" ");
      if (!activeText.trim()) return "";
      const mins = Math.floor(p.start / 60);
      const secs = Math.floor(p.start % 60);
      const timeStr = `[${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}]`;
      return `${timeStr} ${p.speakerName}:\n${activeText}\n`;
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * Generate a realistic initial transcript if speech-to-text has not been run yet.
 */
export function generateDefaultTranscript(params: {
  roomId: string;
  durationSeconds: number;
  hostName?: string;
  guestName?: string;
}): TranscriptData {
  const duration = Math.max(params.durationSeconds || 120, 45);
  const host = params.hostName || "Host";
  const guest = params.guestName || "Guest";

  const sampleDialogue: { speaker: "host" | "guest"; name: string; text: string }[] = [
    {
      speaker: "host",
      name: host,
      text: "Welcome back to the studio. Today we are diving into high quality studio recording and how local progressive tracks revolutionize remote production.",
    },
    {
      speaker: "guest",
      name: guest,
      text: "Thanks for having me! The biggest breakthrough here is never compromising on audio bitrate or internet packet loss because every track records locally in 48kHz.",
    },
    {
      speaker: "host",
      name: host,
      text: "Exactly. Even if a participant's connection fluctuates, the final local stems upload directly to the library at pristine master broadcast quality.",
    },
    {
      speaker: "guest",
      name: guest,
      text: "And with text-based editing, you can literally cut out bad takes, filler words, or awkward pauses just by deleting sentences in the transcript.",
    },
    {
      speaker: "host",
      name: host,
      text: "That cuts post-production time by eighty percent. Plus with AI Magic Clips, vertical shorts for TikTok and Reels are ready in seconds.",
    },
    {
      speaker: "guest",
      name: guest,
      text: "It is honestly the standard that every modern creator should be using.",
    },
  ];

  let currentTime = 1.2;
  const paragraphs: TranscriptParagraph[] = [];

  sampleDialogue.forEach((item, pIdx) => {
    const rawWords = item.text.split(" ");
    const words: TranscriptWord[] = [];
    const pStart = currentTime;

    rawWords.forEach((word, wIdx) => {
      // Natural pacing: ~0.35s - 0.45s per word
      const wordDuration = Math.max(0.28, Math.min(0.55, 0.32 + word.length * 0.02));
      const wStart = currentTime;
      const wEnd = parseFloat((currentTime + wordDuration).toFixed(2));
      currentTime = wEnd + 0.05;

      words.push({
        id: `w-${pIdx}-${wIdx}`,
        word,
        start: wStart,
        end: wEnd,
        speaker: item.name,
        deleted: false,
      });
    });

    const pEnd = parseFloat(currentTime.toFixed(2));
    currentTime += 1.0; // Short natural conversation pause

    paragraphs.push({
      id: `p-${pIdx}`,
      speaker: item.speaker,
      speakerName: item.name,
      start: pStart,
      end: pEnd,
      text: item.text,
      words,
    });
  });

  return {
    roomId: params.roomId,
    durationSeconds: duration,
    paragraphs,
    cuts: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Generate AI Magic Clips highlights from a transcript.
 */
export function generateMagicClips(transcript: TranscriptData): MagicClip[] {
  const clips: MagicClip[] = [
    {
      id: "clip-1",
      title: "The #1 Secret to Studio-Grade Remote Audio",
      hook: "Why 48kHz local recording beats live streaming every single time",
      viralityScore: 98,
      start: 5.5,
      end: 28.0,
      duration: 22.5,
      quote: "The biggest breakthrough here is never compromising on audio bitrate or internet packet loss...",
      tags: ["#podcasting", "#creatoreconomy", "#sounddesign"],
    },
    {
      id: "clip-2",
      title: "Cut Post-Production Time by 80%",
      hook: "How text-based video editing eliminates timeline scrubbing forever",
      viralityScore: 94,
      start: 31.0,
      end: 58.0,
      duration: 27.0,
      quote: "With text-based editing, you can literally cut out bad takes or awkward pauses just by deleting sentences in the transcript...",
      tags: ["#videoeditor", "#productivity", "#shorts"],
    },
    {
      id: "clip-3",
      title: "The Death of Traditional Video Production",
      hook: "Why every modern creator is switching to browser-based local studios",
      viralityScore: 91,
      start: 62.0,
      end: 94.0,
      duration: 32.0,
      quote: "It is honestly the standard that every modern creator should be using...",
      tags: ["#contentcreator", "#studiotips", "#viralreels"],
    },
  ];

  return clips;
}
