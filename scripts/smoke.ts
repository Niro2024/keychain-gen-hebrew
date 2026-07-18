// בדיקת רגרסיה ללא UI:  node scripts/smoke.ts            → כל השמות
//                        node scripts/smoke.ts "André" Pacifico.ttf
import { readFileSync } from 'node:fs';
import assert from 'node:assert';
import { buildKeychain, initManifold, DEFAULTS } from '../src/geometry.ts';
import { toStl, checkStl } from '../src/stl.ts';
import { toThreeMf, checkThreeMf } from '../src/threemf.ts';
import { SHAPES } from '../src/shapes.ts';

const NAMES = ['Lucca', 'Aysha', 'Isaac', 'Lara', 'André', 'Diogo', 'Vasco', 'Olivia'];
const ICONS = 'FontAwesomeSolid.ttf';
const load = (f: string) => {
  const b = readFileSync(new URL(`../public/fonts/${f}`, import.meta.url));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};

await initManifold();
const [argName, argFont] = process.argv.slice(2);
const cases: Array<[string, string]> = argName
  ? [[argName, argFont ?? 'DancingScript.ttf']]
  : [...NAMES.map((n) => [n, 'DancingScript.ttf'] as [string, string]),
     ['Ji', 'DancingScript.ttf'],        // נקודה מעל i — אי נפרד בבסיס
     ['Bill', 'Caveat.ttf'],             // גופן שאותיותיו אינן נוגעות
     ['Ana Sofia', 'GreatVibes.ttf'],    // רווח + קווים דקים
     ['שלום', 'AmaticSC.ttf'],
     ['נירית שלי', 'SecularOne.ttf'],
     ['אבי ורונית', 'Rubik.ttf'],
     ['נועה', 'GveretLevin.ttf'],       // כתב יד עברי מחובר
     ['יהונתן', 'PlaypenHe700.ttf'],
     ['רוני', 'SuezOne.ttf']];

let bad = 0;
for (const [name, font] of cases) {
  const t = performance.now();
  const r = buildKeychain({ ...DEFAULTS, text: name, frame: true }, load(font));
  const ms = Math.round(performance.now() - t);
  const parts = r.parts.map((p) => `${p.name}:${p.mesh.triVerts.length / 3}t`).join(' ');
  const dims = `${r.size[0].toFixed(0)}×${r.size[1].toFixed(0)}mm`;
  console.log(`${name.padEnd(11)} ${font.padEnd(18)} ${String(ms).padStart(4)}ms ${dims.padEnd(9)} גשר=${r.bridge.toFixed(1).padEnd(4)} ${parts}`);
  for (const w of r.warnings) console.log(`   ⚠  ${w}`);

  // כל חלק חייב לצאת לא ריק, ולעבור מבדק watertight אחרי ייצוא ל-STL בפועל
  for (const p of r.parts) {
    assert.ok(p.mesh.triVerts.length > 0, `${name}/${p.name}: ריק`);
    const chk = checkStl(toStl(p.mesh));
    assert.ok(chk.ok, `${name}/${p.name}: ${chk.reason}`);
  }

  // ה-3MF חייב להיפתח חזרה למבנה שלם עם אותם חלקים ואינדקסים בתחום
  const mf = toThreeMf(r.parts.map((p) => ({ name: p.name, color: '#3A7BD5', mesh: p.mesh })), name);
  const mfChk = checkThreeMf(mf, r.parts.length);
  assert.ok(mfChk.ok, `${name}/3mf: ${mfChk.reason}`);
  assert.ok(r.nameWidth > 0 && Number.isFinite(r.nameWidth), `${name}: רוחב לא תקין`);
  assert.equal(r.islands, 1, `${name}: הבסיס אינו מקשה אחת`);
  assert.equal(r.baseGenus, 1, `${name}: לבסיס ${r.baseGenus} חורים במקום אחד (חור הלולאה)`);
  if (r.warnings.some((w) => w.includes('לא תקין') || w.includes('ריק'))) bad++;
}
// כל צורה בקטלוג חייבת לייצר גוף תקין ולהתאחד עם הבסיס לגוף אחד. כאן מתגלה
// גם איזו צורה דקה מדי להדפסה — הבדיקה רצה על הצללית המשותפת של שם+צורה.
if (!argName) {
  const f = load('SuezOne.ttf'), icons = load(ICONS);
  const thin: string[] = [];
  for (const s of SHAPES) {
    const r = buildKeychain({ ...DEFAULTS, text: 'נועה', shape: s.id }, f, icons);
    const part = r.parts.find((p) => p.name === 'shape');
    assert.ok(part, `${s.id}: לא נוצר חלק צורה`);
    assert.ok(checkStl(toStl(part.mesh)).ok, `${s.id}: הצורה אינה גוף סגור`);
    assert.equal(r.islands, 1, `${s.id}: הצורה לא מתחברת לבסיס`);
    assert.equal(r.baseGenus, 1, `${s.id}: לבסיס ${r.baseGenus} חורים`);
    if (r.warnings.some((w) => w.includes('דקים'))) thin.push(s.label);
  }
  console.log(`\nצורות: ${SHAPES.length} נבדקו, כולן סגורות ומחוברות`);
  if (thin.length) console.log(`   ⚠  דקות מדי בגודל ברירת המחדל: ${thin.join(', ')}`);
}

// גודל גופן קבוע ⇒ אורך השם לא משפיע על גובה האות. 'na'/'nananana' משתמשים
// באותן אותיות בדיוק, אז כל הפרש בגובה הוא סקיילינג לא רצוי.
if (!argName) {
  const f = load('DancingScript.ttf');
  const short = buildKeychain({ ...DEFAULTS, text: 'na' }, f);
  const long = buildKeychain({ ...DEFAULTS, text: 'nananana' }, f);
  const dh = Math.abs(short.size[1] - long.size[1]);
  console.log(`\nאחידות גודל: na=${short.nameWidth.toFixed(1)}מ"מ  nananana=${long.nameWidth.toFixed(1)}מ"מ  Δגובה=${dh.toFixed(3)}מ"מ`);
  assert.ok(dh < 0.01, `גובה האות משתנה לפי אורך השם (Δ=${dh})`);
  assert.ok(long.nameWidth > short.nameWidth * 2, 'שם ארוך פי 4 אמור לצאת רחב משמעותית');
}

console.log(bad ? `\n✗ ${bad} כשלים` : '\n✓ הכל תקין');
process.exit(bad ? 1 : 0);
