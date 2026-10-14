/**
 * Abonnements WebSub (ADR 0023, design D2) : un par chaîne YouTube active, renouvelé
 * chaque jour avec un bail de 5 jours. L'abonnement est idempotent côté hub.
 */
import { errorMessage, log } from '../log';
import type { SourceConfig } from '../sources/types';
import { channelTopic } from '../sources/youtube';

export const HUB_URL = 'https://pubsubhubbub.appspot.com/subscribe';
export const LEASE_SECONDS = 5 * 24 * 60 * 60;

export interface WebSubConfig {
  callbackUrl: string;
  secret: string;
  port: number;
}

export async function subscribeAll(
  sources: SourceConfig[],
  config: WebSubConfig,
  fetchFn: typeof fetch = fetch,
): Promise<{ subscribed: number; failed: string[] }> {
  const result = { subscribed: 0, failed: [] as string[] };
  for (const source of sources) {
    if (source.kind !== 'youtube' || !source.active) continue;
    try {
      const res = await fetchFn(HUB_URL, {
        method: 'POST',
        body: new URLSearchParams({
          'hub.mode': 'subscribe',
          'hub.topic': channelTopic(source.channelId),
          'hub.callback': config.callbackUrl,
          'hub.secret': config.secret,
          'hub.verify': 'async',
          'hub.lease_seconds': String(LEASE_SECONDS),
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`hub : HTTP ${res.status}`);
      result.subscribed += 1;
    } catch (error) {
      result.failed.push(source.id);
      log.error('websub : abonnement en échec', { source: source.id, error: errorMessage(error) });
    }
  }
  return result;
}
