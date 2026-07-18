// שולף את ה-dataURL מפלט ה-javascript_tool ושומר PNG:
//   node scripts/shot.mjs <result-file> <out.png>
import { writeFileSync, readFileSync } from 'node:fs';
const [src, out] = process.argv.slice(2);
const m = readFileSync(src, 'utf8').match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
if (!m) throw new Error('לא נמצא dataURL בקובץ');
writeFileSync(out, Buffer.from(m[1], 'base64'));
console.log(out);
