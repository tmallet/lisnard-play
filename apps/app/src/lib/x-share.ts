/**
 * Partage sur X par l'adresse publique (spec intervention-quotes, ADR 0030) : aucun
 * script de X sur le site. X compte un lien pour 23 caractères, quelle que soit sa
 * longueur, sur un total de 280.
 */
const X_LIMIT = 280;
const X_LINK = 23;
const SIGNATURE = ' — David Lisnard';

/** Message : « citation » — David Lisnard, la citation raccourcie si besoin. */
export function xShareText(quote: string): string {
  // Place restante après le lien, l'espace qui le précède, les guillemets et la signature.
  const room = X_LIMIT - X_LINK - 1 - '«  »'.length - SIGNATURE.length;
  let text = quote.trim();
  if (text.length > room) {
    const cut = text.slice(0, room - 1);
    // Coupe au dernier mot entier, sans ponctuation pendante.
    text = `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : cut.length).replace(/[\s,;:.]+$/, '')}…`;
  }
  return `« ${text} »${SIGNATURE}`;
}

export const xShareUrl = (quote: string, url: string) =>
  `https://x.com/intent/post?text=${encodeURIComponent(xShareText(quote))}&url=${encodeURIComponent(url)}`;
