const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table implementation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = crc32(crcInput);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

const width = 400;
const height = 400;
// RGBA buffer: 4 bytes per pixel
const pixels = Buffer.alloc(width * height * 4);

function setPixel(x, y, r, g, b, a) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const idx = (y * width + x) * 4;
  pixels[idx] = r;
  pixels[idx + 1] = g;
  pixels[idx + 2] = b;
  pixels[idx + 3] = a;
}

function drawLine(x0, y0, x1, y1, r, g, b, a) {
  x0 = Math.round(x0); y0 = Math.round(y0);
  x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    setPixel(x0, y0, r, g, b, a);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

function drawCircle(cx, cy, radius, r, g, b, a) {
  for (let angle = 0; angle < 360; angle += 2) {
    const rad = (angle * Math.PI) / 180;
    const x = cx + radius * Math.cos(rad);
    const y = cy + radius * Math.sin(rad);
    setPixel(x, y, r, g, b, a);
  }
}

function drawRect(x, y, w, h, r, g, b, a) {
  drawLine(x, y, x + w, y, r, g, b, a);
  drawLine(x + w, y, x + w, y + h, r, g, b, a);
  drawLine(x + w, y + h, x, y + h, r, g, b, a);
  drawLine(x, y + h, x, y, r, g, b, a);
}

// Draw Doodles across the 400x400 canvas
const CR = 220, CG = 220, CB = 220, CA = 180;

// 1. Speech bubble at (40, 40)
drawRect(30, 30, 35, 22, CR, CG, CB, CA);
drawLine(30, 45, 20, 56, CR, CG, CB, CA);
drawLine(20, 56, 38, 52, CR, CG, CB, CA);

// 2. Clock at (140, 50)
drawCircle(140, 50, 16, CR, CG, CB, CA);
drawLine(140, 50, 140, 40, CR, CG, CB, CA);
drawLine(140, 50, 148, 50, CR, CG, CB, CA);

// 3. Heart at (240, 45)
drawCircle(235, 42, 7, CR, CG, CB, CA);
drawCircle(245, 42, 7, CR, CG, CB, CA);
drawLine(228, 45, 240, 58, CR, CG, CB, CA);
drawLine(252, 45, 240, 58, CR, CG, CB, CA);

// 4. Double tick at (340, 45)
drawLine(330, 45, 335, 52, CR, CG, CB, CA);
drawLine(335, 52, 345, 38, CR, CG, CB, CA);
drawLine(336, 45, 341, 52, CR, CG, CB, CA);
drawLine(341, 52, 351, 38, CR, CG, CB, CA);

// 5. Music Note at (60, 140)
drawCircle(55, 148, 5, CR, CG, CB, CA);
drawCircle(75, 142, 5, CR, CG, CB, CA);
drawLine(59, 147, 59, 125, CR, CG, CB, CA);
drawLine(79, 141, 79, 119, CR, CG, CB, CA);
drawLine(59, 125, 79, 119, CR, CG, CB, CA);

// 6. Camera at (160, 135)
drawRect(145, 130, 32, 22, CR, CG, CB, CA);
drawRect(153, 125, 16, 5, CR, CG, CB, CA);
drawCircle(161, 141, 6, CR, CG, CB, CA);

// 7. Coffee cup at (260, 140)
drawRect(250, 132, 22, 18, CR, CG, CB, CA);
drawCircle(273, 141, 5, CR, CG, CB, CA);
drawLine(255, 128, 257, 122, CR, CG, CB, CA);
drawLine(261, 128, 263, 122, CR, CG, CB, CA);

// 8. Search Magnifier at (350, 135)
drawCircle(345, 133, 9, CR, CG, CB, CA);
drawLine(352, 140, 362, 150, CR, CG, CB, CA);

// 9. Phone Receiver at (50, 230)
drawCircle(45, 225, 6, CR, CG, CB, CA);
drawCircle(65, 245, 6, CR, CG, CB, CA);
drawLine(45, 225, 55, 228, CR, CG, CB, CA);
drawLine(55, 228, 62, 235, CR, CG, CB, CA);
drawLine(62, 235, 65, 245, CR, CG, CB, CA);

// 10. Star at (150, 230)
for (let i = 0; i < 5; i++) {
  const a1 = (i * 72 - 18) * Math.PI / 180;
  const a2 = ((i + 2) * 72 - 18) * Math.PI / 180;
  drawLine(150 + 14 * Math.cos(a1), 230 + 14 * Math.sin(a1), 150 + 14 * Math.cos(a2), 230 + 14 * Math.sin(a2), CR, CG, CB, CA);
}

// 11. Lock at (250, 230)
drawRect(242, 228, 20, 16, CR, CG, CB, CA);
drawCircle(252, 224, 6, CR, CG, CB, CA);

// 12. Smiley at (345, 230)
drawCircle(345, 230, 14, CR, CG, CB, CA);
setPixel(340, 226, CR, CG, CB, CA);
setPixel(350, 226, CR, CG, CB, CA);
drawLine(339, 235, 345, 239, CR, CG, CB, CA);
drawLine(345, 239, 351, 235, CR, CG, CB, CA);

// 13. Message envelope at (60, 330)
drawRect(45, 320, 30, 20, CR, CG, CB, CA);
drawLine(45, 320, 60, 332, CR, CG, CB, CA);
drawLine(75, 320, 60, 332, CR, CG, CB, CA);

// 14. Location pin at (160, 330)
drawCircle(160, 324, 7, CR, CG, CB, CA);
drawLine(154, 326, 160, 339, CR, CG, CB, CA);
drawLine(166, 326, 160, 339, CR, CG, CB, CA);

// 15. Microphone at (260, 330)
drawRect(256, 320, 8, 14, CR, CG, CB, CA);
drawCircle(260, 328, 7, CR, CG, CB, CA);
drawLine(260, 335, 260, 342, CR, CG, CB, CA);
drawLine(255, 342, 265, 342, CR, CG, CB, CA);

// 16. Paperclip at (350, 330)
drawLine(345, 325, 345, 340, CR, CG, CB, CA);
drawLine(345, 340, 352, 340, CR, CG, CB, CA);
drawLine(352, 340, 352, 322, CR, CG, CB, CA);
drawLine(352, 322, 348, 322, CR, CG, CB, CA);
drawLine(348, 322, 348, 336, CR, CG, CB, CA);

// Construct PNG scanlines with Filter type 0 (None)
const scanlines = Buffer.alloc(height * (1 + width * 4));
let scanIdx = 0;
for (let y = 0; y < height; y++) {
  scanlines[scanIdx++] = 0; // Filter None
  const rowStart = y * width * 4;
  pixels.copy(scanlines, scanIdx, rowStart, rowStart + width * 4);
  scanIdx += width * 4;
}

// Compress scanlines with deflate
const compressedData = zlib.deflateSync(scanlines);

// IHDR chunk
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA color type
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ihdrChunk = makeChunk('IHDR', ihdr);
const idatChunk = makeChunk('IDAT', compressedData);
const iendChunk = makeChunk('IEND', Buffer.alloc(0));

const finalPng = Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);

const outDir = path.join(__dirname, '..', 'web', 'public', 'patterns');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'doodle-bg.png');
fs.writeFileSync(outFile, finalPng);

console.log(`Generated valid doodle PNG: ${outFile} (${finalPng.length} bytes)`);
