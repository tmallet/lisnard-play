export interface CreateContextOptions {
  /** Requête HTTP entrante (absente pour les appels serveur directs). */
  req?: Request;
  /** Version de l'application qui sert l'API. */
  version: string;
  /** Mode développement : active les détails d'erreur (pile d'appels). */
  isDev: boolean;
}

export type Context = CreateContextOptions;

export function createContext(opts: CreateContextOptions): Context {
  return opts;
}
