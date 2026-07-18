import Module from 'manifold-3d';
import type { CrossSection, Manifold, ManifoldToplevel, Mesh, Vec2 } from 'manifold-3d';
import opentype from 'opentype.js';
import { SHAPE_CP } from './shapes.ts';

export type Params = {
  text: string;
  fontSize: number;      // גודל גופן (em) במ"מ — קבוע, לא נגזר מאורך השם
  baseOffset: number;    // מרווח הבסיס סביב האותיות
  baseThickness: number;
  letterHeight: number;  // גובה בליטת האותיות מעל הבסיס
  cornerRadius: number;  // עיגול הפינות הקעורות של הבסיס
  frame: boolean;
  frameWidth: number;
  holeDia: number;
  ringWall: number;
  ringAngle: number;     // מעלות, 180 = שמאל, 0 = ימין
  minStroke: number;     // סף התרעה לעובי קו
  shape: string;         // מזהה צורה מ-SHAPES, או '' לבלי צורה
  shapeSize: number;     // גובה הצורה במ"מ
  shapeSide: 'left' | 'right';
};

export const DEFAULTS: Omit<Params, 'text'> = {
  fontSize: 20,
  baseOffset: 3,
  baseThickness: 1.6,
  letterHeight: 1,
  cornerRadius: 2,
  frame: false,
  frameWidth: 0.8,
  holeDia: 6,
  ringWall: 2,
  ringAngle: 0,          // ימין
  minStroke: 0.2,
  shape: '',
  shapeSize: 22,
  // בצד הנגדי ללולאה (ringAngle 0 = ימין), אחרת הלולאה נתלית מעבר לצורה
  // במקום מקצה השם והמחזיק יוצא לא מאוזן
  shapeSide: 'left',
};

export type PartName = 'base' | 'letters' | 'frame' | 'shape';
export type Part = { name: PartName; mesh: Mesh };
export type Result = {
  parts: Part[];
  warnings: string[];
  size: [number, number, number];  // מידות כוללות, כולל הלולאה
  nameWidth: number;               // רוחב הבסיס בלי הלולאה
  ring: Vec2;
  islands: number;                 // רכיבים נפרדים בבסיס אחרי הגישור (1 = תקין)
  bridge: number;                  // רדיוס הגישור שנדרש בפועל (מ"מ)
  baseGenus: number;               // מספר החורים החוצים בבסיס (1 = רק הלולאה)
};

let wasm: ManifoldToplevel | null = null;
export async function initManifold(wasmUrl?: string) {
  if (!wasm) {
    wasm = await Module(wasmUrl ? { locateFile: () => wasmUrl } : undefined);
    wasm.setup();
  }
  return wasm;
}

const RTL = /[֐-ࣿ]/;
// ponytail: whole-string reverse for RTL. Bidi runs (mixed "דני 2024") will
// order wrong — swap in a real bidi lib only if someone actually hits it.
const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
function reorder(text: string) {
  if (!RTL.test(text)) return text;
  return [...seg.segment(text)].map((s) => s.segment).reverse().join('');
}

/**
 * קווי מתאר של הטקסט → מצולעים שטוחים, ביחידות מ"מ, ציר Y כלפי מעלה.
 * ponytail: פריסת גליפים ידנית במקום font.getPath — ה-shaper של opentype.js
 * קורס על טבלאות GSUB מסוימות (SecularOne) וממילא איננו רוצים את ה-bidi שלו.
 * המחיר: אין ליגטורות/חלופות הקשריות. לשמות זה לא קריטי.
 */
function textPolygons(font: opentype.Font, text: string, fontSize: number): Vec2[][] {
  const scale = fontSize / font.unitsPerEm;
  const path = new opentype.Path();
  let pen = 0;
  let prev: opentype.Glyph | null = null;
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    if (prev) pen += font.getKerningValue(prev, g) * scale;
    path.extend(g.getPath(pen, 0, fontSize));
    pen += (g.advanceWidth ?? 0) * scale;
    prev = g;
  }
  return flattenPath(path);
}

