/**
 * Rendu PNG de l'image d'une citation (ADR 0029) : satori met en page en SVG, resvg
 * convertit en PNG. Chargé par server.ts seulement (module natif, hors Metro) ;
 * empaqueté au build de l'image Docker.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import { renderAsync } from '@resvg/resvg-js';
import satori from 'satori';

import { type CardFormat, cardSize, type QuoteCardData, quoteCard } from './quote-card';
import { RECAP_SIZE, type RecapCardData, recapCard } from './recap-card';

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

export async function renderQuoteImage(
  data: QuoteCardData,
  format: CardFormat = 'square',
): Promise<Uint8Array> {
  const svg = await satori(quoteCard(data, format) as never, {
    ...cardSize(format),
    fonts: await loadFonts(),
  });
  // Conversion en PNG sur un fil à part : le serveur continue de répondre pendant ce temps.
  return (await renderAsync(svg)).asPng();
}

/** Image d'un récapitulatif (ADR 0031), même rendu que les citations. */
export async function renderRecapImage(data: RecapCardData): Promise<Uint8Array> {
  const svg = await satori(recapCard(data) as never, { ...RECAP_SIZE, fonts: await loadFonts() });
  return (await renderAsync(svg)).asPng();
}
