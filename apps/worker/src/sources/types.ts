import type { CandidateInput } from '@lisnard/db/write';

export interface YoutubeSourceConfig {
  id: string;
  kind: 'youtube';
  name: string;
  active: boolean;
  channelId: string;
  /** Chaîne officielle de David Lisnard : exemptée du pré-filtre sur le nom. */
  official?: boolean;
}

export interface RssSourceConfig {
  id: string;
  kind: 'rss';
  name: string;
  active: boolean;
  url: string;
  /** Le média réel est lu dans chaque élément (balise <source> de Google News). */
  outletFromItem?: boolean;
}

export type SourceConfig = YoutubeSourceConfig | RssSourceConfig;

/** Contenu brut renvoyé par un adaptateur, avant pré-filtre et seuil d'historique. */
export type Candidate = Omit<CandidateInput, 'sourceId'>;

/** Dépendances injectées (réseau, clés) : les tests les remplacent par des fixtures. */
export interface SourceContext {
  fetch: typeof fetch;
  youtubeApiKey?: string;
  /** Compteur d'unités de quota YouTube consommées. */
  quota: { youtubeUnits: number };
}
