import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export type ShareImageResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

/**
 * iOS et Android : l'image est téléchargée dans le cache, puis la feuille de partage du
 * système s'ouvre (spec intervention-quotes). Variante web dans share-image.web.ts.
 */
export async function shareImage(url: string, fileName: string): Promise<ShareImageResult> {
  try {
    const target = new File(Paths.cache, fileName);
    if (target.exists) target.delete();
    const file = await File.downloadFileAsync(url, target);
    await Sharing.shareAsync(file.uri, {
      mimeType: 'image/png',
      UTI: 'public.png',
      dialogTitle: 'Partager la citation',
    });
    return 'shared';
  } catch {
    return 'failed';
  }
}
