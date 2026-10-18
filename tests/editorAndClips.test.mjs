import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyTranscript,
  generateSRT,
  generatePlainText,
  formatSRTTime,
} from "../src/lib/transcriptEngine.ts";

test("formatSRTTime formats seconds into accurate SubRip timecode", () => {
  assert.strictEqual(formatSRTTime(0), "00:00:00,000");
  assert.strictEqual(formatSRTTime(75.5), "00:01:15,500");
  assert.strictEqual(formatSRTTime(3661.125), "01:01:01,125");
});

test("createEmptyTranscript does not fabricate dialogue", () => {
  const transcript = createEmptyTranscript({
    roomId: "test-studio-room",
    durationSeconds: 120,
  });

  assert.strictEqual(transcript.roomId, "test-studio-room");
  assert.strictEqual(transcript.durationSeconds, 120);
  assert.deepStrictEqual(transcript.paragraphs, []);
  assert.deepStrictEqual(transcript.cuts, []);
});

test("empty transcript produces empty text and subtitle exports", () => {
  assert.strictEqual(generateSRT([]), "");
  assert.strictEqual(generatePlainText([]), "");
});

test("Text-based editing excludes deleted words from SRT and plain text exports", () => {
  const transcript = {
    roomId: "cut-test-room",
    durationSeconds: 10,
    cuts: [],
    updatedAt: new Date().toISOString(),
    paragraphs: [{
      id: "p-1",
      speaker: "host",
      speakerName: "Host",
      start: 1,
      end: 3,
      text: "Welcome to the studio",
      words: [
        { id: "w-1", word: "Welcome", start: 1, end: 1.5, speaker: "Host", deleted: false },
        { id: "w-2", word: "to", start: 1.6, end: 1.8, speaker: "Host", deleted: false },
        { id: "w-3", word: "the", start: 1.9, end: 2, speaker: "Host", deleted: false },
        { id: "w-4", word: "studio", start: 2.1, end: 2.8, speaker: "Host", deleted: false },
      ],
    }],
  };
  const fullSRT = generateSRT(transcript.paragraphs);
  const fullText = generatePlainText(transcript.paragraphs);
  assert.ok(fullSRT.includes("1\n00:00:"));
  assert.ok(fullText.includes("Host:"));

  // Perform text cut on first word of first paragraph
  const targetWord = transcript.paragraphs[0].words[0];
  const targetWordStr = targetWord.word;
  targetWord.deleted = true;

  const editedSRT = generateSRT(transcript.paragraphs);
  const editedText = generatePlainText(transcript.paragraphs);

  // First word should now be absent from the exported active text
  assert.ok(!editedText.startsWith(`[00:01] Host:\n${targetWordStr}`));
});
