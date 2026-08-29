// Self-check for the assistant matcher — no test runner needed:
//   npx tsc constants/supportMatcher.ts constants/supportContent.ts \
//     --outDir <dir> --module esnext --target es2020 --skipLibCheck
//   node <dir>/supportMatcher.test.mjs
// Run it from the compiled output next to the compiled modules.
import assert from 'node:assert';
import { buildIndex, search, HUMAN_INTENT, AFFIRMATIVE, GREETING_RE } from './supportMatcher.js';

const idx = buildIndex();
const hit = (q) => search(idx, q).best?.title;

const cases = [
  ['when will my refund come', /refund/i],
  ['how do i return an item', /return/i],
  ['can i cancel my return', /cancel a return/i],   // must NOT be the cancel-order entry
  ['what is instant delivery', /instant/i],
  ['do you deliver to my area', /(area|deliver)/i],
  ['which size should i buy', /size/i],
  ['can i pay with upi', /payment/i],
  ['cod for instant delivery', /cash on delivery/i],
  ['where is my order', /track/i],
];
for (const [q, re] of cases) {
  const t = hit(q);
  assert.ok(t && re.test(t), `"${q}" → ${t}`);
}

// Nonsense must escalate rather than answer confidently.
assert.equal(search(idx, 'zxqw blorp fnord').best, null);
assert.equal(search(idx, 'do you sell helicopters in antarctica').best, null);

// Human intent beats the fuzzy search, and a bare "yes" is an acceptance.
for (const q of ['talk to a person', 'connect me to customer care', 'i want to speak to someone about my order'])
  assert.ok(HUMAN_INTENT.test(q), q);
assert.ok(!HUMAN_INTENT.test('how do i return an order'));
for (const q of ['yes', 'yeah', 'sure', 'ok', 'haan']) assert.ok(AFFIRMATIVE.test(q), q);
assert.ok(!AFFIRMATIVE.test('yes but where is my refund'));
assert.ok(GREETING_RE.test('hi') && !GREETING_RE.test('hi where is my order'));

console.log('supportMatcher: all checks passed');
