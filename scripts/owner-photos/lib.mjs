// Pure helper functions for the owner-photos ingest pipeline: no network, no
// filesystem I/O. `processImage` is the one exception that touches `sharp`
// (an image-processing library, not network/disk I/O against our own state),
// since the spec calls for it to live here.
import sharp from 'sharp';
import { createHash } from 'node:crypto';

/**
 * Compute a 64-bit difference hash (dHash) from raw greyscale pixel data.
 *
 * `pixels` must contain exactly `width * height` bytes (one greyscale byte
 * per pixel), row-major. The standard dHash algorithm expects a 9x8 greyscale
 * grid (9 wide, 8 tall) so each of the 8 rows yields 8 left/right
 * comparisons = 64 bits total.
 *
 * Returns a 16-character lowercase hex string.
 */
export function dhashFromGrey(pixels, width, height) {
  if (width < 2 || height < 1) {
    throw new Error('dhashFromGrey requires width >= 2 and height >= 1');
  }
  if (pixels.length < width * height) {
    throw new Error('pixel buffer smaller than width*height');
  }

  const bitsNeeded = (width - 1) * height;
  const bytesNeeded = Math.ceil(bitsNeeded / 8);
  const out = Buffer.alloc(bytesNeeded);

  let bitIndex = 0;
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width - 1; x++) {
      const left = pixels[rowOffset + x];
      const right = pixels[rowOffset + x + 1];
      const bit = left > right ? 1 : 0;
      if (bit) {
        const byteIdx = bitIndex >> 3;
        const bitOffset = 7 - (bitIndex & 7);
        out[byteIdx] |= 1 << bitOffset;
      }
      bitIndex++;
    }
  }

  // Pack into exactly 64 bits / 16 hex chars regardless of grid shape, by
  // truncating/padding — but for the canonical 9x8 grid bitsNeeded is
  // exactly 64, so this is a no-op in the standard case.
  const hex = out.toString('hex');
  if (hex.length === 16) return hex;
  if (hex.length > 16) return hex.slice(0, 16);
  return hex.padEnd(16, '0');
}

/**
 * Compute a 64-bit dHash (as 16 lowercase hex chars) directly from an input
 * image buffer using sharp: resize to a 9x8 greyscale grid, then run the
 * difference-hash comparison across each row.
 */
export async function dhash(inputBuffer) {
  const { data, info } = await sharp(inputBuffer)
    .rotate()
    .greyscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return dhashFromGrey(data, info.width, info.height);
}

/**
 * Hamming distance between two 16-hex-char dHash strings. Reimplemented
 * independently of the server (which this script cannot import, being a
 * separate TS codebase) but uses the same bit-popcount semantics.
 */
export function hamming(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    throw new Error('hamming() requires two equal-length hex strings');
  }
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    const na = parseInt(a[i], 16);
    const nb = parseInt(b[i], 16);
    if (Number.isNaN(na) || Number.isNaN(nb)) {
      throw new Error('hamming() requires valid hex strings');
    }
    let xor = na ^ nb;
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

const NEAR_DUP_THRESHOLD = 6;

/** True if two dHash strings are the same image or a near-duplicate. */
export function isNearDuplicate(a, b, threshold = NEAR_DUP_THRESHOLD) {
  return hamming(a, b) <= threshold;
}

/**
 * Pure dedup classification: given a new photo's sha256 id + phash, the set
 * of known server ids, the list of known server phashes, and the list of
 * phashes already seen earlier in this batch, decide whether the photo is a
 * clean upload candidate, an exact duplicate, or a near-duplicate.
 *
 * Returns one of: 'ok' | 'duplicate' | 'near_duplicate'.
 */
export function classifyDedup({ sha256, phash, knownIds, knownPhashes, batchPhashes = [] }) {
  if (knownIds && knownIds.has(sha256)) return 'duplicate';
  for (const other of knownPhashes || []) {
    if (isNearDuplicate(phash, other)) return 'near_duplicate';
  }
  for (const other of batchPhashes) {
    if (isNearDuplicate(phash, other)) return 'near_duplicate';
  }
  return 'ok';
}

/**
 * Best-effort extraction of the EXIF DateTimeOriginal tag (0x9003, ASCII,
 * format "YYYY:MM:DD HH:MM:SS") from a raw EXIF buffer as returned by
 * sharp's `metadata().exif`. Returns a `YYYY-MM-DD` string, or null if it
 * can't be cheaply found. Never throws.
 */
