import { zipSync } from 'fflate';
import type { Mesh } from 'manifold-3d';

/**
 * Mesh של manifold → STL בינארי (מ"מ, Z למעלה — כמו שסלייסרים מצפים).
 * ponytail: 25 שורות במקום STLExporter של three, וכך אותו קוד ייצוא רץ גם
 * בדפדפן וגם בבדיקות ב-node.
 */
export function toStl(mesh: Mesh): ArrayBuffer {
  if (mesh.numProp !== 3) throw new Error(`numProp לא צפוי: ${mesh.numProp}`);
  const { vertProperties: v, triVerts: t } = mesh;
  const tris = t.length / 3;
  const buf = new ArrayBuffer(84 + tris * 50);
  const dv = new DataView(buf);
  dv.setUint32(80, tris, true);

  for (let i = 0; i < tris; i++) {
    const a = t[i * 3] * 3, b = t[i * 3 + 1] * 3, c = t[i * 3 + 2] * 3;
    const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2];
    const wx = v[c] - v[a], wy = v[c + 1] - v[a + 1], wz = v[c + 2] - v[a + 2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;

    let o = 84 + i * 50;
    for (const f of [nx, ny, nz, v[a], v[a + 1], v[a + 2], v[b], v[b + 1], v[b + 2], v[c], v[c + 1], v[c + 2]]) {
      dv.setFloat32(o, f, true);
      o += 4;
    }
  }
  return buf;
}

/**
 * כל ה-STL-ים בקובץ ZIP אחד. מי שרוצה STL ולא 3MF עדיין אמור לקבל הורדה
 * אחת, לא שלוש — הורדות מרובות זה מה שהדפדפן חוסם וזה מה שמעצבן בסלייסר.
 */
export function toStlZip(parts: Array<{ filename: string; mesh: Mesh }>): Uint8Array<ArrayBuffer> {
  const files: Record<string, Uint8Array> = {};
  for (const p of parts) files[p.filename] = new Uint8Array(toStl(p.mesh));
  return zipSync(files, { level: 6 }) as Uint8Array<ArrayBuffer>;
}

/** בדיקת watertight: כל צלע חייבת להופיע פעמיים, בכיוונים הפוכים. */
export function checkStl(buf: ArrayBuffer) {
  const dv = new DataView(buf);
  const tris = dv.getUint32(80, true);
  if (buf.byteLength !== 84 + tris * 50) return { ok: false, tris, reason: 'אורך הקובץ לא תואם למספר המשולשים' };

  const edges = new Map<string, number>();
  const key = (o: number) => `${dv.getFloat32(o, true)},${dv.getFloat32(o + 4, true)},${dv.getFloat32(o + 8, true)}`;
  for (let i = 0; i < tris; i++) {
    const o = 84 + i * 50 + 12;
    const p = [key(o), key(o + 12), key(o + 24)];
    for (let e = 0; e < 3; e++) {
      const from = p[e], to = p[(e + 1) % 3];
      const fwd = `${from}|${to}`, rev = `${to}|${from}`;
      if (edges.get(rev)) edges.set(rev, edges.get(rev)! - 1);
      else edges.set(fwd, (edges.get(fwd) ?? 0) + 1);
    }
  }
  let open = 0;
  for (const n of edges.values()) open += Math.abs(n);
  return { ok: open === 0, tris, open, reason: open ? `${open} צלעות פתוחות — הגוף אינו סגור` : '' };
}
