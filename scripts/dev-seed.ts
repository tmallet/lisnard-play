/**
 * Jeu d'essai local (développement et comparaison visuelle, change migrate-web-astro) :
 * remplit la base de DATABASE_URL d'interventions variées (direct, à venir, vidéos
 * longues, clips, presse, résumés, citations, lieux), puis sert des miniatures et des
 * données d'adhésion factices, sans appel au réseau extérieur.
 *
 * Usage : bun scripts/dev-seed.ts   (FIXTURE_PORT, 8099 par défaut ; Ctrl+C pour arrêter)
 * Puis lancer le site avec MEMBERSHIP_SOURCE_URL=http://localhost:8099.
 * Ne jamais viser une base de production : le script ajoute des données fictives.
 */
import { createDb } from '../packages/db/src/client';
import { runMigrations } from '../packages/db/src/migrate';
import {
  recordClassification,
  recordPlace,
  recordQuoteScore,
  recordSummary,
  setMedia,
  upsertItem,
  upsertSources,
} from '../packages/db/src/write';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL manquant');
if (!/localhost|127\.0\.0\.1/.test(url)) throw new Error('Jeu d’essai réservé à une base locale');
const PORT = Number(process.env.FIXTURE_PORT ?? 8099);
const FIXTURES = `http://localhost:${PORT}`;

const db = createDb(url);
await runMigrations(db);
await upsertSources(db, [
  { id: 'yt:seed-official', kind: 'youtube', name: 'David Lisnard', active: true },
  { id: 'yt:seed-tv', kind: 'youtube', name: 'Chaînes TV', active: true },
  { id: 'rss:seed-press', kind: 'rss', name: 'Presse', active: true },
]);

type Theme =
  | 'economy'
  | 'security'
  | 'immigration'
  | 'education'
  | 'institutions'
  | 'international'
  | 'campaign';

interface Seed {
  key: string;
  title: string;
  outlet: string;
  kind: string;
  themes: Theme[];
  daysAgo: number;
  durationS?: number;
  live?: 'live' | 'upcoming';
  press?: boolean;
  official?: boolean;
  summary?: boolean;
  place?: { label: string; lat: number; lon: number; approximate?: boolean };
}

const OUTLETS = ['BFMTV', 'CNews', 'France Inter', 'LCI', 'Europe 1', 'Sud Radio', 'RTL'];
const TOPICS: [string, Theme[]][] = [
  ['Dette publique : « Il faut sortir de l’addiction à la dépense »', ['economy']],
  ['Insécurité : David Lisnard veut des polices municipales renforcées', ['security']],
  ['Immigration : la proposition de référendum', ['immigration', 'institutions']],
  ['École : « Remettre l’instruction au centre »', ['education']],
  ['Décentralisation et libertés locales', ['institutions']],
  ['Ukraine, Europe : la position de David Lisnard', ['international']],
  ['Meeting de campagne à Lyon', ['campaign']],
  ['Fiscalité des entreprises et simplification', ['economy', 'institutions']],
  ['Narcotrafic : l’État doit reprendre le contrôle', ['security', 'institutions']],
  ['Agriculture : soutenir ceux qui nourrissent le pays', ['economy']],
];
const PLACES = [
  { label: 'Lyon, Rhône', lat: 45.764, lon: 4.8357 },
  { label: 'Marseille, Bouches-du-Rhône', lat: 43.2965, lon: 5.3698 },
  { label: 'Lille, Nord', lat: 50.6292, lon: 3.0573 },
  { label: 'Bretagne', lat: 48.2, lon: -2.9, approximate: true },
  { label: 'Toulouse, Haute-Garonne', lat: 43.6047, lon: 1.4442 },
];

const seeds: Seed[] = [
  {
    key: 'live',
    title: 'DIRECT – Grand meeting de David Lisnard à Marseille',
    outlet: 'David Lisnard',
    kind: 'meeting',
    themes: ['campaign'],
    daysAgo: 0,
    live: 'live',
    official: true,
    place: PLACES[1],
  },
  {
    key: 'upcoming',
    title: 'Invité de la matinale : David Lisnard',
    outlet: 'France Inter',
    kind: 'radio',
    themes: [],
    daysAgo: -1,
    live: 'upcoming',
  },
];
for (let i = 0; i < 46; i++) {
  const [title, themes] = TOPICS[i % TOPICS.length] as [string, Theme[]];
  const press = i % 5 === 3;
  const official = i % 4 === 0 && !press;
  seeds.push({
    key: `past-${i}`,
    title: `${title}${i >= TOPICS.length ? ` (${Math.floor(i / TOPICS.length) + 1})` : ''}`,
    outlet: official ? 'David Lisnard' : (OUTLETS[i % OUTLETS.length] as string),
    kind: press ? 'presse' : official ? 'stream' : i % 3 === 0 ? 'radio' : 'tv',
    themes,
    daysAgo: 1 + Math.floor(i * 0.9),
    durationS: press ? undefined : i % 2 === 0 ? 1500 + i * 30 : 90 + i * 3,
    press,
    official,
    summary: !press && i % 3 !== 2,
    place: i % 6 === 0 ? PLACES[(i / 6) % PLACES.length] : undefined,
  });
}

