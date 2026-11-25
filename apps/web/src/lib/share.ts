/**
 * Partage d'un lien : feuille de partage du navigateur quand il la propose (téléphones),
 * sinon copie dans le presse-papiers. Renvoie ce qui a été fait.
 */
export async function shareLink(
  url: string,
  title: string,
): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ url, title });
      return 'shared';
    }
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
