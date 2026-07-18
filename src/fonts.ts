/**
 * he=true → תומך עברית. כל הגופנים חופשיים לשימוש מסחרי (OFL-1.1, למעט
 * Satisfy שהוא Apache-2.0). פירוט ויוחסין: public/fonts/LICENSES.md
 */
export const FONTS = [
  { file: 'DancingScript.ttf', label: 'Dancing Script', he: false },
  { file: 'GreatVibes.ttf', label: 'Great Vibes', he: false },
  { file: 'Pacifico.ttf', label: 'Pacifico', he: false },
  { file: 'Satisfy.ttf', label: 'Satisfy', he: false },
  { file: 'Caveat.ttf', label: 'Caveat', he: false },
  { file: 'Lobster.ttf', label: 'Lobster', he: false },

  { file: 'SecularOne.ttf', label: 'Secular One — סאנס כבד', he: true },
  { file: 'SuezOne.ttf', label: 'Suez One — סריף כבד', he: true },
  { file: 'Rubik.ttf', label: 'Rubik — גיאומטרי', he: true },
  { file: 'VarelaRound.ttf', label: 'Varela Round — מעוגל', he: true },
  { file: 'Fredoka600.ttf', label: 'Fredoka — מעוגל שמן', he: true },
  { file: 'PlaypenHe700.ttf', label: 'Playpen — כתב יד עבה', he: true },
  { file: 'GveretLevin.ttf', label: 'גברת לוין — כתב יד', he: true },
  { file: 'AmaticSC.ttf', label: 'Amatic SC — צר ודק', he: true },
] as const;

export const DEFAULT_FONT = 'Fredoka600.ttf';
