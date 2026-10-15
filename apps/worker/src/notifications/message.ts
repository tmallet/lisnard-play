/**
 * Contenu des notifications (spec push-notifications, design D2 et D3 du change
 * richer-notifications) : sur iPhone, le titre est coupé vers 30 caractères et le texte
 * n'a qu'une ligne repliée. Le titre dit donc ce qui se passe, le texte de quoi il s'agit.
 */
import type { NotificationEvent } from '@lisnard/db/write';

import type { PushMessage } from './send';

/** Sigles rétablis après la remise en minuscules d'un titre écrit en capitales. */
const ACRONYMS = [
  'BFMTV',
  'RMC',
  'LCI',
  'CNEWS',
  'TF1',
  'LFI',
  'RN',
  'PS',
  'LR',
  'UE',
  'IA',
  'PME',
  'TVA',
  'CSG',
  'SNCF',
  'EDF',
  'RSA',
  'SMIC',
  'OQTF',
  'USA',
  'ONU',
  'OTAN',
  'BCE',
  'PIB',
];

/** Marques de direct en tête de titre (« 🔴 EN DIRECT I … ») : redondantes avec le titre de la notification. */
const LIVE_PREFIX = /^(?:\p{Extended_Pictographic}|\uFE0F|\s)*(?:en direct|live)\s*[|I:–—-]\s*/iu;
const LEADING_EMOJI = /^(?:\p{Extended_Pictographic}|\uFE0F|\s)+/u;

/**
 * Titre lisible : sans marque de direct ni emoji de tête, et en casse normale s'il est
 * écrit en capitales (au moins 70 % de majuscules sur 8 lettres ou plus).
 */
export function readableTitle(title: string): string {
  const cleaned = title.replace(LIVE_PREFIX, '').replace(LEADING_EMOJI, '').trim() || title.trim();
  const letters = cleaned.match(/\p{L}/gu) ?? [];
  const upper = letters.filter((l) => l === l.toUpperCase() && l !== l.toLowerCase()).length;
  if (letters.length < 8 || upper / letters.length < 0.7) return cleaned;
  const lower = cleaned.toLowerCase().replace(/\p{L}/u, (first) => first.toUpperCase());
  return ACRONYMS.reduce(
    (text, acronym) => text.replace(new RegExp(`\\b${acronym}\\b`, 'gi'), acronym),
    lower,
  );
}

/** Durée d'une vidéo : « 45 s », « 2 min », « 1 h 05 ». */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

const timeFormat = new Intl.DateTimeFormat('fr-FR', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Europe/Paris',
});
/** Heure de Paris : « 8 h 30 ». */
export const formatTime = (date: Date) => timeFormat.format(date).replace(':', ' h ');

const LEAD_MAX = 140;
/** Première phrase du résumé, tronquée. */
export function summaryLead(text: string): string {
  const first = text.trim().split(/(?<=[.!?…])\s+/u)[0] ?? '';
  return first.length > LEAD_MAX ? `${first.slice(0, LEAD_MAX - 1).trimEnd()}…` : first;
}

/** Miniature en grand format (hq720 pour YouTube), comme les cartes de l'app. */
const largeImage = (url: string | null) =>
  url?.startsWith('https://')
    ? url.replace(
        /^(https:\/\/i\d?\.ytimg\.com\/vi\/[^/]+\/)(?:hq|mq|sd)?default\.jpg$/,
        '$1hq720.jpg',
      )
    : undefined;

function headline(event: NotificationEvent): string {
  if (event.kind === 'live') return '🔴 David Lisnard est en direct';
  if (event.kind === 'reminder') return '⏰ Dans 15 min : David Lisnard en direct';
  if (event.official) return '🎥 Nouvelle vidéo de David Lisnard';
  const preposition =
    event.interventionKind === 'presse' || event.interventionKind === 'podcast' ? 'dans' : 'sur';
  return `📰 David Lisnard ${preposition} ${event.outlet}`;
}

export function buildMessage(event: NotificationEvent): PushMessage {
  const urgent = event.kind !== 'new_item';
  const title = readableTitle(event.title);
  const parts = [title];
  // Le média n'est pas répété : déjà dans le titre (« sur BFMTV ») ou chaîne officielle.
  if (event.kind !== 'new_item' && !event.official) parts.push(event.outlet);
  if (event.kind === 'reminder' && event.startsAt) parts.push(`à ${formatTime(event.startsAt)}`);
  if (event.kind === 'new_item' && event.durationS) parts.push(formatDuration(event.durationS));
  const lead = event.kind === 'new_item' && event.summaryText ? summaryLead(event.summaryText) : '';
  return {
    title: headline(event),
    body: lead ? `${parts.join(' · ')}\n${lead}` : parts.join(' · '),
    url: `/interventions/${event.itemId}`,
    itemId: event.itemId,
    tag: event.itemId,
    image: largeImage(event.thumbnailUrl),
    urgent,
    ttlSeconds: urgent ? 3600 : 6 * 3600,
  };
}
