// Generates PWA + favicon assets from scripts/icon-source.svg.
// Run with: npm run icons
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svg = readFileSync(join(__dirname, "icon-source.svg"));

mkdirSync(join(root, "public", "icons"), { recursive: true });

async function png(size, outPath) {
  await sharp(svg).resize(size, size).png().toFile(join(root, outPath));
  console.log("wrote", outPath, `${size}x${size}`);
}

/** Build a single-image .ico that wraps a PNG (widely supported). */
async function ico(size, outPath) {
  const pngBuffer = await sharp(svg).resize(size, size).png().toBuffer();
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // image size
  entry.writeUInt32LE(6 + 16, 12); // offset
  writeFileSync(join(root, outPath), Buffer.concat([header, entry, pngBuffer]));
  console.log("wrote", outPath, `${size}x${size} ico`);
}

await png(192, "public/icons/icon-192.png");
await png(512, "public/icons/icon-512.png");
await png(180, "public/apple-touch-icon.png");
await ico(48, "public/favicon.ico");

console.log("All icons generated.");
