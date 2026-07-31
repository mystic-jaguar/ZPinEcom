/**
 * The one-line product detail shown directly under a product title (detail page
 * and every product tile). Stock state wins (it's the most actionable thing a
 * shopper can read), then an explicit subtitle, then the first sentence of the
 * description/details.
 *
 * Note: the `products` table has no subtitle/details column — those branches only
 * fire if a caller supplies them locally. In practice this resolves to the
 * stock lines or the description sentence.
 */
export function productOneLiner(p: {
    subtitle?: string | null;
    details?: string | null;
    description?: string | null;
    quantity?: number | null;
    inStock?: boolean | null;
} | null | undefined): string {
    if (!p) return '';

    if (p.inStock === false || p.quantity === 0) return 'Currently out of stock';
    if (typeof p.quantity === 'number' && p.quantity > 0 && p.quantity <= 5) {
        return `Only ${p.quantity} left`;
    }

    const text = p.subtitle || (p.details || p.description || '').split(/[.!?\n]/)[0] || '';
    // Seed rows carry a "[BULK-SEED] " prefix that must never reach a customer.
    return text.replace(/^\s*\[BULK-SEED\]\s*/, '').trim();
}
