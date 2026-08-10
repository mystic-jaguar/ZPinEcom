// Typo-tolerant matching for local (client-side) lists like the category tree.
// Product search stays server-side — Postgres pg_trgm handles typos there.
//
// ponytail: substring-first + bounded Levenshtein, no fuzzy-search dependency.
// Swap in fuse.js only if we ever need weighted multi-field scoring.

// Classic DP edit distance, bailing out once the row minimum exceeds `max`.
function editDistance(a: string, b: string, max: number): number {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const row = [i];
        let rowMin = i;
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
            if (row[j] < rowMin) rowMin = row[j];
        }
        if (rowMin > max) return max + 1;
        prev = row;
    }
    return prev[b.length];
}

// Typos allowed grows with query length: 1 for short words, 2 from 6 chars up.
const tolerance = (len: number) => (len <= 3 ? 0 : len <= 5 ? 1 : 2);

/**
 * Score `text` against `query`. Higher is better, 0 = no match.
 * 100 exact · 90 prefix · 70 substring · 40..60 fuzzy (any word within edit distance).
 */
export function fuzzyScore(text: string, query: string): number {
    const t = text.toLowerCase().trim();
    const q = query.toLowerCase().trim();
    if (!q) return 0;
    if (t === q) return 100;
    if (t.startsWith(q)) return 90;
    if (t.includes(q)) return 70;

    const max = tolerance(q.length);
    if (max === 0) return 0;

    // Compare against each word so "shrt slive" still finds "Short Sleeve Tee".
    let best = 0;
    for (const word of t.split(/[\s/&,-]+/)) {
        if (!word) continue;
        const d = editDistance(word, q, max);
        if (d <= max) best = Math.max(best, 60 - d * 10);
        // Prefix-of-word typo: "jeanz" vs "jeans jacket"
        else if (word.length > q.length) {
            const dp = editDistance(word.slice(0, q.length), q, max);
            if (dp <= max) best = Math.max(best, 50 - dp * 10);
        }
    }
    return best;
}
