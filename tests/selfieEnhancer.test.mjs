import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSkinToneWeight,
  calculateShadowLift,
  DEFAULT_ENHANCER_CONFIG,
} from "../src/lib/videoFilters/selfieEnhancerProcessor.ts";

test("DEFAULT_ENHANCER_CONFIG defines sensible natural studio defaults", () => {
  assert.strictEqual(DEFAULT_ENHANCER_CONFIG.enabled, false);
  assert.strictEqual(DEFAULT_ENHANCER_CONFIG.strength, 70);
  assert.strictEqual(DEFAULT_ENHANCER_CONFIG.lighting, 60);
  assert.strictEqual(DEFAULT_ENHANCER_CONFIG.skinSmooth, 75);
  assert.strictEqual(DEFAULT_ENHANCER_CONFIG.compareMode, false);
});

test("calculateSkinToneWeight correctly distinguishes human skin tones from background colors", () => {
  // Typical Caucasian / European skin tone (Normalized RGB ~ [0.85, 0.68, 0.58])
  const fairSkin = calculateSkinToneWeight(0.85, 0.68, 0.58);
  assert.strictEqual(fairSkin > 0.6, true, `Fair skin tone weight should be high, got ${fairSkin}`);

  // Olive / Asian skin tone (Normalized RGB ~ [0.75, 0.60, 0.45])
  const oliveSkin = calculateSkinToneWeight(0.75, 0.60, 0.45);
  assert.strictEqual(oliveSkin > 0.6, true, `Olive skin tone weight should be high, got ${oliveSkin}`);

  // Deep Brown / Black skin tone (Normalized RGB ~ [0.45, 0.32, 0.25])
  const deepSkin = calculateSkinToneWeight(0.45, 0.32, 0.25);
  assert.strictEqual(deepSkin > 0.4, true, `Deep skin tone weight should be detected, got ${deepSkin}`);

  // Non-skin background: Pure Blue wall/shirt ([0.1, 0.2, 0.9])
  const blueWall = calculateSkinToneWeight(0.1, 0.2, 0.9);
  assert.strictEqual(blueWall < 0.1, true, `Blue background should not be classified as skin, got ${blueWall}`);

  // Non-skin background: Pure Green chroma key ([0.0, 0.9, 0.1])
  const greenScreen = calculateSkinToneWeight(0.0, 0.9, 0.1);
  assert.strictEqual(greenScreen < 0.05, true, `Green screen should not be classified as skin, got ${greenScreen}`);

  // Neutral Black ([0.0, 0.0, 0.0])
  const neutralBlack = calculateSkinToneWeight(0.0, 0.0, 0.0);
  assert.strictEqual(neutralBlack < 0.1, true, `Black shadow should not be classified as skin, got ${neutralBlack}`);
});

test("calculateShadowLift enhances dark under-eye regions while protecting bright highlights", () => {
  const lightingFactor = 0.6; // 60% default

  // Mid-shadows (lum = 0.35) -> should receive peak fill lighting
  const midShadowLift = calculateShadowLift(0.35, lightingFactor);
  assert.strictEqual(midShadowLift > 0.15, true, `Mid-shadow should be lifted, got ${midShadowLift}`);

  // Near-white highlight (lum = 0.95) -> should receive almost no lift to prevent blowouts
  const highlightLift = calculateShadowLift(0.95, lightingFactor);
  assert.strictEqual(highlightLift < 0.05, true, `Highlights must not be blown out, got ${highlightLift}`);

  // Zero lighting factor -> lift must be 0
  assert.strictEqual(calculateShadowLift(0.5, 0), 0);
});
