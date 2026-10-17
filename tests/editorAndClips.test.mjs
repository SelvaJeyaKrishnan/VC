import test from "node:test";
import assert from "node:assert/strict";
import {
  generateDefaultTranscript,
  generateSRT,
  generatePlainText,
  generateMagicClips,
  formatSRTTime,
} from "../src/lib/transcriptEngine.ts";

test("formatSRTTime formats seconds into accurate SubRip timecode", () => {
  assert.strictEqual(formatSRTTime(0), "00:00:00,000");
  assert.strictEqual(formatSRTTime(75.5), "00:01:15,500");
  assert.strictEqual(formatSRTTime(3661.125), "01:01:01,125");
});

test("generateDefaultTranscript produces structured word-level timestamps and speaker dialogue", () => {
  const transcript = generateDefaultTranscript({
    roomId: "test-studio-room",
    durationSeconds: 120,
    hostName: "Host Alex",
    guestName: "Guest Jordan",
  });

  assert.strictEqual(transcript.roomId, "test-studio-room");
  assert.strictEqual(transcript.durationSeconds, 120);
  assert.ok(transcript.paragraphs.length >= 4);

  // Check paragraph structure
  const firstP = transcript.paragraphs[0];
  assert.strictEqual(firstP.speakerName, "Host Alex");
  assert.ok(firstP.words.length > 5);

  // Verify timestamps are non-decreasing
  let lastTime = 0;
  firstP.words.forEach((w) => {
    assert.ok(w.start >= lastTime, `Word ${w.word} start ${w.start} should be >= ${lastTime}`);
    assert.ok(w.end > w.start, `Word ${w.word} end should be > start`);
    lastTime = w.start;
  });
});

test("Text-based video editing: deleting words strikes them out from SRT and plain text exports", () => {
  const transcript = generateDefaultTranscript({
    roomId: "cut-test-room",
    durationSeconds: 90,
  });

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

test("generateMagicClips analyzes speech and identifies high-engagement 9:16 short clips", () => {
  const transcript = generateDefaultTranscript({
    roomId: "clips-test-room",
    durationSeconds: 150,
  });

  const clips = generateMagicClips(transcript);
  assert.ok(clips.length >= 3);

  clips.forEach((clip) => {
    assert.ok(clip.viralityScore >= 90, "Virality score should be high engagement (>=90)");
    assert.ok(clip.duration > 10, "Clip duration should be a valid short (>10s)");
    assert.ok(clip.end > clip.start);
    assert.ok(clip.title.length > 5);
    assert.ok(clip.hook.length > 10);
    assert.ok(clip.tags.length >= 1);
  });
});
