/**
 * Consigne des résumés de vidéos (spec intervention-summaries, ADR 0021). Toute
 * modification du texte ou du schéma incrémente PROMPT_VERSION : les résumés existants
 * seront régénérés au fil des cycles (design D2).
 */
export const PROMPT_VERSION = 1;

/** Modèle épinglé (ADR 0021), servi par Google AI Studio, seul à lire les URL YouTube. */
export const SUMMARY_MODEL = 'google/gemini-3.5-flash-lite';

export interface SummaryContext {
  title: string;
  outlet: string;
}

export function summaryInstructions({ title, outlet }: SummaryContext): string {
  return [
    `Vidéo publiée par ${outlet}, intitulée « ${title} ».`,
    'Indique d’abord si David Lisnard, candidat à l’élection présidentielle 2027, s’exprime lui-même dans cette vidéo (speaks).',
    'S’il s’exprime, résume en français ce qu’il dit :',
    '- summary : trois phrases au plus, factuelles et neutres, qui attribuent explicitement les propos (« Il estime que… », « Il propose… ») ;',
    '- points : deux à quatre idées clés, de quelques mots chacune ;',
    '- aucune opinion, aucun jugement, aucune citation de plus de quinze mots ;',
    '- rien qui ne figure pas dans la vidéo.',
    'S’il ne s’exprime pas, renvoie speaks à false, summary vide et points vide.',
  ].join('\n');
}

/** Schéma de sortie structurée demandé au modèle. */
export const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    speaks: { type: 'boolean' },
    summary: { type: 'string' },
    points: { type: 'array', items: { type: 'string' } },
  },
  required: ['speaks', 'summary', 'points'],
  additionalProperties: false,
} as const;
