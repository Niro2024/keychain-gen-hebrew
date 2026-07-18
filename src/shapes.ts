/**
 * צורות דקורטיביות מתוך Font Awesome Free Solid (קובץ הגופן: SIL OFL 1.1).
 * הן עוברות בדיוק באותו pipeline כמו האותיות — גליף → מתאר → CrossSection —
 * ולכן לא נדרש שום קוד גיאומטריה חדש בשבילן.
 *
 * cp=0 פירושו צורה פרוצדורלית שנבנית בקוד (ר' flowerPolygons ב-geometry.ts).
 *
 * הרשימה סוננה בעין, לא רק ע"י הבדיקות: 13 אייקונים שעברו את כל המבדקים
 * האוטומטיים הוסרו אחרי רינדור והסתכלות — dragon, ice-cream, candy-cane,
 * bicycle, train, football, spa, satellite, satellite-dish, code,
 * wave-square, network-wired, syringe. ברובם החומר עצמו עבה מספיק (0% מתחת
 * ל-0.5 מ"מ), הם פשוט לא נקראים כלום בגודל מחזיק מפתחות.
 */
export const ICON_FONT = 'FontAwesomeSolid.ttf';

export type ShapeDef = { id: string; cp: number; label: string; group: string };

export const SHAPES: ShapeDef[] = [
  { id: 'heart', cp: 0xf004, label: 'לב', group: 'אהובים' },
  { id: 'star', cp: 0xf005, label: 'כוכב', group: 'אהובים' },
  { id: 'crown', cp: 0xf521, label: 'כתר', group: 'אהובים' },
  { id: 'gem', cp: 0xf3a5, label: 'יהלום', group: 'אהובים' },
  { id: 'rainbow', cp: 0xf75b, label: 'קשת', group: 'אהובים' },
  { id: 'gift', cp: 0xf06b, label: 'מתנה', group: 'אהובים' },
  { id: 'trophy', cp: 0xf091, label: 'גביע', group: 'אהובים' },

  { id: 'paw', cp: 0xf1b0, label: 'כף רגל', group: 'חיות' },
  { id: 'cat', cp: 0xf6be, label: 'חתול', group: 'חיות' },
  { id: 'dog', cp: 0xf6d3, label: 'כלב', group: 'חיות' },
  { id: 'fish', cp: 0xf578, label: 'דג', group: 'חיות' },
  { id: 'frog', cp: 0xf52e, label: 'צפרדע', group: 'חיות' },
  { id: 'horse', cp: 0xf6f0, label: 'סוס', group: 'חיות' },
  { id: 'dove', cp: 0xf4ba, label: 'יונה', group: 'חיות' },
  { id: 'cow', cp: 0xf6c8, label: 'פרה', group: 'חיות' },
  { id: 'hippo', cp: 0xf6ed, label: 'היפופוטם', group: 'חיות' },
  { id: 'bug', cp: 0xf188, label: 'חיפושית', group: 'חיות' },
  { id: 'spider', cp: 0xf717, label: 'עכביש', group: 'חיות' },

  { id: 'flower', cp: 0, label: 'פרח', group: 'טבע' },
  { id: 'clover', cp: 0xe139, label: 'תלתן', group: 'טבע' },
  { id: 'tree', cp: 0xf1bb, label: 'עץ', group: 'טבע' },
  { id: 'leaf', cp: 0xf06c, label: 'עלה', group: 'טבע' },
  { id: 'sun', cp: 0xf185, label: 'שמש', group: 'טבע' },
  { id: 'moon', cp: 0xf186, label: 'ירח', group: 'טבע' },
  { id: 'cloud', cp: 0xf0c2, label: 'ענן', group: 'טבע' },
  { id: 'snowflake', cp: 0xf2dc, label: 'פתית שלג', group: 'טבע' },
  { id: 'fire', cp: 0xf06d, label: 'אש', group: 'טבע' },

  { id: 'cookie', cp: 0xf563, label: 'עוגייה', group: 'אוכל' },
  { id: 'apple-whole', cp: 0xf5d1, label: 'תפוח', group: 'אוכל' },
  { id: 'carrot', cp: 0xf787, label: 'גזר', group: 'אוכל' },
  { id: 'lemon', cp: 0xf094, label: 'לימון', group: 'אוכל' },

  { id: 'rocket', cp: 0xf135, label: 'חללית', group: 'משחק ותנועה' },
  { id: 'car', cp: 0xf1b9, label: 'מכונית', group: 'משחק ותנועה' },
  { id: 'plane', cp: 0xf072, label: 'מטוס', group: 'משחק ותנועה' },
  { id: 'tractor', cp: 0xf722, label: 'טרקטור', group: 'משחק ותנועה' },
  { id: 'sailboat', cp: 0xe445, label: 'סירה', group: 'משחק ותנועה' },
  { id: 'robot', cp: 0xf544, label: 'רובוט', group: 'משחק ותנועה' },
  { id: 'ghost', cp: 0xf6e2, label: 'רוח רפאים', group: 'משחק ותנועה' },
  { id: 'gamepad', cp: 0xf11b, label: 'שלט משחק', group: 'משחק ותנועה' },
  { id: 'basketball', cp: 0xf434, label: 'כדורסל', group: 'משחק ותנועה' },
  { id: 'music', cp: 0xf001, label: 'תו מוזיקלי', group: 'משחק ותנועה' },
  { id: 'guitar', cp: 0xf7a6, label: 'גיטרה', group: 'משחק ותנועה' },
  { id: 'puzzle-piece', cp: 0xf12e, label: 'פאזל', group: 'משחק ותנועה' },
  { id: 'key', cp: 0xf084, label: 'מפתח', group: 'משחק ותנועה' },
  { id: 'book', cp: 0xf02d, label: 'ספר', group: 'משחק ותנועה' },

  { id: 'atom', cp: 0xf5d2, label: 'אטום', group: 'מדע וטכנולוגיה' },
  { id: 'dna', cp: 0xf471, label: 'DNA', group: 'מדע וטכנולוגיה' },
  { id: 'flask', cp: 0xf0c3, label: 'מבחנה', group: 'מדע וטכנולוגיה' },
  { id: 'microscope', cp: 0xf610, label: 'מיקרוסקופ', group: 'מדע וטכנולוגיה' },
  { id: 'brain', cp: 0xf5dc, label: 'מוח', group: 'מדע וטכנולוגיה' },
  { id: 'lightbulb', cp: 0xf0eb, label: 'נורה', group: 'מדע וטכנולוגיה' },
  { id: 'gear', cp: 0xf013, label: 'גלגל שיניים', group: 'מדע וטכנולוגיה' },
  { id: 'gears', cp: 0xf085, label: 'גלגלי שיניים', group: 'מדע וטכנולוגיה' },
  { id: 'microchip', cp: 0xf2db, label: 'שבב', group: 'מדע וטכנולוגיה' },
  { id: 'magnet', cp: 0xf076, label: 'מגנט', group: 'מדע וטכנולוגיה' },
  { id: 'bolt', cp: 0xf0e7, label: 'ברק', group: 'מדע וטכנולוגיה' },
  { id: 'globe', cp: 0xf0ac, label: 'גלובוס', group: 'מדע וטכנולוגיה' },
  { id: 'earth-americas', cp: 0xf57d, label: 'כדור הארץ', group: 'מדע וטכנולוגיה' },
  { id: 'laptop', cp: 0xf109, label: 'מחשב נייד', group: 'מדע וטכנולוגיה' },
  { id: 'computer', cp: 0xe4e5, label: 'מחשב', group: 'מדע וטכנולוגיה' },
  { id: 'calculator', cp: 0xf1ec, label: 'מחשבון', group: 'מדע וטכנולוגיה' },
  { id: 'battery-full', cp: 0xf240, label: 'סוללה', group: 'מדע וטכנולוגיה' },
  { id: 'radiation', cp: 0xf7b9, label: 'קרינה', group: 'מדע וטכנולוגיה' },
  { id: 'virus', cp: 0xe074, label: 'וירוס', group: 'מדע וטכנולוגיה' },
  { id: 'user-astronaut', cp: 0xf4fb, label: 'אסטרונאוט', group: 'מדע וטכנולוגיה' },
  { id: 'helicopter', cp: 0xf533, label: 'מסוק', group: 'מדע וטכנולוגיה' },
  { id: 'cube', cp: 0xf1b2, label: 'קובייה', group: 'מדע וטכנולוגיה' },
  { id: 'cubes', cp: 0xf1b3, label: 'קוביות', group: 'מדע וטכנולוגיה' },
  { id: 'magnifying-glass', cp: 0xf002, label: 'זכוכית מגדלת', group: 'מדע וטכנולוגיה' },
  { id: 'heart-pulse', cp: 0xf21e, label: 'דופק', group: 'מדע וטכנולוגיה' },
  { id: 'solar-panel', cp: 0xf5ba, label: 'פאנל סולארי', group: 'מדע וטכנולוגיה' },
  { id: 'temperature-half', cp: 0xf2c9, label: 'מדחום', group: 'מדע וטכנולוגיה' },
  { id: 'infinity', cp: 0xf534, label: 'אינסוף', group: 'מדע וטכנולוגיה' },
  { id: 'print', cp: 0xf02f, label: 'מדפסת', group: 'מדע וטכנולוגיה' },
  { id: 'wifi', cp: 0xf1eb, label: 'אלחוטי', group: 'מדע וטכנולוגיה' },
  { id: 'plug', cp: 0xf1e6, label: 'תקע', group: 'מדע וטכנולוגיה' },
  { id: 'compass', cp: 0xf14e, label: 'מצפן', group: 'מדע וטכנולוגיה' },
  { id: 'meteor', cp: 0xf753, label: 'מטאור', group: 'מדע וטכנולוגיה' },
  { id: 'gauge', cp: 0xf624, label: 'מד', group: 'מדע וטכנולוגיה' },
  { id: 'jet-fighter', cp: 0xf0fb, label: 'מטוס קרב', group: 'מדע וטכנולוגיה' },
  { id: 'space-shuttle', cp: 0xf197, label: 'מעבורת חלל', group: 'מדע וטכנולוגיה' },
  { id: 'tower-broadcast', cp: 0xf519, label: 'מגדל שידור', group: 'מדע וטכנולוגיה' },
  { id: 'server', cp: 0xf233, label: 'שרת', group: 'מדע וטכנולוגיה' },
];

export const SHAPE_CP = new Map(SHAPES.map((s) => [s.id, s.cp]));