export function extractTakenOn(exifBuffer) {
  try {
    if (!exifBuffer || exifBuffer.length < 12) return null;

    // EXIF buffer starts with "Exif\0\0" followed by a TIFF header.
    let offset = 0;
    if (
      exifBuffer.length > 6 &&
      exifBuffer[0] === 0x45 &&
      exifBuffer[1] === 0x78 &&
      exifBuffer[2] === 0x69 &&
      exifBuffer[3] === 0x66
    ) {
      offset = 6;
    }

    const tiffStart = offset;
    const byteOrderMark = exifBuffer.toString('ascii', tiffStart, tiffStart + 2);
    const little = byteOrderMark === 'II';
    if (!little && byteOrderMark !== 'MM') return null;

    const readU16 = (o) => (little ? exifBuffer.readUInt16LE(o) : exifBuffer.readUInt16BE(o));
    const readU32 = (o) => (little ? exifBuffer.readUInt32LE(o) : exifBuffer.readUInt32BE(o));

    const ifd0Offset = tiffStart + readU32(tiffStart + 4);

    const dateStr = findAsciiTagInIfd(exifBuffer, tiffStart, ifd0Offset, little, readU16, readU32, {
      targetTag: 0x9003, // DateTimeOriginal, lives in the Exif sub-IFD
      subIfdTag: 0x8769, // pointer to Exif sub-IFD from IFD0
    });

    if (!dateStr) return null;

    // Format is "YYYY:MM:DD HH:MM:SS" -> take date portion, convert ':' to '-'.
    const datePart = dateStr.slice(0, 10).replace(/:/g, '-');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
    return datePart;
  } catch {
    return null;
  }
}

// Walk IFD0 looking for either the target tag directly, or a pointer to a
// sub-IFD (e.g. the Exif IFD) which is then walked for the target tag.
function findAsciiTagInIfd(buf, tiffStart, ifdOffset, little, readU16, readU32, { targetTag, subIfdTag }) {
  if (ifdOffset + 2 > buf.length) return null;
  const numEntries = readU16(ifdOffset);
  let subIfdPointer = null;
  let directValue = null;

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    if (entryOffset + 12 > buf.length) break;
    const tag = readU16(entryOffset);
    const type = readU16(entryOffset + 2);
    const count = readU32(entryOffset + 4);

    if (tag === subIfdTag) {
      subIfdPointer = tiffStart + readU32(entryOffset + 8);
    }

    if (tag === targetTag && type === 2 /* ASCII */) {
      // ASCII values <=4 bytes are stored inline; longer values are
      // referenced via an offset into the buffer.
      const byteLen = count;
      let valueOffset;
      if (byteLen <= 4) {
        valueOffset = entryOffset + 8;
      } else {
        valueOffset = tiffStart + readU32(entryOffset + 8);
      }
      if (valueOffset + byteLen <= buf.length) {
        directValue = buf.toString('ascii', valueOffset, valueOffset + byteLen).replace(/\0+$/, '');
      }
    }
  }

  if (directValue) return directValue;
  if (subIfdPointer != null) {
    return findAsciiTagInIfd(buf, tiffStart, subIfdPointer, little, readU16, readU32, { targetTag, subIfdTag: -1 });
  }
  return null;
}

/**
 * Process a raw input image buffer into the normalized, metadata-stripped
 * upload payload: EXIF-orientation-corrected, resized to fit within
 * 2400x2400 without enlarging, re-encoded as quality-82 mozjpeg, with its
 * dHash and sha256 computed from the *output* bytes, and (best-effort) the
 * capture date extracted from the *original* EXIF before it's discarded.
 *
 * Returns { bytes, width, height, takenOn, phash, sha256 }.
 */
export async function processImage(inputBuffer) {
  let takenOn = null;
  try {
    const inputMeta = await sharp(inputBuffer).metadata();
    takenOn = extractTakenOn(inputMeta.exif);
  } catch {
    takenOn = null;
  }

  // `.rotate()` bakes in EXIF orientation. No `.withMetadata()` /
  // `.keepExif()` call: sharp strips EXIF/GPS/XMP/ICC (beyond a minimal
  // sRGB profile) from the output by default.
  const pipeline = sharp(inputBuffer)
    .rotate()
    .resize(2400, 2400, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true });

  const { data: bytes, info } = await pipeline.toBuffer({ resolveWithObject: true });

  const phash = await dhash(bytes);
  const sha256 = createHash('sha256').update(bytes).digest('hex');

  return {
    bytes,
    width: info.width,
    height: info.height,
    takenOn,
    phash,
    sha256,
  };
}
