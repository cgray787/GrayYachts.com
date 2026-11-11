import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { dhash, hamming, isNearDuplicate, classifyDedup, processImage, extractTakenOn } from './lib.mjs';

function solidJpeg(width, height, rgb, extra = {}) {
  let pipeline = sharp({
    create: { width, height, channels: 3, background: rgb },
  }).jpeg(extra.jpeg);
  if (extra.exif) pipeline = pipeline.withExif(extra.exif);
  return pipeline.toBuffer();
}

async function checkerboardJpeg(width, height, cell = 4) {
  const channels = 3;
  const buf = Buffer.alloc(width * height * channels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const on = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 === 0;
      const value = on ? 240 : 10;
      const idx = (y * width + x) * channels;
      buf[idx] = value;
      buf[idx + 1] = value;
      buf[idx + 2] = value;
    }
  }
  return sharp(buf, { raw: { width, height, channels } }).jpeg().toBuffer();
}

test('dhash + hamming: recompressed/resized copy of the same image is a near-duplicate', async () => {
  const original = await solidJpeg(200, 150, { r: 180, g: 90, b: 40 });
  // Simulate a copy that went through re-processing: resize + recompress.
  const resized = await sharp(original).resize(180, 135).jpeg({ quality: 70 }).toBuffer();

  const hashA = await dhash(original);
  const hashB = await dhash(resized);

  assert.equal(hashA.length, 16);
  assert.equal(hashB.length, 16);
  assert.ok(/^[0-9a-f]{16}$/.test(hashA));

  const distance = hamming(hashA, hashB);
  assert.ok(distance <= 6, `expected near-duplicate (distance<=6), got ${distance}`);
  assert.ok(isNearDuplicate(hashA, hashB));
});

test('dhash + hamming: a clearly different image is NOT a near-duplicate', async () => {
  const solid = await solidJpeg(200, 150, { r: 20, g: 20, b: 200 });
  const checkerboard = await checkerboardJpeg(200, 150, 10);

  const hashA = await dhash(solid);
  const hashB = await dhash(checkerboard);

  const distance = hamming(hashA, hashB);
  assert.ok(distance > 6, `expected distinct images (distance>6), got ${distance}`);
  assert.ok(!isNearDuplicate(hashA, hashB));
});

test('hamming: identical hashes have distance 0', () => {
  assert.equal(hamming('abcdef0123456789', 'abcdef0123456789'), 0);
});

test('hamming: known bit differences are counted correctly', () => {
  // '0' vs '1' differ by one bit (0001), '0' vs 'f' differ by all 4 bits.
  assert.equal(hamming('0000000000000000', '1000000000000000'), 1);
  assert.equal(hamming('0000000000000000', 'f000000000000000'), 4);
});

test('processImage strips EXIF/GPS metadata from the output', async () => {
  const input = await solidJpeg(100, 100, { r: 10, g: 200, b: 60 }, {
    exif: {
      IFD0: { Make: 'TestCam', DateTimeOriginal: '2026:03:15 10:00:00' },
      GPS: { GPSLatitude: '34,0,0', GPSLongitude: '118,0,0' },
    },
  });

  // Sanity check the input really does carry EXIF before processing.
  const inputMeta = await sharp(input).metadata();
  assert.ok(inputMeta.exif, 'test input should carry EXIF before processing');

  const result = await processImage(input);
  const outputMeta = await sharp(result.bytes).metadata();

  assert.equal(outputMeta.exif, undefined, 'output must not carry EXIF data');
  assert.equal(outputMeta.icc, undefined, 'output must not carry a non-default ICC profile');
});

test('processImage extracts takenOn (date-only) from EXIF DateTimeOriginal before stripping', async () => {
  const input = await solidJpeg(100, 100, { r: 10, g: 200, b: 60 }, {
    exif: {
      IFD0: { DateTimeOriginal: '2026:03:15 10:00:00' },
    },
  });

  const result = await processImage(input);
  assert.equal(result.takenOn, '2026-03-15');
});

test('processImage returns takenOn=null when no EXIF date is present (does not error)', async () => {
  const input = await solidJpeg(100, 100, { r: 10, g: 200, b: 60 });
  const result = await processImage(input);
  assert.equal(result.takenOn, null);
});

test('extractTakenOn is defensive against garbage / missing input', () => {
  assert.equal(extractTakenOn(null), null);
  assert.equal(extractTakenOn(undefined), null);
  assert.equal(extractTakenOn(Buffer.from('not exif data')), null);
});

test('processImage downsizes an oversized image to fit within 2400x2400', async () => {
  const input = await solidJpeg(4000, 3000, { r: 100, g: 100, b: 100 });
  const result = await processImage(input);

  assert.ok(result.width <= 2400);
  assert.ok(result.height <= 2400);
  // Aspect ratio preserved (4000x3000 = 4:3) and it should have been scaled
  // down to exactly fit the longer side.
  assert.equal(result.width, 2400);
  assert.equal(result.height, 1800);
});

test('processImage does not enlarge a smaller image', async () => {
  const input = await solidJpeg(60, 40, { r: 5, g: 5, b: 5 });
  const result = await processImage(input);

  assert.equal(result.width, 60);
  assert.equal(result.height, 40);
});

test('processImage output is a valid, re-decodable JPEG with correct sha256/phash lengths', async () => {
  const input = await solidJpeg(100, 80, { r: 50, g: 150, b: 250 });
  const result = await processImage(input);

  const decoded = await sharp(result.bytes).metadata();
  assert.equal(decoded.format, 'jpeg');
  assert.equal(result.sha256.length, 64);
  assert.ok(/^[0-9a-f]{64}$/.test(result.sha256));
  assert.equal(result.phash.length, 16);
  assert.ok(/^[0-9a-f]{16}$/.test(result.phash));
});

test('classifyDedup: exact sha256 match against known server ids => duplicate', () => {
  const classification = classifyDedup({
    sha256: 'abc123',
    phash: '0000000000000000',
    knownIds: new Set(['abc123', 'def456']),
    knownPhashes: [],
    batchPhashes: [],
  });
  assert.equal(classification, 'duplicate');
});

test('classifyDedup: close phash against a known server phash => near_duplicate', () => {
  const classification = classifyDedup({
    sha256: 'newid',
    phash: '0000000000000000',
    knownIds: new Set(),
    knownPhashes: ['0000000000000001'], // hamming distance 1
    batchPhashes: [],
  });
  assert.equal(classification, 'near_duplicate');
});

test('classifyDedup: close phash against an earlier photo in the same batch => near_duplicate', () => {
  const classification = classifyDedup({
    sha256: 'newid2',
    phash: '0000000000000000',
    knownIds: new Set(),
    knownPhashes: [],
    batchPhashes: ['0000000000000003'], // hamming distance 2
  });
  assert.equal(classification, 'near_duplicate');
});

test('classifyDedup: distinct sha256 and far phash => ok (clean upload candidate)', () => {
  const classification = classifyDedup({
    sha256: 'uniqueid',
    phash: '0000000000000000',
    knownIds: new Set(['other1']),
    knownPhashes: ['ffffffffffffffff'], // hamming distance 64
    batchPhashes: ['f0f0f0f0f0f0f0f0'],
  });
  assert.equal(classification, 'ok');
});
