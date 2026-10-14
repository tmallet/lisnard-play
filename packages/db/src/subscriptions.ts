/**
 * Abonnements aux notifications (ADR 0024) : seul module d'écriture que le backend
 * (`packages/api`) peut importer. Il ne touche qu'à la table `push_subscription`.
 * L'appareil prouve qu'il détient l'abonnement en fournissant son `endpoint`.
 */
import { count, eq, sql } from 'drizzle-orm';

import type { Db } from './client';
import { pushSubscription, type WebPushKeys } from './schema';

/**
 * Services Web Push connus (ADR 0024) : l'API refuse toute autre adresse à l'enregistrement et
 * le worker la revérifie avant l'envoi (anti-SSRF).
 */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^web\.push\.apple\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
];

export function isPushServiceUrl(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return (
    url.protocol === 'https:' &&
    !url.port &&
    !url.username &&
    PUSH_HOSTS.some((host) => host.test(url.hostname))
  );
}

export interface Preferences {
  live: boolean;
  reminder: boolean;
  newItem: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = { live: true, reminder: true, newItem: false };

export interface SubscriptionInput {
  kind: 'web' | 'expo';
  endpoint: string;
  keys?: WebPushKeys | null;
  /** Absentes : préférences par défaut à la création, inchangées sinon. */
  preferences?: Preferences;
}

const columns = {
  live: pushSubscription.live,
  reminder: pushSubscription.reminder,
  newItem: pushSubscription.newItem,
};

export async function countSubscriptions(db: Db): Promise<number> {
  const [row] = await db.select({ n: count() }).from(pushSubscription);
  return row?.n ?? 0;
}

/**
 * Confirme un abonnement existant (clés et date de confirmation rafraîchies, préférences
 * remplacées si fournies) ; null s'il est inconnu. Ne compte ni n'insère rien : c'est le
 * chemin de chaque ouverture de l'app, qui doit rester léger et passer même table pleine.
 */
export async function confirmSubscription(
  db: Db,
  input: SubscriptionInput,
): Promise<Preferences | null> {
  const [row] = await db
    .update(pushSubscription)
    .set({ keys: input.keys ?? null, confirmedAt: sql`now()`, ...(input.preferences ?? {}) })
    .where(eq(pushSubscription.endpoint, input.endpoint))
    .returning(columns);
  return row ?? null;
}

/**
 * Enregistre l'abonnement, ou le confirme s'il existe déjà (clés et date de
 * confirmation rafraîchies). Renvoie les préférences en vigueur.
 */
export async function saveSubscription(db: Db, input: SubscriptionInput): Promise<Preferences> {
  const prefs = input.preferences;
  const [row] = await db
    .insert(pushSubscription)
    .values({
      kind: input.kind,
      endpoint: input.endpoint,
      keys: input.keys ?? null,
      ...(prefs ?? DEFAULT_PREFERENCES),
    })
    .onConflictDoUpdate({
      target: pushSubscription.endpoint,
      set: {
        keys: input.keys ?? null,
        confirmedAt: sql`now()`,
        ...(prefs ?? {}),
      },
    })
    .returning(columns);
  if (!row) throw new Error('Échec de l’enregistrement de l’abonnement');
  return row;
}

/** Met à jour les préférences ; null si l'abonnement est inconnu. */
export async function updatePreferences(
  db: Db,
  endpoint: string,
  preferences: Preferences,
): Promise<Preferences | null> {
  const [row] = await db
    .update(pushSubscription)
    .set({ ...preferences, confirmedAt: sql`now()` })
    .where(eq(pushSubscription.endpoint, endpoint))
    .returning(columns);
  return row ?? null;
}

/** Supprime l'abonnement ; false s'il était inconnu. */
export async function deleteSubscription(db: Db, endpoint: string): Promise<boolean> {
  const rows = await db
    .delete(pushSubscription)
    .where(eq(pushSubscription.endpoint, endpoint))
    .returning({ id: pushSubscription.id });
  return rows.length > 0;
}
