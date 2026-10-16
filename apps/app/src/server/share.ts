/**
 * Point d'entrée des aperçus de partage pour server.ts (ADR 0029, 0030, 0031) : routes
 * d'images et réécriture de l'en-tête. Empaqueté en un seul fichier pour l'image Docker.
 */
export { createQuoteImageHandler, quoteImageParams } from './quote-image-route';
export { quotePageMeta, quotePageParams, withPageMeta } from './quote-page';
export { readQuote } from './quote-share';
export {
  createRecapImageHandler,
  readRecap,
  recapImageParams,
  recapPageMeta,
  recapPageParams,
} from './recap-page';
