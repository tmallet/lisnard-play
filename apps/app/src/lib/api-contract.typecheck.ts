/**
 * Garde-fou de typage du contrat client ↔ serveur (spec api-transport, « Contrat typé partagé »).
 * Ce fichier n'est jamais exécuté : il est vérifié par `bun run typecheck`.
 * Si la forme de sortie de `health` change de façon incompatible, la compilation échoue ici.
 */
import type { AppRouter } from '@lisnard/api';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

type Outputs = inferRouterOutputs<AppRouter>;
type Inputs = inferRouterInputs<AppRouter>;

export const healthUsage: Outputs['health'] = {
  status: 'ok',
  version: '0.0.0',
  time: new Date().toISOString(),
};

// @ts-expect-error — seul le statut « ok » fait partie du contrat.
export const invalidStatus: Outputs['health']['status'] = 'down';

// @ts-expect-error — une procédure inexistante n'est pas appelable.
export type UnknownProcedure = Inputs['doesNotExist'];
