/**
 * The one-line product detail shown directly under a product title (detail page
 * and every product tile). Explicit subtitle wins; otherwise the first sentence
 * of the description/details.
 */
export function productOneLiner(p: {
    subtitle?: string | null;
    details?: string | null;
    description?: string | null;
} | null | undefined): string {
    if (!p) return '';
    return (p.subtitle || (p.details || p.description || '').split(/[.!?\n]/)[0] || '').trim();
}
