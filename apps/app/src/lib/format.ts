/** Formats d'affichage en français, heure de Paris. */

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris',
});

const dateTimeFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
});

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** Date et heure, pour un direct à venir : « mardi 14 octobre à 18:00 ». */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

const KIND_LABELS: Record<string, string> = {
  tv: 'Télévision',
  radio: 'Radio',
  presse: 'Presse',
  podcast: 'Podcast',
  meeting: 'Meeting',
  discours: 'Discours',
  stream: 'Vidéo',
  reseau_social: 'Réseaux sociaux',
};

export function kindLabel(kind: string | null): string {
  return (kind && KIND_LABELS[kind]) || 'Intervention';
}

export const ROLE_LABELS = { national: 'National', amf: 'AMF' } as const;

/** Texte comparable : minuscules, sans accents, ponctuation ni guillemets. */
function comparable(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Le texte ne fait que répéter le titre, éventuellement suivi du nom du média
 * (descriptions Google News, balises Open Graph) : inutile de l'afficher.
 */
export function repeatsTitle(text: string | null | undefined, title: string, outlet = ''): boolean {
  if (!text) return true;
  let t = comparable(text);
  const o = comparable(outlet);
  if (o && t.endsWith(` ${o}`)) t = t.slice(0, -o.length - 1).trim();
  const ti = comparable(title);
  return t === '' || t === o || t === ti || ti.includes(t);
}
