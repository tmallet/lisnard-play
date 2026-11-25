/**
 * Images de partage (ADR 0029, 0031) : satori met en page en SVG, resvg convertit en PNG.
 * Montserrat vient des fichiers `woff` de @fontsource (sous-ensembles latin et latin-ext,
 * satori passe de l'un à l'autre glyphe par glyphe). Cache : `image-cache.ts`.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import satori from 'satori';

import { type CardFormat, cardSize, type QuoteCardData, quoteCard } from './quote-card';
import { RECAP_SIZE, type RecapCardData, recapCard } from './recap-card';

type Weight = 400 | 600 | 700 | 800;
const WEIGHTS: Weight[] = [400, 600, 700, 800];
const SUBSETS = ['latin', 'latin-ext'];

let fonts: Promise<{ name: string; data: ArrayBuffer; weight: Weight }[]> | null = null;

/** Polices lues une fois, dans le paquet installé (copié dans l'image Docker). */
function loadFonts() {
  if (!fonts) {
    const dir = join(
      dirname(createRequire(import.meta.url).resolve('@fontsource/montserrat/package.json')),
      'files',
    );
    fonts = Promise.all(
      WEIGHTS.flatMap((weight) =>
        SUBSETS.map(async (subset) => ({
          name: 'Montserrat',
          data: await Bun.file(
            join(dir, `montserrat-${subset}-${weight}-normal.woff`),
          ).arrayBuffer(),
          weight,
        })),
      ),
    );
  }
  return fonts;
}

async function toPng(svg: string): Promise<Uint8Array> {
  // Module natif chargé à la première image : un binaire absent n'empêche pas le site de
  // démarrer, seule l'image répond 503. Conversion sur un fil à part.
  const { renderAsync } = await import('@resvg/resvg-js');
  return (await renderAsync(svg)).asPng();
}

export async function renderQuoteImage(
  data: QuoteCardData,
  format: CardFormat,
): Promise<Uint8Array> {
  const svg = await satori(quoteCard(data, format) as never, {
    ...cardSize(format),
    fonts: await loadFonts(),
  });
  return toPng(svg);
}

export async function renderRecapImage(data: RecapCardData): Promise<Uint8Array> {
  const svg = await satori(recapCard(data) as never, { ...RECAP_SIZE, fonts: await loadFonts() });
  return toPng(svg);
}
