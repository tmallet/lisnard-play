import type { APIRoute } from 'astro';

import { quoteImage } from '@/server/quote-image-route';

/** Variante paysage d'une citation, 1200 × 630 (aperçus de lien, ADR 0030). */
export const GET: APIRoute = (context) => quoteImage(context, 'landscape');
