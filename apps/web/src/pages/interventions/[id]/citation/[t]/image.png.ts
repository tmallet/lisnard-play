import type { APIRoute } from 'astro';

import { quoteImage } from '@/server/quote-image-route';

/** Image carrée d'une citation, 1080 × 1080 (« Partager en image »). */
export const GET: APIRoute = (context) => quoteImage(context, 'square');
