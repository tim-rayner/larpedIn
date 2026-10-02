import { mkdir, copyFile, readFile } from 'node:fs/promises';
import sharp from 'sharp';
const iconNames = ['users-three','x','bookmark-simple','seal-check-fill','plus','globe-hemisphere-west','thumbs-up-fill','hands-clapping-fill','heart-fill','thumbs-up','chat-circle-text','arrows-clockwise','paper-plane-tilt','buildings','newspaper','calendar-blank','info','caret-down','puzzle-piece-fill','caret-right','arrow-right','dots-three','coffee','house-fill','briefcase','chat-circle-dots','bell','squares-four','magnifying-glass','image','article','arrow-up','pencil-simple','caret-up'];
await mkdir('public/assets/icons', {recursive:true});
for (const name of iconNames) {
 const filled = name.endsWith('-fill');
 await copyFile(`node_modules/@phosphor-icons/core/assets/${filled?'fill':'regular'}/${name}.svg`, `public/assets/icons/${name}.svg`);
}
await copyFile('node_modules/@phosphor-icons/core/LICENSE', 'public/assets/icons/LICENSE');
// Generated raster assets are already checked in. Optional replacement inputs:
// node scripts/assets.js /path/to/morning.png /path/to/portraits.png
if(process.argv[2]) await sharp(process.argv[2]).resize(960).webp({quality:78}).toFile('public/assets/morning.webp');
if(process.argv[3]) await sharp(process.argv[3]).resize(576).webp({quality:80}).toFile('public/assets/portraits.webp');
