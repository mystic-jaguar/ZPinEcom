// Rule-based matcher behind the ZPIN assistant, kept out of the component so
// it can be exercised without a renderer (see supportMatcher.test.mjs). Ported
// from the seller app's SupportChatBot so both assistants rank answers the same
// way.
import {
    SUPPORT_FAQS,
    SUPPORT_GUIDES,
    type SupportFaq,
    type SupportGuide,
} from './supportContent';

const STOP_WORDS = new Set([
    'a', 'an', 'the', 'is', 'it', 'to', 'do', 'does', 'did', 'i', 'my', 'me', 'you', 'your', 'we', 'of', 'on', 'in',
    'for', 'and', 'or', 'be', 'can', 'how', 'what', 'when', 'where', 'why', 'with', 'not', 'no', 'yes', 'if', 'at',
    'as', 'are', 'was', 'will', 'would', 'should', 'could', 'have', 'has', 'get', 'got', 'from', 'this', 'that',
    'am', 'pls', 'please', 'help', 'hi', 'hey', 'hello', 'need', 'want', 'there', 'their', 'they',
    'about', 'just', 'still', 'also', 'some', 'any', 'much', 'many', 'make', 'made', 'use', 'using',
]);

export const tokenize = (text: string) =>
    String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9₹\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));

const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, '');

/**
 * Explicit "get me a human" phrasing, checked BEFORE the fuzzy search. These
 * requests share common words ("order", "support") with the guides, so without
 * this the scorer answers "I want to talk to someone about my order" with a
 * tracking card instead of contact details.
 */
export const HUMAN_INTENT = /\b(talk|speak|chat|connect)\b.{0,20}\b(human|person|agent|someone|somebody|representative|support|care|team)\b|\bcustomer\s*(care|support)\b|\breal\s*(person|human)\b|\blive\s*(agent|chat)\b|\bhuman\s*support\b|\b(call|phone|email)\s*(you|support|someone)\b/i;

// A short "yes" answering the bot's own "Want our team's contact details?" —
// the bot shows a button, but people answer in text just as often, and that
// would otherwise fall into the matcher (which has no entry for "yes").
export const AFFIRMATIVE = /^\s*(y+e*s*|yeah|yep|yup|sure|ok(ay)?|k|please|pls|plz|ha+n?|go\s*ahead|do\s*it|connect\s*me)[\s.!]*$/i;

export const GREETING_RE = /^\s*(hi|hey|hello|yo|namaste|good\s*(morning|afternoon|evening))[\s.!]*$/i;
export const THANKS_RE = /\b(thanks|thank\s*you|thx|shukriya)\b/i;

export type IndexEntry = {
    kind: 'guide' | 'faq';
    title: string;
    answer: string;
    route?: string;
    routeLabel?: string;
    more: number;
    strong: string[];
    weak: string[];
};

export function buildIndex() {
    const entries: IndexEntry[] = [];

    for (const g of SUPPORT_GUIDES as SupportGuide[]) {
        entries.push({
            kind: 'guide',
            title: g.title,
            route: g.route,
            routeLabel: g.routeLabel,
            answer: g.steps.slice(0, 3).join(' '),
            more: g.steps.length > 3 ? g.steps.length - 3 : 0,
            strong: tokenize(`${g.title} ${g.summary}`).map(stem),
            weak: tokenize(g.steps.join(' ')).map(stem),
        });
    }

    for (const f of SUPPORT_FAQS as SupportFaq[]) {
        entries.push({
            kind: 'faq',
            title: f.q,
            answer: f.a,
            route: f.route,
            routeLabel: f.routeLabel,
            more: 0,
            strong: tokenize(f.q).map(stem),
            weak: tokenize(f.a).map(stem),
        });
    }

    // Words that appear in every entry ("order", "delivery") say nothing about
    // which entry is the right one — IDF is what stops them dominating.
    const df = new Map<string, number>();
    for (const e of entries) {
        for (const w of new Set([...e.strong, ...e.weak])) df.set(w, (df.get(w) || 0) + 1);
    }
    const n = entries.length;
    const idf = (w: string) => Math.log((n + 1) / ((df.get(w) || 0) + 1)) + 0.2;

    return { entries, idf };
}

const SYNONYMS: Record<string, string[]> = {
    money: ['refund', 'payment'], cash: ['cod', 'payment'], paid: ['payment'], pay: ['payment'],
    charge: ['payment'], upi: ['payment'], card: ['payment'], razorpay: ['payment'],
    parcel: ['order', 'delivery'], package: ['order', 'delivery'], item: ['product'], stuff: ['product'],
    courier: ['delivery', 'partner'], rider: ['delivery', 'partner'], boy: ['partner'],
    eta: ['delivery', 'time'], late: ['delivery'], slow: ['delivery'], arrive: ['delivery'],
    exchange: ['return'], replace: ['return'], send: ['return'], back: ['return'],
    cancel: ['cancellation'], scrap: ['cancellation'],
    coupon: ['discount'], promo: ['discount'], offer: ['discount'], voucher: ['discount'],
    size: ['size', 'chart'], fit: ['size'], measurement: ['size', 'chart'],
    colour: ['color', 'variant'], color: ['variant'], shade: ['variant'],
    pincode: ['address', 'pune'], area: ['address', 'pune'], location: ['address'],
    login: ['account', 'sign'], signin: ['account', 'sign'], otp: ['code', 'account'],
    password: ['account', 'sign'], delete: ['account'], deactivate: ['delete', 'account'],
    wishlist: ['product'], review: ['rating'], star: ['rating'],
    instant: ['instant', 'door'], try: ['door', 'instant'],
};

const expand = (words: string[]) => {
    const out = [...words];
    for (const w of words) for (const syn of SYNONYMS[w] || []) out.push(stem(syn));
    return out;
};

export function search({ entries, idf }: ReturnType<typeof buildIndex>, message: string) {
    const asked = tokenize(message).map(stem);
    if (!asked.length) return { best: null as IndexEntry | null, others: [] as IndexEntry[] };
    const words = new Set(expand(asked));

    const scored = entries
        .map(entry => {
            let score = 0;
            let strongHits = 0;
            for (const w of words) {
                if (entry.strong.includes(w)) { score += 3 * idf(w); strongHits += 1; }
                else if (entry.weak.includes(w)) { score += 1 * idf(w); }
            }
            return { entry, score, strongHits };
        })
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score);

    const top = scored[0];
    // Confidence floor: a hit on body text alone is usually a coincidence, and
    // a confidently wrong answer is worse than handing over to a person.
    if (!top || (top.strongHits === 0 && top.score < 2.5)) return { best: null, others: [] };

    return {
        best: top.entry,
        others: scored.slice(1, 4).filter(r => r.score >= top.score * 0.45).map(r => r.entry),
    };
}

