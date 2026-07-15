// Category artwork is hosted on Cloudinary and addressed by the CategoryNode id,
// so no per-node URL table has to be maintained here — upload `<id>.jpg` into the
// `zpin/categories` folder and the circle picks it up. Anything not uploaded 404s
// and the UI falls back to the name initial.
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() || '';

// f_auto/q_auto let Cloudinary pick format + compression; g_auto crops to the subject.
export const categoryImageUrl = (id: string, size: number): string | null =>
    CLOUD_NAME
        ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,g_auto,w_${size},h_${size}/zpin/categories/${id}`
        : null;
