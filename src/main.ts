import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import { buildKeychain, initManifold, DEFAULTS, type Params, type PartName, type Result } from './geometry.ts';
import { toStl, toStlZip } from './stl.ts';
import { toThreeMf } from './threemf.ts';
import { FONTS, DEFAULT_FONT } from './fonts.ts';
import { SHAPES, ICON_FONT } from './shapes.ts';

const PART_LABEL: Record<PartName, string> = { base: 'בסיס', letters: 'אותיות', frame: 'מסגרת', shape: 'צורה' };
const PART_COLOR: Record<PartName, number> = { base: 0x3a7bd5, letters: 0xf6ad55, frame: 0xe2e8f0, shape: 0xe2565c };

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const statusEl = $('status'), warnEl = $('warnings'), exportsEl = $('exports');

// ---- תצוגה מקדימה ----------------------------------------------------------
const canvas = $<HTMLCanvasElement>('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x12151b);
const camera = new THREE.PerspectiveCamera(40, 1, 1, 2000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/** מרחיק את המצלמה כך שכל הדגם נכנס למסך. רק בבנייה הראשונה, כדי לא לאפס סיבוב. */
let framed = false;
function frameModel(r: Result) {
  if (framed) return;
  framed = true;
  const d = (Math.hypot(r.size[0], r.size[1]) / 2) / Math.tan((camera.fov * Math.PI) / 360) * 1.15;
  camera.position.set(0, d * 0.82, d * 0.57); // מבט מלמעלה, מוטה מעט כדי לראות את הבליטה
  controls.target.set(0, 0, 0);
  controls.update();
}
scene.add(new THREE.AmbientLight(0xffffff, 1.4));
const key = new THREE.DirectionalLight(0xffffff, 2.0);
key.position.set(-70, 120, 90);
const fill = new THREE.DirectionalLight(0x88aaff, 0.7);
fill.position.set(60, 40, -80);
scene.add(key, fill);
const group = new THREE.Group();
group.rotation.x = -Math.PI / 2; // manifold עובד ב-Z למעלה, three ב-Y למעלה
scene.add(group);

// רשת קנה מידה. אחרי הסיבוב תחתית המחזיק (z=0) נוחתת בדיוק על מישור ה-XZ
// של העולם, לכן הרשת יושבת שם — מוסטת טיפה מטה כדי למנוע z-fighting.
const GRID_MM = 10;
let grid: THREE.GridHelper | undefined;
function updateGrid(r: Result) {
  const span = Math.ceil((Math.max(r.size[0], r.size[1]) + 30) / (GRID_MM * 2)) * GRID_MM * 2;
  if (grid?.userData.span === span) return;
  if (grid) { scene.remove(grid); grid.geometry.dispose(); (grid.material as THREE.Material).dispose(); }
  grid = new THREE.GridHelper(span, span / GRID_MM, 0x55617a, 0x333a48);
  grid.position.y = -0.05;
  grid.userData.span = span;
  scene.add(grid);
}

// התאמת גודל בתוך לולאת הרינדור — שתי השוואות למסגרת, ותופס גם שינויי פריסה
// שקורים אחרי טעינת ה-CSS, בלי ResizeObserver.
function resize() {
  const { clientWidth: w, clientHeight: h } = canvas;
  if (!w || !h || (canvas.width === w * renderer.getPixelRatio() && canvas.height === h * renderer.getPixelRatio())) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
renderer.setAnimationLoop(() => { resize(); controls.update(); renderer.render(scene, camera); });

// hook לבדיקת רגרסיה חזותית אוטומטית: מאלץ פריים בודד גם בטאב מוסתר,
// שבו requestAnimationFrame לא רץ. יש לקרוא ל-toDataURL באותו tick.
// top=true נותן מבט-על אנכי, לשיפוט צורת המתאר בלי עיוות פרספקטיבה.
Object.assign(window, {
  __renderOnce: (top = false) => {
    resize();
    if (!top) return renderer.render(scene, camera);
    const saved = camera.position.clone();
    camera.position.set(0, saved.length(), 0.001);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    camera.position.copy(saved);
    camera.lookAt(0, 0, 0);
  },
});

// ---- פרמטרים ---------------------------------------------------------------
const NUM_IDS = ['fontSize', 'baseThickness', 'baseOffset', 'cornerRadius', 'letterHeight',
  'frameWidth', 'holeDia', 'ringWall', 'ringAngle', 'minStroke', 'shapeSize'] as const;

function readParams(): Params {
  const p = { ...DEFAULTS, text: $<HTMLInputElement>('text').value } as Params;
  for (const id of NUM_IDS) {
    const v = parseFloat($<HTMLInputElement>(id).value);
    if (Number.isFinite(v)) (p as Record<string, unknown>)[id] = v;
  }
  p.frame = $<HTMLInputElement>('frame').checked;
  p.shape = $<HTMLSelectElement>('shape').value;
  p.shapeSide = $<HTMLSelectElement>('shapeSide').value as Params['shapeSide'];
  return p;
}

function writeParams(p: Omit<Params, 'text'>) {
  for (const id of NUM_IDS) $<HTMLInputElement>(id).value = String(p[id]);
  $<HTMLInputElement>('frame').checked = p.frame;
  $<HTMLSelectElement>('shape').value = p.shape;
  $<HTMLSelectElement>('shapeSide').value = p.shapeSide;
}

// רשימת הצורות, מקובצת לפי נושא
const shapeSel = $<HTMLSelectElement>('shape');
shapeSel.append(new Option('ללא', ''));
for (const group of [...new Set(SHAPES.map((s) => s.group))]) {
  const g = document.createElement('optgroup');
  g.label = group;
  g.append(...SHAPES.filter((s) => s.group === group).map((s) => new Option(s.label, s.id)));
  shapeSel.append(g);
}

// ---- גופנים ----------------------------------------------------------------
const fontCache = new Map<string, Promise<ArrayBuffer>>();
function loadFont(file: string) {
  let f = fontCache.get(file);
  if (!f) {
    f = fetch(`${import.meta.env.BASE_URL}fonts/${file}`).then((r) => {
      if (!r.ok) throw new Error(`הגופן ${file} לא נטען`);
      return r.arrayBuffer();
    });
    fontCache.set(file, f);
  }
  return f;
}

// שתי קבוצות: רק חלק מהגופנים תומכים בעברית, וזה השיקול הראשון לשם עברי
const fontSel = $<HTMLSelectElement>('font');
for (const [label, he] of [['תומכים בעברית', true], ['לטיני בלבד', false]] as const) {
  const g = document.createElement('optgroup');
  g.label = label;
  g.append(...FONTS.filter((f) => f.he === he).map((f) => new Option(f.label, f.file, false, f.file === DEFAULT_FONT)));
  fontSel.append(g);
}

// ---- בנייה -----------------------------------------------------------------
const HEB = /[֐-׿]/;
let last: { result: Result; name: string } | null = null;
let seq = 0;

async function rebuild() {
  const my = ++seq;
  const params = readParams();
  if (!params.text.trim()) { statusEl.textContent = 'הקלד שם כדי להתחיל'; return; }

  const file = fontSel.value;
  if (HEB.test(params.text) && !FONTS.find((f) => f.file === file)?.he) {
    warnEl.innerHTML = '<p>הגופן הנבחר לא תומך בעברית — בחר גופן עברי מהרשימה</p>';
  }

  statusEl.textContent = 'מחשב…';
  try {
    // גופן האייקונים נטען רק כשבאמת בחרו צורה — הוא 420KB
    const [buf, iconBuf] = await Promise.all([loadFont(file), params.shape ? loadFont(ICON_FONT) : undefined]);
    await initManifold(wasmUrl);
    if (my !== seq) return; // הקלדה חדשה עקפה את החישוב הזה
    const t = performance.now();
    const result = buildKeychain(params, buf, iconBuf);
    last = { result, name: params.text.trim() };
    render(result);
    const [x, y, z] = result.size;
    const bridged = result.bridge > params.cornerRadius ? ` · גישור ${result.bridge.toFixed(1)} מ"מ` : '';
    statusEl.textContent = `${x.toFixed(1)} × ${y.toFixed(1)} × ${z.toFixed(1)} מ"מ${bridged} · ${Math.round(performance.now() - t)} מ״ש`;
    warnEl.innerHTML = result.warnings.map((w) => `<p>${w}</p>`).join('');
  } catch (e) {
    if (my !== seq) return;
    statusEl.textContent = '';
    warnEl.innerHTML = `<p>שגיאה: ${(e as Error).message}</p>`;
  }
}

function render(r: Result) {
  for (const child of [...group.children]) {
    group.remove(child);
    (child as THREE.Mesh).geometry.dispose();
    ((child as THREE.Mesh).material as THREE.Material).dispose();
  }
  for (const part of r.parts) {
    const mesh = new THREE.Mesh(
      toGeometry(part),
      new THREE.MeshStandardMaterial({ color: PART_COLOR[part.name], roughness: 0.55, metalness: 0.05 }),
    );
    mesh.name = part.name;
    group.add(mesh);
  }
  updateGrid(r);
  $('legend').innerHTML = r.parts
    .map((p) => `<span><i style="background:#${PART_COLOR[p.name].toString(16).padStart(6, '0')}"></i>${PART_LABEL[p.name]}</span>`)
    .join('') + `<span>רשת ${GRID_MM} מ"מ</span>`;
  // שני פורמטים, כל אחד בהורדה אחת. כפתורי החלק הבודד נשארים למי שצריך.
  exportsEl.innerHTML =
    '<button type="button" id="dl3mf">הורדה להדפסה (3MF)</button>'
    + '<p class="hint">מומלץ — קובץ אחד, כל החלקים בתוכו עם צבע לכל אחד. נפתח ישירות ב-Bambu Studio / Orca / Prusa.</p>'
    + '<button type="button" id="dlzip">הורדה כ-STL (ZIP)</button>'
    + '<p class="hint">קובץ אחד שבתוכו STL נפרד לכל חלק, לסלייסרים שלא קוראים 3MF.</p>'
    + '<p class="hint">חלק בודד:</p>';
  $('dl3mf').onclick = () => downloadThreeMf();
  $('dlzip').onclick = () => downloadStlZip();
  const row = document.createElement('div');
  row.className = 'row';
  for (const p of r.parts) {
    const b = document.createElement('button');
    b.textContent = PART_LABEL[p.name]; // בלי מילה לטינית — היא מתהפכת ב-RTL
    b.className = 'link';
    b.onclick = () => downloadStl(p.name);
    row.append(b);
  }
  exportsEl.append(row);
  frameModel(r);
}

function toGeometry({ mesh }: Result['parts'][number]) {
  // ponytail: getMesh() ללא תכונות נוספות תמיד מחזיר numProp=3
  if (mesh.numProp !== 3) throw new Error(`numProp לא צפוי: ${mesh.numProp}`);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(mesh.vertProperties, 3));
  g.setIndex(new THREE.BufferAttribute(mesh.triVerts, 1));
  g.computeVertexNormals();
  return g;
}

// ---- ייצוא -----------------------------------------------------------------
function save(filename: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // ביטול ה-URL באותו tick מבטל את ההורדה עצמה — הדפדפן עוד לא הספיק
  // למשוך את ה-blob. זה היה הבאג שגרם להורדות חסרות ומעורבבות.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function downloadStl(name: PartName) {
  const part = last?.result.parts.find((p) => p.name === name);
  if (!part || !last) return;
  save(`${last.name}_${PART_LABEL[name]}.stl`, toStl(part.mesh), 'model/stl');
}

function downloadStlZip() {
  if (!last) return;
  const parts = last.result.parts.map((p) => ({
    filename: `${last!.name}_${PART_LABEL[p.name]}.stl`,
    mesh: p.mesh,
  }));
  save(`${last.name}_STL.zip`, toStlZip(parts), 'application/zip');
}

function downloadThreeMf() {
  if (!last) return;
  const parts = last.result.parts.map((p) => ({
    name: PART_LABEL[p.name],
    color: `#${PART_COLOR[p.name].toString(16).padStart(6, '0')}`,
    mesh: p.mesh,
  }));
  save(`${last.name}.3mf`, toThreeMf(parts, last.name), 'model/3mf');
}

// ---- חיווט -----------------------------------------------------------------
let timer: ReturnType<typeof setTimeout>;
const schedule = () => { clearTimeout(timer); timer = setTimeout(rebuild, 220); };

writeParams(DEFAULTS);
for (const el of document.querySelectorAll('input, select')) {
  el.addEventListener('input', schedule);
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-angle]')) {
  b.onclick = () => { $<HTMLInputElement>('ringAngle').value = b.dataset.angle!; rebuild(); };
}
$('fit').onclick = () => { framed = false; if (last) frameModel(last.result); };
$('reset').onclick = () => { writeParams(DEFAULTS); rebuild(); };

rebuild();
