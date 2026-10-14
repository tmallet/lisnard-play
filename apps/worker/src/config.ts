/** Configuration du worker (ADR 0015) : variables d'environnement et constantes. */
import type { WebSubConfig } from './websub/subscribe';

/** Début de l'historique : 31 mars 2026 00:00, heure de Paris (ADR 0016). */
export const HISTORY_START = new Date('2026-03-30T22:00:00Z');

/** Cadences de collecte par type de source (design D3). */
export const CADENCE_MS = {
  youtube: 3 * 60_000,
  rss: 15 * 60_000,
  /** Rattrapage des chaînes officielles : au démarrage, puis une fois par jour (ADR 0018). */
  backfill: 24 * 60 * 60_000,
  /** Résumés des vidéos (spec intervention-summaries, design D4). */
  summarize: 2 * 60_000,
  /** Renouvellement des abonnements WebSub (bail de 5 jours, ADR 0023). */
  subscribe: 24 * 60 * 60_000,
} as const;

/**
 * Plafond quotidien en dollars : 1 si la variable est absente ou vide. Une valeur
 * illisible arrête le worker au démarrage plutôt que de lever le plafond (NaN).
 */
export function parseBudget(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return 1;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0)
    throw new Error(
      `SUMMARY_DAILY_BUDGET_USD invalide : « ${raw} » (nombre de dollars attendu, ex. 1.5)`,
    );
  return value;
}

/** Plafond quotidien de dépense en résumés, en dollars (ADR 0021). */
export const SUMMARY_DAILY_BUDGET_USD = parseBudget(process.env.SUMMARY_DAILY_BUDGET_USD);

/**
 * Réception WebSub (ADR 0023) : désactivée sans adresse de rappel ni secret. Une
 * configuration incomplète ou un secret trop court arrête le worker au démarrage.
 */
export function parseWebSub(env: Record<string, string | undefined>): WebSubConfig | null {
  const callbackUrl = env.WEBSUB_CALLBACK_URL?.trim() ?? '';
  const secret = env.WEBSUB_SECRET?.trim() ?? '';
  if (!callbackUrl && !secret) return null;
  if (!callbackUrl || !secret)
    throw new Error(
      'WEBSUB_CALLBACK_URL et WEBSUB_SECRET vont ensemble : définir les deux ou aucun',
    );
  if (!URL.canParse(callbackUrl) || new URL(callbackUrl).protocol !== 'https:')
    throw new Error(`WEBSUB_CALLBACK_URL invalide : « ${callbackUrl} » (URL https attendue)`);
  if (secret.length < 32 || secret.length > 199)
    throw new Error('WEBSUB_SECRET doit compter entre 32 et 199 caractères');
  const port = Number(env.WEBSUB_PORT ?? 8080);
  if (!Number.isInteger(port) || port <= 0) throw new Error('WEBSUB_PORT invalide');
  return { callbackUrl, secret, port };
}

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
