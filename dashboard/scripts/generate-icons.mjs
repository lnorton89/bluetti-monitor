import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const svgPath = resolve(root, "src", "assets", "bluetti-icon.svg");
const outDir = resolve(root, "..", "assets");

const svgContent = readFileSync(svgPath, "utf-8");

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const sizes = [16, 32, 48, 192, 256, 512];
const pngs = [];

for (const size of sizes) {
  const pngBuffer = await sharp(Buffer.from(svgContent), { density: 72 * 4 })
    .resize(size, size)
    .png()
    .toBuffer();

  const outPath = resolve(outDir, `icon-${size}.png`);
  writeFileSync(outPath, pngBuffer);
  console.log(`Wrote ${outPath} (${pngBuffer.length} bytes)`);

  pngs.push({ size, buffer: pngBuffer });
}

// Build ICO file with PNG data (supported since Windows Vista)
const iconCount = pngs.length;
const headerSize = 6;
const entrySize = 16;
const dirSize = headerSize + entrySize * iconCount;

let offset = dirSize;
const entries = [];

for (const png of pngs) {
  const w = png.size >= 256 ? 0 : png.size;
  const h = png.size >= 256 ? 0 : png.size;
  entries.push({ w, h, size: png.buffer.length, offset });
  offset += png.buffer.length;
}

const icoBuf = Buffer.alloc(offset);

// Header
icoBuf.writeUInt16LE(0, 0);  // reserved
icoBuf.writeUInt16LE(1, 2);  // type: 1 = ICO
icoBuf.writeUInt16LE(iconCount, 4); // image count

// Directory entries
for (let i = 0; i < iconCount; i++) {
  const off = headerSize + i * entrySize;
  icoBuf.writeUInt8(entries[i].w, off);
  icoBuf.writeUInt8(entries[i].h, off + 1);
  icoBuf.writeUInt8(0, off + 2);   // palette
  icoBuf.writeUInt8(0, off + 3);   // reserved
  icoBuf.writeUInt16LE(1, off + 4); // color planes
  icoBuf.writeUInt16LE(32, off + 6); // bpp
  icoBuf.writeUInt32LE(entries[i].size, off + 8);
 icoBuf.writeUInt32LE(entries[i].offset, off + 12);
}

// Image data
for (let i = 0; i < iconCount; i++) {
  pngs[i].buffer.copy(icoBuf, entries[i].offset);
}

const icoPath = resolve(outDir, "icon.ico");
writeFileSync(icoPath, icoBuf);
console.log(`Wrote ${icoPath} (${icoBuf.length} bytes)`);

// Copy the largest PNG as linux icon
const largePng = pngs.find(p => p.size === 256);
const linuxIconPath = resolve(outDir, "icon.png");
writeFileSync(linuxIconPath, largePng.buffer);
console.log(`Wrote ${linuxIconPath} (${largePng.buffer.length} bytes)`);
