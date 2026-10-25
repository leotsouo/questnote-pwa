#!/usr/bin/env node
/** Write the iOS App icon (1024×1024, no alpha channel) from the brand master icon. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'assets/brand/questnote-icon-master-1024.png');
const target = path.join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');

const image = sharp(source);
const { width, height, hasAlpha } = await image.metadata();
if (width !== 1024 || height !== 1024) throw new Error(`Master icon must be 1024×1024, got ${width}×${height}`);
// App Store Connect rejects icons with an alpha channel; flatten onto the icon's own corner colour.
const { data } = await sharp(source).extract({ left: 0, top: 0, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
await sharp(source).flatten({ background: { r: data[0], g: data[1], b: data[2] } }).removeAlpha().png().toFile(target);
const written = await sharp(target).metadata();
console.log(JSON.stringify({ source: path.relative(root, source), sourceHadAlpha: hasAlpha, target: path.relative(root, target),
  width: written.width, height: written.height, channels: written.channels }));
