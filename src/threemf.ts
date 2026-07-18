import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import type { Mesh } from 'manifold-3d';

export type ThreeMfPart = { name: string; color: string; mesh: Mesh };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** 4 ספרות אחרי הנקודה = דיוק של 0.1 מיקרון, בלי אפסים מיותרים בקובץ. */
const num = (n: number) => {
  const s = n.toFixed(4);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
};

function meshXml(mesh: Mesh) {
  if (mesh.numProp !== 3) throw new Error(`numProp לא צפוי: ${mesh.numProp}`);
  const { vertProperties: v, triVerts: t } = mesh;
  const out: string[] = ['<mesh><vertices>'];
  for (let i = 0; i < v.length; i += 3) {
    out.push(`<vertex x="${num(v[i])}" y="${num(v[i + 1])}" z="${num(v[i + 2])}"/>`);
  }
  out.push('</vertices><triangles>');
  for (let i = 0; i < t.length; i += 3) {
    out.push(`<triangle v1="${t[i]}" v2="${t[i + 1]}" v3="${t[i + 2]}"/>`);
  }
  out.push('</triangles></mesh>');
  return out.join('');
}

/**
 * 3MF יחיד שבו כל חלק הוא אובייקט נפרד עם צבע ברירת מחדל משלו, וכולם
 * מקובצים תחת אובייקט-אב אחד דרך <components>. ככה סלייסרים (Bambu Studio,
 * OrcaSlicer, PrusaSlicer) טוענים את זה כאובייקט אחד עם כמה חלקים במקום
 * כמה אובייקטים מפוזרים על המשטח — וזו כל הנקודה מול ייצוא STL מרובה.
 */
export function toThreeMf(parts: ThreeMfPart[], title: string): Uint8Array<ArrayBuffer> {
  const FIRST = 2; // 1 שמור ל-basematerials
  const materials = parts
    .map((p) => `<base name="${esc(p.name)}" displaycolor="${p.color.toUpperCase()}FF"/>`)
    .join('');
  const objects = parts
    .map((p, i) => `<object id="${FIRST + i}" name="${esc(p.name)}" type="model" pid="1" pindex="${i}">${meshXml(p.mesh)}</object>`)
    .join('');
  const groupId = FIRST + parts.length;
  const components = parts.map((_, i) => `<component objectid="${FIRST + i}"/>`).join('');

  const model =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<model unit="millimeter" xml:lang="he-IL" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">` +
    `<metadata name="Title">${esc(title)}</metadata>` +
    `<metadata name="Application">keychain-gen</metadata>` +
    `<resources><basematerials id="1">${materials}</basematerials>${objects}` +
    `<object id="${groupId}" name="${esc(title)}" type="model"><components>${components}</components></object>` +
    `</resources><build><item objectid="${groupId}"/></build></model>`;

  return zipSync({
    '[Content_Types].xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>` +
      `</Types>`),
    '_rels/.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rel0" Target="/3D/3dmodel.model" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>` +
      `</Relationships>`),
    '3D/3dmodel.model': strToU8(model),
  }, { level: 6 }) as Uint8Array<ArrayBuffer>;
}

/** מפרק 3MF שיוצר כאן ומוודא שהמבנה שלם ושכל אינדקס משולש בתחום. */
export function checkThreeMf(zip: Uint8Array, expectParts: number) {
  const files = unzipSync(zip);
  for (const need of ['[Content_Types].xml', '_rels/.rels', '3D/3dmodel.model']) {
    if (!files[need]) return { ok: false, reason: `חסר ${need}` };
  }
  const xml = strFromU8(files['3D/3dmodel.model']);
  const meshObjects = xml.match(/<object [^>]*pindex=/g)?.length ?? 0;
  if (meshObjects !== expectParts) return { ok: false, reason: `${meshObjects} אובייקטים במקום ${expectParts}` };
  if (!/<components>/.test(xml)) return { ok: false, reason: 'אין אובייקט-אב שמקבץ את החלקים' };
  if ((xml.match(/<item /g)?.length ?? 0) !== 1) return { ok: false, reason: 'ה-build אמור להכיל פריט אחד' };

  // לכל אובייקט: כל אינדקס משולש חייב להצביע על קודקוד קיים
  for (const obj of xml.match(/<object [^>]*pindex=[\s\S]*?<\/object>/g) ?? []) {
    const nVerts = obj.match(/<vertex /g)?.length ?? 0;
    let maxIdx = -1;
    for (const m of obj.matchAll(/v[123]="(\d+)"/g)) maxIdx = Math.max(maxIdx, +m[1]);
    if (nVerts === 0 || maxIdx >= nVerts) return { ok: false, reason: `אינדקס ${maxIdx} מחוץ ל-${nVerts} קודקודים` };
  }
  return { ok: true, bytes: zip.length, reason: '' };
}
