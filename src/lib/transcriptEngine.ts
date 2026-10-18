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

export function createEmptyTranscript(params: {
  roomId: string;
  durationSeconds: number;
}): TranscriptData {
  return {
    roomId: params.roomId,
    durationSeconds: Math.max(0, params.durationSeconds),
    paragraphs: [],
    cuts: [],
    updatedAt: new Date().toISOString(),
  };
}
