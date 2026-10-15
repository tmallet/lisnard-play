/**
 * Rendu PNG de l'image d'une citation (ADR 0029) : satori met en page en SVG, resvg
 * convertit en PNG. Chargé par server.ts seulement (module natif, hors Metro) ;
 * empaqueté au build de l'image Docker.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

import { CARD_SIZE, type QuoteCardData, quoteCard } from './quote-card';

type Weight = 400 | 600 | 700 | 800;
const WEIGHTS: [Weight, string][] = [
  [400, '400Regular/Montserrat_400Regular.ttf'],
  [600, '600SemiBold/Montserrat_600SemiBold.ttf'],
  [700, '700Bold/Montserrat_700Bold.ttf'],
  [800, '800ExtraBold/Montserrat_800ExtraBold.ttf'],
];

let fonts: Promise<{ name: string; data: ArrayBuffer; weight: Weight }[]> | null = null;

/** Polices Montserrat du paquet déjà installé pour l'app, lues une fois. */
function loadFonts() {
  if (!fonts) {
    const dir = dirname(
      createRequire(import.meta.url).resolve('@expo-google-fonts/montserrat/package.json'),
    );
    fonts = Promise.all(
      WEIGHTS.map(async ([weight, file]) => ({
        name: 'Montserrat',
        data: await Bun.file(join(dir, file)).arrayBuffer(),
        weight,
      })),
    );
  }
  return fonts;
}

export async function renderQuoteImage(data: QuoteCardData): Promise<Uint8Array> {
  const svg = await satori(quoteCard(data) as never, {
    width: CARD_SIZE,
    height: CARD_SIZE,
    fonts: await loadFonts(),
  });
  return new Resvg(svg).render().asPng();
}
