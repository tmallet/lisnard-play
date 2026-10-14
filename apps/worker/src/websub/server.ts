/**
 * Réception WebSub (ADR 0023) : vérification des abonnements par le hub (GET) et
 * notifications signées (POST). Rien n'est lu avant la vérification de la signature.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

import { errorMessage, log } from '../log';
import { channelOfTopic, type PushNotification, parseNotification } from '../sources/youtube';

export const WEBSUB_PATH = '/websub/youtube';
/** Taille maximale d'une notification : une entrée Atom pèse moins de 2 Ko. */
export const MAX_BODY_BYTES = 64 * 1024;

export interface WebSubHandlerOptions {
  secret: string;
  /** Chaîne suivie (et active) ? Les autres n'ont aucun effet (spec). */
  isTracked: (channelId: string) => boolean;
  /** Traitement de la notification, appelé après la réponse au hub. */
  onNotification: (n: PushNotification) => void;
}

/** Compare `sha1=<hex>` au HMAC-SHA1 du corps brut, en temps constant. */
export function validSignature(secret: string, body: Uint8Array, header: string | null): boolean {
  const match = header?.match(/^sha1=([0-9a-f]{40})$/i);
  if (!match?.[1]) return false;
  const expected = createHmac('sha1', secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(match[1], 'hex'));
}

/** Gestionnaire HTTP de l'adresse de rappel, indépendant de Bun.serve pour les tests. */
export function createWebSubHandler({ secret, isTracked, onNotification }: WebSubHandlerOptions) {
  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    if (url.pathname !== WEBSUB_PATH) return new Response(null, { status: 404 });

    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const channelId = channelOfTopic(url.searchParams.get('hub.topic') ?? '');
      const challenge = url.searchParams.get('hub.challenge');
      if (
        (mode === 'subscribe' || mode === 'unsubscribe') &&
        challenge &&
        channelId &&
        isTracked(channelId)
      )
        return new Response(challenge, { headers: { 'content-type': 'text/plain' } });
      return new Response(null, { status: 404 });
    }

    if (req.method === 'POST') {
      if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES)
        return new Response(null, { status: 413 });
      const body = new Uint8Array(await req.arrayBuffer());
      if (body.byteLength > MAX_BODY_BYTES) return new Response(null, { status: 413 });
      if (!validSignature(secret, body, req.headers.get('x-hub-signature')))
        return new Response(null, { status: 401 });
      let notification: PushNotification;
      try {
        notification = parseNotification(new TextDecoder().decode(body));
      } catch (error) {
        log.warn('websub : notification illisible', { error: errorMessage(error) });
        return new Response(null, { status: 400 });
      }
      // Le hub n'attend pas le traitement : réponse immédiate, travail en arrière-plan.
      onNotification({
        videos: notification.videos.filter((v) => isTracked(v.channelId)),
        deleted: notification.deleted.filter((d) => !d.channelId || isTracked(d.channelId)),
      });
      return new Response(null, { status: 204 });
    }

    return new Response(null, { status: 405, headers: { allow: 'GET, POST' } });
  };
}

/**
 * File sérielle : une notification à la fois, pour ne pas lancer plusieurs classements
 * en parallèle quand YouTube envoie des rafales. L'échec d'un traitement est journalisé.
 */
export function serialQueue<T>(run: (job: T) => Promise<void>): (job: T) => void {
  let chain = Promise.resolve();
  return (job) => {
    chain = chain.then(() =>
      run(job).catch((error) =>
        log.error('websub : traitement en échec', { error: errorMessage(error) }),
      ),
    );
  };
}
