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

/**
 * Adresse de partage web. `twitter.com/intent/tweet` plutôt que `x.com/intent/post` :
 * sur téléphone, l'app X reconnaît la première et ouvre sa rédaction native, alors que
 * la seconde s'affiche dans son navigateur intégré.
 */
export const xShareUrl = (quote: string, url: string) =>
  `https://twitter.com/intent/tweet?text=${encodeURIComponent(xShareText(quote))}&url=${encodeURIComponent(url)}`;

/** Rédaction native de l'app X (iOS, Android) ; repli sur xShareUrl si X est absent. */
export const xAppUrl = (quote: string, url: string) =>
  `twitter://post?message=${encodeURIComponent(`${xShareText(quote)} ${url}`)}`;
