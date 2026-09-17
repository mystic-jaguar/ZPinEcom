import { PixelRatio } from 'react-native';

// Category artwork is hosted on Cloudinary and addressed by the CategoryNode id,
// so no per-node URL table has to be maintained here — upload `<id>.jpg` into the
// `zpin/categories` folder and the circle picks it up. Anything not uploaded 404s
// and the UI falls back to the name initial.
// Hardcoded fallback — used when EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME is not baked into
// the build. Cloud-built OTA updates (eas update) and CI can't see the gitignored
// .env, so without this the var is empty there and every circle falls back to its
// initial. The cloud name is a public delivery identifier (it appears in every image
// URL), not a secret. Mirrors the PRODUCTION_API_URL fallback in services/api.ts.
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() || 'ikzlnocp';

// Some CategoryNode ids carry '&' or '/' (e.g. 'hc-shampoo-&-conditioner',
// 'bag-travel/gym-bags') which can't be a filename. Slug to [a-z0-9-] so the
// upload name is typeable; verified collision-free across all 197 circles.
const slug = (id: string) => id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// f_auto/q_auto let Cloudinary pick format + compression; g_auto crops to the subject.
export const categoryImageUrl = (id: string, size: number): string | null =>
    CLOUD_NAME
        ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,g_auto,w_${size},h_${size}/zpin/categories/${slug(id)}`
        : null;

// Seller/admin uploads are full camera originals (often 1-4MB). Ask Cloudinary for a
// copy no wider than the box (dp x pixel ratio); c_limit keeps aspect and never upscales,
// so contentFit="cover" still crops client-side exactly as before. Non-Cloudinary URIs,
// require() assets and nullish values pass through untouched.
export const cldImage = <T,>(src: T, dpWidth: number): T => {
    if (typeof src !== 'string' || !src.includes('res.cloudinary.com/') || !src.includes('/upload/')) return src;
    const w = Math.min(2000, Math.round(dpWidth * PixelRatio.get()));
    return src.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${w}/`) as T;
};
