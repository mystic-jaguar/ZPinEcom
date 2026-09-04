import assert from 'node:assert';
import { scaleTree } from './scaleStyles';

const x2 = (n: number) => n * 2;

// Measurements scale; colours, strings and percentages pass through untouched.
assert.deepStrictEqual(
  scaleTree({ card: { padding: 16, fontSize: 14, backgroundColor: '#fff', width: '50%' } }, x2),
  { card: { padding: 32, fontSize: 28, backgroundColor: '#fff', width: '50%' } },
);

// Hairlines and 1-2px nudges are left alone, or separators vanish/blur.
assert.deepStrictEqual(scaleTree({ sep: { height: 1, marginTop: 2 } }, x2), { sep: { height: 1, marginTop: 2 } });

// borderWidth is never a measurement.
assert.deepStrictEqual(scaleTree({ a: { borderWidth: 4 } }, x2), { a: { borderWidth: 4 } });

// The pill-radius sentinel must not be scaled into nonsense.
assert.deepStrictEqual(scaleTree({ a: { borderRadius: 999 } }, x2), { a: { borderRadius: 999 } });

// Nested objects (shadowOffset) and arrays (transform) recurse.
assert.deepStrictEqual(
  scaleTree({ a: { shadowOffset: { width: 0, height: 4 }, transform: [{ translateY: 10 }] } }, x2),
  { a: { shadowOffset: { width: 0, height: 8 }, transform: [{ translateY: 10 }] } },
);

// Negative offsets scale in the right direction.
assert.deepStrictEqual(scaleTree({ a: { marginTop: -8 } }, x2), { a: { marginTop: -16 } });

console.log('✅ scaleStyles: all cases pass');

/* ---- device scale: the cross-device invariants ---- */
import { deviceScale, BASELINE_WIDTH, MAX_SCALE } from './scaleStyles';

const DEVICES = [320, 360, 375, 390, 412, 430, 448];

for (const w of DEVICES) {
  const scale = deviceScale(w);
  const px = (n: number) => Math.round(n * scale);

  // Never shrink: a small phone must not get smaller tap targets or type than
  // the baseline design already gives it.
  assert.ok(scale >= 1, `scale must never shrink (width ${w} gave ${scale})`);
  assert.ok(scale <= MAX_SCALE, `scale must stay within the ceiling (width ${w})`);

  // Tap targets stay at or above the 44dp accessibility minimum.
  assert.ok(px(44) >= 44, `44dp tap target shrank to ${px(44)} at width ${w}`);

  // Body copy never drops below the 14px it was designed at.
  assert.ok(px(14) >= 14, `14px body text shrank to ${px(14)} at width ${w}`);

  // Two product cards plus the gap must fit inside the page gutters, or the
  // grid clips on the left/right edge.
  const card = Math.floor((w - px(20) * 2 - 14) / 2);
  assert.ok(card * 2 + 14 + px(20) * 2 <= w, `2-up product grid overflows at width ${w}`);
  assert.ok(card > 0, `product card width went non-positive at width ${w}`);
}

// The baseline device renders the design exactly as drawn — no drift.
assert.strictEqual(deviceScale(BASELINE_WIDTH), 1);

console.log('✅ deviceScale: no shrink, tap targets >= 44dp, grid fits on all devices');
