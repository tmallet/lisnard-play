/** Configuration du worker (ADR 0015) : variables d'environnement et constantes. */

/** Début de l'historique : 31 mars 2026 00:00, heure de Paris (ADR 0016). */
export const HISTORY_START = new Date('2026-03-30T22:00:00Z');

/** Cadences de collecte par type de source (design D3). */
export const CADENCE_MS = {
  youtube: 3 * 60_000,
  rss: 15 * 60_000,
} as const;

/** Intervalle de la boucle de planification. */
export const TICK_MS = 30_000;

/** Fichier de pulsation lu par le healthcheck Docker (design D8). */
export const HEARTBEAT_FILE = process.env.HEARTBEAT_FILE ?? '/tmp/lisnard-worker-heartbeat';

/** Clé du verrou Postgres qui garantit une seule instance active (ADR 0015). */
export const LEADER_LOCK_KEY = 271_003_2027;

export function requireEnv(
  name: 'DATABASE_URL' | 'OPENROUTER_API_KEY' | 'YOUTUBE_API_KEY',
): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}
