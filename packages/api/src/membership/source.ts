/**
 * Données d'adhésion de Nouvelle Énergie (spec membership-timeline, ADR 0026) : lues par
 * le serveur, gardées 90 s en mémoire, une seule requête en vol, dernière valeur valide
 * servie si la source tombe ou change de format. Rien n'est écrit en base.
 */
import { z } from 'zod';

export const DEFAULT_MEMBERSHIP_URL = 'https://adherent.unenouvelleenergie.fr/donnees';
export const CACHE_MS = 90_000;
/** Après un échec, délai avant de réessayer : une source en panne n'est pas sollicitée à chaque visite. */
export const RETRY_MS = 30_000;

const totalSchema = z.object({
  adherents: z.number().int().nonnegative(),
  mis_a_jour: z.iso.datetime({ offset: true }),
});
const historySchema = z.object({
  jours: z.array(
    z.object({
      jour: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      adherents: z.number().int().nonnegative(),
    }),
  ),
});

export interface MembershipData {
  total: { members: number; updatedAt: string };
  /** Total d'adhérents en fin de journée, jour par jour. */
  history: { day: string; members: number }[];
}

export interface MembershipResult {
  data: MembershipData | null;
  /** Dernière valeur valide servie après un échec de la source. */
  stale: boolean;
}

export interface MembershipSource {
  get(): Promise<MembershipResult>;
}

export function createMembershipSource({
  baseUrl = DEFAULT_MEMBERSHIP_URL,
  fetch: fetchFn = fetch,
  now = Date.now,
}: {
  baseUrl?: string;
  fetch?: typeof fetch;
  now?: () => number;
} = {}): MembershipSource {
  let data: MembershipData | null = null;
  let freshUntil = 0;
  let retryAt = 0;
  let inFlight: Promise<MembershipResult> | null = null;

  async function read<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    const res = await fetchFn(`${baseUrl}${path}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error(`${path} : HTTP ${res.status}`);
    return schema.parse(await res.json());
  }

  async function refresh(): Promise<MembershipResult> {
    try {
      const [total, history] = await Promise.all([
        read('/adherents.json', totalSchema),
        read('/adherents/historique.json', historySchema),
      ]);
      data = {
        total: { members: total.adherents, updatedAt: total.mis_a_jour },
        history: history.jours.map((j) => ({ day: j.jour, members: j.adherents })),
      };
      freshUntil = now() + CACHE_MS;
      return { data, stale: false };
    } catch {
      retryAt = now() + RETRY_MS;
      return { data, stale: data !== null };
    }
  }

  return {
    async get() {
      const t = now();
      if (data && t < freshUntil) return { data, stale: false };
      if (inFlight) return inFlight;
      if (t < retryAt) return { data, stale: data !== null };
      inFlight = refresh().finally(() => {
        inFlight = null;
      });
      return inFlight;
    },
  };
}

/**
 * Source partagée par toutes les requêtes du serveur, gardée sur globalThis pour
 * survivre aux rechargements de développement (ADR 0019).
 */
export function sharedMembershipSource(): MembershipSource {
  const store = globalThis as typeof globalThis & { __lisnardMembership?: MembershipSource };
  store.__lisnardMembership ??= createMembershipSource({
    baseUrl: process.env.MEMBERSHIP_SOURCE_URL || DEFAULT_MEMBERSHIP_URL,
  });
  return store.__lisnardMembership;
}
