import { Platform, Share } from 'react-native';

/**
 * Partage d'un lien : feuille de partage du système (mobile, navigateurs qui la
 * proposent), sinon copie dans le presse-papiers. Renvoie ce qui a été fait.
 */
export async function shareLink(
  url: string,
  title: string,
): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (Platform.OS !== 'web') {
      await Share.share({ message: url, url, title });
      return 'shared';
    }
    const nav = navigator as Navigator & { share?: Navigator['share'] };
    if (typeof nav.share === 'function') {
      await nav.share({ url, title });
      return 'shared';
    }
    await nav.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
