import { v2 as cloudinary } from 'cloudinary';

// Same Cloudinary account the vendor backend and the category artwork already use
// (cloud `ikzlnocp`). Config is applied lazily so importing this module can't
// crash boot when the credentials aren't set — isConfigured() is the runtime gate.
export const isConfigured = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

// One folder per reviewer, kept apart from zpin/vendor/* and zpin/categories.
export const REVIEW_FOLDER = (userId: string) => `zpin/reviews/${userId}`;

/**
 * Upload one in-memory buffer. Resolves to the delivery URL.
 * Copied from ZPinVendorApp/backend/src/config/cloudinary.js (uploadTo) so both
 * backends store images the same way.
 */
export const uploadReviewImage = (buffer: Buffer, userId: string): Promise<string> =>
  new Promise((resolve, reject) => {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: REVIEW_FOLDER(userId),
        resource_type: 'image',
        public_id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
      (err, result) => (err || !result ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });
