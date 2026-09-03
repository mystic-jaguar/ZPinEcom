/**
 * searchSynonyms.ts — copied verbatim from the customer website's
 * productController.js (SYNONYMS + levenshtein + expandSearchTerms) so both
 * surfaces expand a search query the same way. Keep the two in sync: a term
 * that finds a product on the website must find it in the app.
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

/**
 * Expand a search term to include synonyms.
 * Returns array of all terms to OR together.
 */
export function expandSearchTerms(term: string): string[] {
  const lower = term.toLowerCase().trim();
  // direct match
  if (SYNONYMS[lower]) return [...new Set([lower, ...SYNONYMS[lower]])];
  // partial match — check if any synonym key is contained in the term
  for (const [key, vals] of Object.entries(SYNONYMS)) {
    if (lower.includes(key) || key.includes(lower)) {
      return [...new Set([lower, ...vals])];
    }
  }
  // typo tolerance — no exact/partial hit, so look for a synonym key that's a
  // close misspelling (e.g. "jaket" -> "jacket", "swetaer" -> "sweater").
  // Distance threshold scales with word length so short words don't over-match.
  const maxDist = lower.length <= 4 ? 1 : lower.length <= 7 ? 2 : 3;
  let bestKey: string | null = null;
  let bestDist = Infinity;
  for (const key of Object.keys(SYNONYMS)) {
    const dist = levenshtein(lower, key);
    if (dist <= maxDist && dist < bestDist) {
      bestDist = dist;
      bestKey = key;
    }
  }
  if (bestKey) return [...new Set([lower, ...SYNONYMS[bestKey]])];
  return [lower];
}