/**
 * גליף בודד (אייקון) בגובה דיו נתון במ"מ. אותו מסלול בדיוק כמו אותיות —
 * הצורות הן פשוט גליפים מגופן אייקונים.
 */
function shapePolygons(font: opentype.Font, codepoint: number, inkHeight: number): Vec2[][] {
  const glyph = font.charToGlyph(String.fromCodePoint(codepoint));
  const probe = glyph.getPath(0, 0, 100).getBoundingBox();
  const h = probe.y2 - probe.y1;
  if (!(h > 0)) return [];
  return flattenPath(glyph.getPath(0, 0, (inkHeight / h) * 100));
}

/**
 * פרח פרוצדורלי: 6 עלי כותרת + מרכז, כעיגולים חופפים שה-NonZero מאחד.
 * ponytail: ל-Font Awesome Free אין גליף פרח, והחלופה הייתה גופן אייקונים שני
 * במשקל 348KB בשביל גליף אחד. הרדיוסים מכוילים כך שעלי הכותרת נשארים לובות
 * נפרדות (מרווח 0.10R ביניהן) ומתחברות רק דרך המרכז.
 */
function flowerPolygons(size: number): Vec2[][] {
  const R = size / 2;
  const circle = (cx: number, cy: number, rad: number): Vec2[] =>
    Array.from({ length: 48 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)] as Vec2;
    });
  const polys = [circle(0, 0, 0.45 * R)];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    polys.push(circle(0.7 * R * Math.cos(a), 0.7 * R * Math.sin(a), 0.3 * R));
  }
  return polys;
}

/** מתאר של opentype → מצולעים שטוחים, ביחידות מ"מ, ציר Y כלפי מעלה. */
function flattenPath(path: opentype.Path): Vec2[][] {
  const polys: Vec2[][] = [];
  let cur: Vec2[] = [];
  let px = 0, py = 0;
  const tol = 0.1; // מ"מ — סטיית מיתר מקסימלית בקירוב עקומות בזייה
  const push = (x: number, y: number) => cur.push([x, -y]); // opentype: Y כלפי מטה
  const steps = (len: number) => Math.min(32, Math.max(4, Math.ceil(len / tol)));
  const close = () => { if (cur.length > 2) polys.push(cur); cur = []; };

  for (const c of path.commands) {
    if (c.type === 'M') { close(); push(c.x, c.y); px = c.x; py = c.y; }
    else if (c.type === 'L') { push(c.x, c.y); px = c.x; py = c.y; }
    else if (c.type === 'Q') {
      const n = steps(Math.hypot(c.x1 - px, c.y1 - py) + Math.hypot(c.x - c.x1, c.y - c.y1));
      for (let i = 1; i <= n; i++) {
        const t = i / n, u = 1 - t;
        push(u * u * px + 2 * u * t * c.x1 + t * t * c.x, u * u * py + 2 * u * t * c.y1 + t * t * c.y);
      }
      px = c.x; py = c.y;
    } else if (c.type === 'C') {
      const n = steps(Math.hypot(c.x1 - px, c.y1 - py) + Math.hypot(c.x2 - c.x1, c.y2 - c.y1) + Math.hypot(c.x - c.x2, c.y - c.y2));
      for (let i = 1; i <= n; i++) {
        const t = i / n, u = 1 - t;
        push(
          u * u * u * px + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x,
          u * u * u * py + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y,
        );
      }
      px = c.x; py = c.y;
    } else if (c.type === 'Z') close();
  }
  close();
  return polys;
}

const signedArea = (c: Vec2[]) => {
  let a = 0;
  for (let i = 0, j = c.length - 1; i < c.length; j = i++) a += c[j][0] * c[i][1] - c[i][0] * c[j][1];
  return a / 2;
};

