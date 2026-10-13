import type { SourceConfig } from './sources/types';

/**
 * Sources collectées (design D3). Identifiants de chaînes résolus et vérifiés le
 * 2026-10-13 via channels.list?forHandle (titre, pays, nombre d'abonnés).
 * Ajouter une source : skill add-intervention-source.
 */
export const SOURCES: SourceConfig[] = [
  // Chaîne de David Lisnard, liée depuis unenouvelleenergie.fr (@david_lisnard).
  {
    id: 'yt:david-lisnard',
    kind: 'youtube',
    name: 'David Lisnard',
    channelId: 'UC2XZY-bjIEmyLZ9MPJQytZg',
    official: true,
    active: true,
  },
  {
    id: 'yt:bfmtv',
    kind: 'youtube',
    name: 'BFMTV',
    channelId: 'UCXwDLMDV86ldKoFVc_g8P0g',
    active: true,
  },
  {
    id: 'yt:cnews',
    kind: 'youtube',
    name: 'CNEWS',
    channelId: 'UCXKJrYczY2_fJEZgFPGY0HQ',
    active: true,
  },
  {
    id: 'yt:franceinfo',
    kind: 'youtube',
    name: 'franceinfo',
    channelId: 'UCO6K_kkdP-lnSCiO3tPx7WA',
    active: true,
  },
  {
    id: 'yt:lci',
    kind: 'youtube',
    name: 'LCI',
    channelId: 'UCewhc0fvja891XkpIPGRMxQ',
    active: true,
  },
  {
    id: 'yt:public-senat',
    kind: 'youtube',
    name: 'Public Sénat',
    channelId: 'UCTa1bPArjpvNMgSHAb_pflA',
    active: true,
  },
  {
    id: 'yt:lcp',
    kind: 'youtube',
    name: 'LCP - Assemblée nationale',
    channelId: 'UCHGFbA0KWBgf6gMbyUCZeCQ',
    active: true,
  },
  {
    id: 'yt:sud-radio',
    kind: 'youtube',
    name: 'Sud Radio',
    channelId: 'UCESTwDXpoMgiYBHipMdKTkQ',
    active: true,
  },
  {
    id: 'yt:rtl',
    kind: 'youtube',
    name: 'RTL',
    channelId: 'UC_ykXc7v9zZQdOG5QvJqpgg',
    active: true,
  },
  {
    id: 'yt:europe1',
    kind: 'youtube',
    name: 'Europe 1',
    channelId: 'UCIMGfEAERXjmWwQeg15BFsg',
    active: true,
  },
  {
    id: 'yt:france-inter',
    kind: 'youtube',
    name: 'France Inter',
    channelId: 'UCJldRgT_D7Am-ErRHQZ90uw',
    active: true,
  },
  {
    id: 'yt:le-figaro',
    kind: 'youtube',
    name: 'Le Figaro',
    channelId: 'UCCDz_XYeKWd0OIyjp95dqyQ',
    active: true,
  },
  {
    id: 'yt:le-parisien',
    kind: 'youtube',
    name: 'Le Parisien',
    channelId: 'UCfHn_8-ehdem86fEvlFg-Gw',
    active: true,
  },
  {
    id: 'rss:google-news',
    kind: 'rss',
    name: 'Google News',
    url: 'https://news.google.com/rss/search?q=%22David%20Lisnard%22&hl=fr&gl=FR&ceid=FR:fr',
    outletFromItem: true,
    active: true,
  },
];