const day = 86_400_000;
const now = Date.now();
let quotes = 0;
for (const [index, s] of seeds.entries()) {
  const publishedAt = new Date(now - s.daysAgo * day - 3_600_000);
  const sourceId = s.press ? 'rss:seed-press' : s.official ? 'yt:seed-official' : 'yt:seed-tv';
  const { id } = await upsertItem(db, {
    sourceId,
    platformId: `seed:${s.key}`,
    url: s.press
      ? `https://exemple-presse.test/article-${s.key}`
      : `https://www.youtube.com/watch?v=seed-${s.key}`,
    outlet: s.official ? null : s.outlet,
    title: s.title,
    description: s.press
      ? `${s.title} - ${s.outlet}`
      : `Retrouvez l’intervention de David Lisnard sur ${s.outlet}.\n\nAbonnez-vous à la chaîne pour ne rien manquer. Les liens vers les réseaux sociaux et le programme complet sont dans la description, ainsi que les chapitres de l’émission et les références citées pendant l’entretien.`,
    publishedAt: s.live === 'upcoming' ? new Date(now - 3_600_000) : publishedAt,
    startsAt:
      s.live === 'upcoming'
        ? new Date(now + 20 * 3_600_000)
        : s.live === 'live'
          ? new Date(now - 42 * 60_000)
          : null,
    liveStatus: s.live ?? 'none',
    thumbnailUrl: `${FIXTURES}/thumb/${index % 6}.png`,
    durationS: s.durationS ?? null,
  });
  await recordClassification(db, {
    itemId: id,
    model: 'seed',
    questionsVersion: 0,
    inputHash: `seed-${s.key}`,
    answers: {
      intervient: 1,
      role: { choice: 'national', confidence: 1, probabilities: {} },
      kind: { choice: s.kind, confidence: 1, probabilities: {} },
      themes: Object.fromEntries(s.themes.map((t) => [t, 0.9])),
    },
    thresholds: { intervient: 0.75, role: 0.6, theme: 0.5 },
    outcome: 'published',
    role: 'national',
    kind: s.kind,
    themes: s.themes,
  });
  await setMedia(
    db,
    id,
    s.press
      ? {
          kind: 'link',
          og: {
            title: s.title,
            siteName: s.outlet,
            image: `${FIXTURES}/thumb/${index % 6}.png`,
          },
        }
      : {
          kind: 'embed',
          provider: 'youtube',
          embedUrl: `https://www.youtube.com/embed/seed-${s.key}`,
        },
  );
  if (s.summary) {
    const quoteRows = [
      {
        text: 'Nous devons libérer le travail et l’initiative, et cesser de tout attendre de l’État.',
        startS: 95 + index,
        theme: s.themes[0] ?? null,
      },
      {
        text: 'La sécurité est la première des libertés, et c’est aux élus de la garantir.',
        startS: 610 + index,
        theme: 'security',
      },
    ];
    await recordSummary(
      db,
      id,
      {
        kind: 'ok',
        text: `David Lisnard détaille ses propositions sur ${s.outlet}. Il plaide pour une baisse de la dépense publique et une simplification des normes.\n\nIl revient aussi sur la place des collectivités locales et sur sa candidature.`,
        points: [
          'Baisse de la dépense publique et des normes',
          'Davantage de libertés pour les collectivités',
          'Un référendum sur les grandes réformes',
        ],
        model: 'seed',
        promptVersion: 0,
        generatedAt: new Date().toISOString(),
        cost: 0,
      },
      quoteRows,
    );
    quotes += quoteRows.length;
  }
  if (s.place)
    await recordPlace(db, id, {
      onSite: true,
      label: s.place.label,
      city: s.place.label.split(',')[0] ?? null,
      lat: s.place.lat,
      lon: s.place.lon,
      approximate: s.place.approximate ?? false,
      model: 'seed',
      promptVersion: 0,
      generatedAt: new Date().toISOString(),
      cost: 0,
    });
}
// Citations notées : les récapitulatifs mettent en avant la plus marquante (ADR 0031).
const scored = await db.$client.unsafe('select id from quote');
for (const [i, row] of (scored as { id: string }[]).entries())
  await recordQuoteScore(db, row.id, (i % 10) / 10, 1);
console.log(JSON.stringify({ msg: 'jeu d’essai prêt', interventions: seeds.length, quotes }));
await db.$client.close();

// Miniatures (aplats aux couleurs de la charte) et données d'adhésion factices.
const COLORS = ['#1d257a', '#b0ad85', '#52c985', '#0f1752', '#3a4290', '#8c8a68'];
const thumb = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="${color}"/><circle cx="640" cy="360" r="120" fill="#f9f9f9" fill-opacity="0.25"/></svg>`;
const history = Array.from({ length: 90 }, (_, i) => ({
  jour: new Date(now - (89 - i) * day).toISOString().slice(0, 10),
  adherents: 18_000 + i * 45 + (i % 7) * 12,
}));
Bun.serve({
  port: PORT,
  fetch(req) {
    const path = new URL(req.url).pathname;
    const match = /^\/thumb\/(\d)\.png$/.exec(path);
    if (match)
      return new Response(thumb(COLORS[Number(match[1])] ?? '#1d257a'), {
        headers: { 'Content-Type': 'image/svg+xml' },
      });
    if (path.endsWith('/historique.json')) return Response.json({ jours: history });
    return Response.json({ adherents: 22_100, mis_a_jour: new Date(now).toISOString() });
  },
});
console.log(JSON.stringify({ msg: 'données factices servies', url: FIXTURES }));
