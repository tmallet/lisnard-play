/**
 * Numéro de PR d'une prévisualisation Coolify, tiré du nom du conteneur
 * (`<uuid>-pr-<n°>`), substitué à `{pr}` : `SITE_URL` se règle une fois pour toutes les PR
 * (`https://{pr}.lisnardplay.thimal.fr`). Même règle que le relais de l'app.
 */
export function withPreviewNumber(value: string, containerName: string | undefined): string {
  if (!value.includes('{pr}')) return value;
  const pr = containerName?.match(/-pr-(\d+)$/)?.[1];
  if (!pr) throw new Error(`{pr} sans prévisualisation (conteneur ${containerName ?? 'inconnu'})`);
  return value.replaceAll('{pr}', pr);
}
