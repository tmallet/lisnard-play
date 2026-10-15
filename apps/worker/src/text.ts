/** Utilitaires de texte pour les flux (décodage, nettoyage, comparaison). */

/** Entités de base, reconnues quelle que soit la casse (`&AMP;` existe en HTML). */
const BASIC: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Ponctuation et symboles courants dans les titres de presse, sensibles à la casse. */
const NAMED: Record<string, string> = {
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  sbquo: '‚',
  bdquo: '„',
  laquo: '«',
  raquo: '»',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  euro: '€',
  deg: '°',
  copy: '©',
  reg: '®',
  trade: '™',
  middot: '·',
  bull: '•',
  thinsp: '\u2009',
  ensp: '\u2002',
  emsp: '\u2003',
  shy: '',
  aelig: 'æ',
  AElig: 'Æ',
  oelig: 'œ',
  OElig: 'Œ',
  szlig: 'ß',
  iexcl: '¡',
  iquest: '¿',
};

/**
 * Lettres accentuées (`&eacute;` → é, `&Eacute;` → É, `&ccedil;`, `&ntilde;`…),
 * construites à partir des diacritiques Unicode plutôt que listées une à une.
 */
const DIACRITICS: Record<string, string> = {
  grave: '\u0300',
  acute: '\u0301',
  circ: '\u0302',
  tilde: '\u0303',
  uml: '\u0308',
  ring: '\u030a',
  cedil: '\u0327',
};
function accented(name: string): string | undefined {
  const m = name.match(/^([A-Za-z])(grave|acute|circ|tilde|uml|ring|cedil)$/);
  if (!m?.[1] || !m[2]) return undefined;
  const composed = (m[1] + DIACRITICS[m[2]]).normalize('NFC');
  return composed.length === 1 ? composed : undefined;
}

/** Décode les entités HTML numériques et nommées ; une entité inconnue reste telle quelle. */
export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1]?.toLowerCase() === 'x' ? Number.parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match;
    }
    return NAMED[code] ?? accented(code) ?? BASIC[code.toLowerCase()] ?? match;
  });
}

/** Le texte contient-il encore une entité HTML ? */
export const hasEntities = (input: string) => /&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/i.test(input);

/** Retire les balises HTML et normalise les espaces. */
export function stripHtml(input: string): string {
  return decodeEntities(input.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Minuscules sans accents, pour les comparaisons insensibles (pré-filtre). */
export function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function mentionsLisnard(...texts: string[]): boolean {
  return texts.some((t) => normalize(t).includes('lisnard'));
}

export async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Buffer.from(digest).toString('hex');
}
