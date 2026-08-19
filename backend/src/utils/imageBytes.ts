/**
 * Is this buffer actually an image?
 *
 * Ported verbatim from ZPinVendorApp/backend/src/utils/imageBytes.js — multer's
 * `fileFilter` only sees the client's own Content-Type header, which is forgeable,
 * so the bytes are checked after the file has been buffered.
 */
const SIGNATURES = [
  [0xff, 0xd8, 0xff],                                // JPEG
  [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],  // PNG
  [0x47, 0x49, 0x46, 0x38],                          // GIF87a / GIF89a
  [0x42, 0x4d],                                      // BMP
];

export const looksLikeImage = (buf: Buffer): boolean => {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return false;
  if (SIGNATURES.some((sig) => sig.every((byte, i) => buf[i] === byte))) return true;
  // WebP is RIFF-framed: the format tag sits at offset 8, after the 4-byte length.
  return buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
};
