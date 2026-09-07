/**
 * searchSynonyms.ts — the SYNONYMS table and levenshtein() came from the
 * customer website's productController.js so both surfaces resolve a search
 * term the same way. Keep the table in sync: a term that finds a product on
 * the website must find it in the app.
 *
 * Expansion itself is now per-TOKEN (expandToken) rather than per-phrase: the
 * website's whole-phrase expandSearchTerms could not handle "blue cotton
 * kurta", and its substring rung expanded "laptop bag" into blouses because
 * the phrase contains the synonym key "top". See CROSS_SURFACE_CHANGES.md.
 */

// Each key maps to an array of equivalent terms. Search expands to OR across all.
const SYNONYMS: Record<string, string[]> = {
  // saree variants
  'saree':       ['saree', 'sari', 'saari'],
  'sari':        ['saree', 'sari', 'saari'],
  'saari':       ['saree', 'sari', 'saari'],

  // kurta variants
  'kurta':       ['kurta', 'kurti', 'kurtis', 'kurtas'],
  'kurti':       ['kurta', 'kurti', 'kurtis', 'kurtas'],

  // lehenga variants
  'lehenga':     ['lehenga', 'lehnga', 'lahenga', 'ghagra'],
  'lehnga':      ['lehenga', 'lehnga', 'lahenga', 'ghagra'],
  'ghagra':      ['lehenga', 'lehnga', 'lahenga', 'ghagra'],

  // dupatta variants
  'dupatta':     ['dupatta', 'dupata', 'chunni', 'chunri'],
  'chunni':      ['dupatta', 'dupata', 'chunni', 'chunri'],

  // salwar variants
  'salwar':      ['salwar', 'shalwar', 'salwar kameez', 'suit'],
  'shalwar':     ['salwar', 'shalwar', 'salwar kameez'],

  // t-shirt variants
  'tshirt':      ['t-shirt', 'tshirt', 'tee', 't shirt'],
  't-shirt':     ['t-shirt', 'tshirt', 'tee', 't shirt'],
  'tee':         ['t-shirt', 'tshirt', 'tee', 't shirt'],

  // jeans variants
  'jeans':       ['jeans', 'denim', 'denims'],
  'denim':       ['jeans', 'denim', 'denims'],

  // jacket variants
  'jacket':      ['jacket', 'jackets', 'blazer', 'coat', 'outerwear'],
  'blazer':      ['blazer', 'blazers', 'jacket', 'coat'],

  // shoes variants
  'shoes':       ['shoes', 'footwear', 'sneakers', 'sandals', 'heels', 'boots', 'flats'],
  'footwear':    ['shoes', 'footwear', 'sneakers', 'sandals'],
  'sneakers':    ['sneakers', 'shoes', 'trainers', 'sports shoes'],
  'chappal':     ['sandals', 'chappal', 'slippers', 'flip flops'],
  'slippers':    ['slippers', 'chappal', 'flip flops', 'sandals'],

  // bag variants
  'bag':         ['bag', 'bags', 'handbag', 'purse', 'backpack', 'tote'],
  'purse':       ['purse', 'handbag', 'bag', 'clutch'],
  'handbag':     ['handbag', 'purse', 'bag', 'tote'],

  // watch variants
  'watch':       ['watch', 'watches', 'timepiece', 'wristwatch'],

  // jewellery variants
  'jewellery':   ['jewellery', 'jewelry', 'jewels', 'ornaments'],
  'jewelry':     ['jewellery', 'jewelry', 'jewels', 'ornaments'],
  'necklace':    ['necklace', 'necklaces', 'chain', 'haar'],
  'earring':     ['earring', 'earrings', 'jhumka', 'jhumki', 'studs'],
  'jhumka':      ['jhumka', 'jhumki', 'earring', 'earrings'],
  'bangle':      ['bangle', 'bangles', 'bracelet', 'kangan', 'chudi'],
  'kangan':      ['kangan', 'bangle', 'bangles', 'bracelet'],

  // ethnic wear
  'sherwani':    ['sherwani', 'shervani', 'achkan'],
  'achkan':      ['achkan', 'sherwani', 'bandhgala'],
  'dhoti':       ['dhoti', 'dhotis', 'lungi'],
  'anarkali':    ['anarkali', 'anarkalis', 'frock'],

  // western wear
  'dress':       ['dress', 'dresses', 'frock', 'gown'],
  'gown':        ['gown', 'gowns', 'dress', 'maxi'],
  'top':         ['top', 'tops', 'blouse', 'shirt'],
  'trouser':     ['trouser', 'trousers', 'pants', 'pant'],
  'pant':        ['pant', 'pants', 'trouser', 'trousers'],
  'shorts':      ['shorts', 'short', 'bermuda', 'half pants'],
  'skirt':       ['skirt', 'skirts', 'ghagra', 'lehenga'],
  'sweater':     ['sweater', 'sweaters', 'sweatshirt', 'pullover', 'hoodie'],
  'hoodie':      ['hoodie', 'hoodies', 'sweatshirt', 'sweater'],
  'sweatshirt':  ['sweatshirt', 'sweatshirts', 'hoodie', 'sweater'],

  // beauty
  'lipstick':    ['lipstick', 'lip color', 'lip colour', 'lip gloss'],
  'moisturizer': ['moisturizer', 'moisturiser', 'cream', 'lotion'],
  'sunscreen':   ['sunscreen', 'sunblock', 'spf', 'sun protection'],
  'perfume':     ['perfume', 'fragrance', 'cologne', 'attar', 'deodorant'],
  'attar':       ['attar', 'perfume', 'fragrance', 'ittar'],

  // home
  'bedsheet':    ['bedsheet', 'bedsheets', 'bed sheet', 'bed cover', 'chadar'],
  'chadar':      ['chadar', 'bedsheet', 'bed sheet'],
  'curtain':     ['curtain', 'curtains', 'drapes', 'parda'],
  'pillow':      ['pillow', 'pillows', 'cushion', 'takiya'],
};

/** Levenshtein edit distance between two strings. */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const row: number[] = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = row;
  }
  return prev[n];
}

/** Reverse index: every word appearing in a synonym VALUE maps to the groups
 *  that contain it. Built once. Without this, a token that is only ever a value
 *  ("shirt" lives in the "top" and "t-shirt" groups but is not itself a key)
 *  falls through to the edit-distance rung and lands on "skirt". */
const VALUE_INDEX: Record<string, string[]> = (() => {
  const idx: Record<string, Set<string>> = {};
  for (const vals of Object.values(SYNONYMS)) {
    for (const val of vals) {
      for (const word of val.split(/[^a-z0-9]+/).filter(Boolean)) {
        const set = (idx[word] ??= new Set<string>());
        vals.forEach((v) => set.add(v));
      }
    }
  }
  return Object.fromEntries(Object.entries(idx).map(([k, v]) => [k, [...v]]));
})();

/** Best synonym-key match for a misspelling, or null. Threshold scales with
 *  word length so short words don't over-match ("shirt" -> "short"). */
function nearestKey(word: string): string | null {
  const maxDist = word.length <= 4 ? 1 : word.length <= 7 ? 2 : 3;
  let bestKey: string | null = null;
  let bestDist = Infinity;
  for (const key of Object.keys(SYNONYMS)) {
    const dist = levenshtein(word, key);
    if (dist <= maxDist && dist < bestDist) {
      bestDist = dist;
      bestKey = key;
    }
  }
  return bestKey;
}

/**
 * Expand ONE word of a query. Exact key first, then a close misspelling
 * ("jaket" -> "jacket", "kurtas" -> "kurta"). Returns the word itself when
 * nothing matches, so an unknown brand still searches for itself.
 *
 * Deliberately has no substring rung: at the token level "kurt" is already
 * within edit distance of "kurta", and substring matching is what made
 * "laptop" expand to blouse/shirt (it contains the key "top").
 */
export function expandToken(word: string): string[] {
  const lower = word.toLowerCase().trim();
  if (!lower) return [];
  if (SYNONYMS[lower]) return [...new Set([lower, ...SYNONYMS[lower]])];
  if (VALUE_INDEX[lower]) return [...new Set([lower, ...VALUE_INDEX[lower]])];
  // Typo: put the CORRECTED term first. Callers rank on expansions[0], so
  // "kurtaa" must rank as "kurta"; the raw token stays in the list so a
  // literal ILIKE on it still works.
  const key = nearestKey(lower);
  if (key) return [...new Set([...SYNONYMS[key], lower])];
  return [lower];
}

/** Split a raw query into searchable tokens (drops punctuation and 1-char noise). */
export function tokenize(q: string): string[] {
  return q.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
}