/**
 * ממלא כל חור פנימי בבסיס. הבסיס הוא לוחית גב — החור היחיד שצריך להיות בו
 * הוא של הלולאה, שנחתך בהמשך. בלי זה נשארים חורי סיכה בין מילים ופתחים
 * מתחת לחלל הפנימי של אותיות כמו ם ו-o.
 */
function fillHoles(M: ManifoldToplevel, cs: CrossSection) {
  const contours = cs.toPolygons();
  // כיוון הסיבוב של מתאר חיצוני נקבע לפי המתאר הגדול ביותר — עמיד לשינוי מוסכמה
  const biggest = contours.reduce((a, b) => (Math.abs(signedArea(b)) > Math.abs(signedArea(a)) ? b : a));
  const sign = Math.sign(signedArea(biggest));
  const outers = contours.filter((c) => Math.sign(signedArea(c)) === sign);
  return new M.CrossSection(outers, 'NonZero');
}

function countIslands(cs: CrossSection) {
  const parts = cs.decompose();
  const n = parts.length;
  for (const c of parts) c.delete();
  return n;
}

function bboxOf(polys: Vec2[][]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys) for (const [x, y] of p) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

export function buildKeychain(p: Params, fontBuf: ArrayBuffer, iconBuf?: ArrayBuffer): Result {
  const M = wasm;
  if (!M) throw new Error('initManifold() לא הופעל');
  const { CrossSection } = M;
  const warnings: string[] = [];
  const trash: Array<{ delete(): void }> = [];
  const keep = <T extends { delete(): void }>(o: T) => (trash.push(o), o);

  const font = opentype.parse(fontBuf);
  const text = reorder(p.text.trim().normalize('NFC'));
  if (!text) throw new Error('לא הוזן שם');
  for (const ch of text) {
    if (ch !== ' ' && font.charToGlyphIndex(ch) === 0) {
      warnings.push(`התו "${ch}" חסר בגופן הנבחר`);
    }
  }

  // גודל גופן קבוע, ולא מתיחה לאורך יעד. מתיחה לאורך קבוע נותנת לשם קצר
  // אותיות ענקיות ולשם ארוך אותיות זעירות (נמדד: פי 6 בין "Ji" ל-"Maximilian"),
  // וסדרת מחזיקים יוצאת לא אחידה. האורך בפועל נגזר מגודל הגופן.
  const polys = textPolygons(font, text, p.fontSize);
  if (!polys.length) throw new Error('לא נוצר מתאר לשם הזה');

  // מתאר האותיות. NonZero מאחד אוטומטית אותיות חופפות (קריטי לגופני script)
  // ומשאיר חורים פנימיים (o, ם) פתוחים.
  const letters2D = keep(keep(new CrossSection(polys, 'NonZero')).simplify(0.02));

  // צורה דקורטיבית לצד השם, בגובה שהמשתמש קבע וממורכזת אנכית מולו.
  let shape2D: CrossSection | null = null;
  if (p.shape) {
    const cp = SHAPE_CP.get(p.shape);
    if (p.shape !== 'flower' && !cp) warnings.push(`הצורה "${p.shape}" לא מוכרת`);
    else if (p.shape !== 'flower' && !iconBuf) warnings.push('גופן הצורות לא נטען');
    else {
      const raw = p.shape === 'flower'
        ? flowerPolygons(p.shapeSize)
        : shapePolygons(opentype.parse(iconBuf!), cp!, p.shapeSize);
      if (!raw.length) warnings.push('הצורה הנבחרת ריקה בגופן');
      else {
        const lb = bboxOf(polys), sb = bboxOf(raw);
        // המרווח נגזר ממרווח הבסיס, לא מגודל הצורה: הבסיס מתרחב baseOffset
        // לכל צד, אז מרווח קטן מ-2×baseOffset מתאחד מעצמו לגוף אחד רציף.
        // מרווח שנגזר מגודל הצורה הותיר צוואר ארוך ודחף את רדיוס הגישור ל-5.8
        // מ"מ, מה שניפח גם את הבסיס סביב האותיות.
        const gap = 1.6 * p.baseOffset;
        const dx = p.shapeSide === 'right' ? lb.x1 + gap - sb.x0 : lb.x0 - gap - sb.x1;
        const dy = (lb.y0 + lb.y1) / 2 - (sb.y0 + sb.y1) / 2;
        shape2D = keep(keep(new CrossSection(raw.map((c) => c.map(([x, y]) => [x + dx, y + dy] as Vec2)), 'NonZero')).simplify(0.02));
      }
    }
  }

  // צללית משותפת: הבסיס, המסגרת ובדיקת עובי הקו מתייחסים לשם ולצורה כיחידה
  // אחת, אחרת הבסיס לא היה עוטף את הצורה והיא הייתה מרחפת.
  const art2D = shape2D ? keep(letters2D.add(shape2D)) : letters2D;

  // בסיס: offset החוצה עם פינות מעוגלות. הרחבה ב-cornerRadius וכיווץ חזרה
  // מעגלת גם את הפינות הקעורות שבין האותיות (closing מורפולוגי).
  // closing מורפולוגי ברדיוס r: מעגל את הפינות הקעורות שבין האותיות וגם מגשר
  // על מרווחים צרים מ-2r. הרדיוס גדל עד שהבסיס הוא גוף אחד — בלי זה כל אות
  // בעברית, וכל נקודה מעל i, יוצאת אי נפרד ב-STL.
  const closing = (r: number) => {
    const grown = art2D.offset(p.baseOffset + r, 'Round', 2, 24);
    const shrunk = grown.offset(-r, 'Round', 2, 24);
    const out = shrunk.simplify(0.01);
    grown.delete();
    shrunk.delete();
    return out;
  };

  const capR = Math.max(6, 0.5 * bboxOf(polys).h);
  let bridge = Math.max(0, p.cornerRadius);
  let base2D = closing(bridge);
  let islands = countIslands(base2D);
  while (islands > 1 && bridge < capR) {
    bridge = Math.min(capR, bridge * 1.5 + 0.5);
    base2D.delete();
    base2D = closing(bridge);
    islands = countIslands(base2D);
  }
  keep(base2D);
  if (islands > 1) {
    warnings.push(`הבסיס מתפצל ל-${islands} חלקים נפרדים — הקטן את הרווח בין האותיות או הגדל את מרווח הבסיס`);
  }

  // הצמדת הלולאה: זזים פנימה לאורך הזווית עד שהחפיפה עם הבסיס מספיקה.
  // ponytail: סריקה לינארית בצעדי 0.5 מ"מ — עשרות בוליאנים זעירים, מהיר דיו.
  const outerR = p.holeDia / 2 + p.ringWall;
  const b = base2D.bounds();
  const cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2;
  const a = (p.ringAngle * Math.PI) / 180;
  const dx = Math.cos(a), dy = Math.sin(a);
  const wantArea = 0.18 * Math.PI * outerR * outerR;
  let ring: Vec2 = [cx, cy];
  for (let t = Math.hypot(b.max[0] - cx, b.max[1] - cy) + outerR; t > 0; t -= 0.5) {
    const at: Vec2 = [cx + dx * t, cy + dy * t];
    const disk = CrossSection.circle(outerR, 64).translate(at);
    const overlap = base2D.intersect(disk);
    const hit = overlap.area();
    disk.delete();
    overlap.delete();
    ring = at;
    if (hit >= wantArea) break;
  }

  // חלק 1 — בסיס + לולאה כמקשה אחת. איחוד דו-ממדי לפני ה-extrude:
  // שני הגופים קופלנריים ובאותו גובה, אז זה שקול ל-union תלת-ממדי אבל
  // מבטיח manifold בלי בוליאן תלת-ממדי.
  // סתימת החורים אחרי איחוד הלולאה: כך נסגרים גם חורי סיכה בין מילים, גם
  // החלל מתחת לחלל הפנימי של אותיות, וגם הסהר שנוצר כשהדיסקה נוגעת בבסיס
  // בשתי נקודות. החור היחיד שנשאר הוא זה שנחתך מיד אחר כך.
  const hole = keep(CrossSection.circle(p.holeDia / 2, 64).translate(ring));
  const withRing = keep(base2D.add(keep(CrossSection.circle(outerR, 64).translate(ring))));
  const plate = keep(fillHoles(M, withRing));
  const base3D = keep(keep(plate.subtract(hole)).extrude(p.baseThickness));

  // חלק 2 — אותיות, יושבות על פני הבסיס
  const letters3D = keep(keep(letters2D.extrude(p.letterHeight)).translate(0, 0, p.baseThickness));

  const parts: Array<{ name: PartName; solid: Manifold }> = [
    { name: 'base', solid: base3D },
    { name: 'letters', solid: letters3D },
  ];

  // הצורה היא חלק נפרד — כדי שאפשר יהיה להדפיס אותה בצבע משלה (לב אדום
  // ליד שם כתום). היא נוסעת דרך אותו מערך parts, אז ה-3MF, ה-STL והתצוגה
  // מקבלים אותה בלי שינוי.
  if (shape2D) {
    parts.push({ name: 'shape', solid: keep(keep(shape2D.extrude(p.letterHeight)).translate(0, 0, p.baseThickness)) });
  }

  // חלק 3 — מסגרת: טבעת דקה סביב כל אות
  if (p.frame) {
    if (p.frameWidth > p.baseOffset) warnings.push('רוחב המסגרת גדול ממרווח הבסיס — היא תחרוג מהבסיס');
    const frame2D = keep(keep(art2D.offset(p.frameWidth, 'Round', 2, 24)).subtract(art2D));
    parts.push({ name: 'frame', solid: keep(keep(frame2D.extrude(p.letterHeight)).translate(0, 0, p.baseThickness)) });
  }

  // התרעת עובי קו: פתיחה מורפולוגית מוחקת כל מה שדק מ-minStroke
  const eroded = keep(art2D.offset(-p.minStroke / 2, 'Round', 2, 32));
  const opened = keep(eroded.offset(p.minStroke / 2, 'Round', 2, 32));
  const lost = 1 - opened.area() / art2D.area();
  if (lost > 0.06) {
    warnings.push(`חלקים מהאותיות דקים מ-${p.minStroke} מ"מ (${Math.round(lost * 100)}% מהשטח) — הגדל את הגופן או בחר גופן עבה יותר`);
  }

  // מרכוז — מוטבע בגיאומטריה כדי שקבצי ה-STL יישארו מיושרים זה לזה
  const bb = base3D.boundingBox();
  const shift: [number, number, number] = [-(bb.min[0] + bb.max[0]) / 2, -(bb.min[1] + bb.max[1]) / 2, 0];

  const out: Part[] = [];
  for (const { name, solid } of parts) {
    const centered = keep(solid.translate(shift));
    if (centered.status() !== 'NoError') warnings.push(`חלק "${name}" לא תקין: ${centered.status()}`);
    else if (centered.volume() <= 0) warnings.push(`חלק "${name}" ריק`);
    out.push({ name, mesh: centered.getMesh() });
  }

  const result: Result = {
    parts: out,
    warnings,
    size: [bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], p.baseThickness + p.letterHeight],
    nameWidth: b.max[0] - b.min[0],
    ring: [ring[0] + shift[0], ring[1] + shift[1]],
    islands,
    bridge,
    baseGenus: base3D.genus(),
  };
  for (const o of trash) o.delete();
  return result;
}
