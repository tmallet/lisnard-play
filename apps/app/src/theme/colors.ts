/**
 * Palette de la charte (ADR 0001, ADR 0012) pour les API qui exigent une valeur JS
 * (options natives, document HTML). Partout ailleurs : classes Uniwind (global.css).
 * Toute valeur doit rester identique au token CSS correspondant.
 */
export const colors = {
  bleu: '#1d257a',
  bleuSombre: '#0f1752',
  chamois: '#b0ad85',
  blanc: '#f9f9f9',
  emeraude: '#52c985',
} as const;

/** Texte secondaire : blanc à 70 % (équivalent de la classe text-blanc/70). */
export const blancSecondaire = 'rgba(249, 249, 249, 0.7)';
