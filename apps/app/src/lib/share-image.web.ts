export type ShareImageResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

/**
 * Web : partage du navigateur avec le fichier quand il l'accepte (téléphones), sinon
 * téléchargement de l'image (spec intervention-quotes).
 */
export async function shareImage(url: string, fileName: string): Promise<ShareImageResult> {
  let blob: Blob;
  try {
    const response = await fetch(url);
    if (!response.ok) return 'failed';
    blob = await response.blob();
  } catch {
    return 'failed';
  }
  const file = new File([blob], fileName, { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[] }) => Promise<void>;
  };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file] });
      return 'shared';
    } catch (error) {
      // Feuille de partage fermée par l'utilisateur : rien à signaler.
      return error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'failed';
    }
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  return 'downloaded';
}
