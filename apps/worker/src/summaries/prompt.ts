/**
 * Consigne des résumés de vidéos (spec intervention-summaries, ADR 0021). Toute
 * modification du texte ou du schéma incrémente PROMPT_VERSION : les résumés existants
 * seront régénérés au fil des cycles (design D2).
 */
// v2 : résumés plus détaillés, proportionnés à la durée (demande du porteur du projet).
// v3 : modèle plus puissant pour les vidéos longues (résumé du débat trop vague en v2).
export const PROMPT_VERSION = 3;

/** Modèles épinglés (ADR 0021), servis par Google AI Studio, seul à lire les URL YouTube. */
export const SUMMARY_MODEL = 'google/gemini-3.5-flash-lite';
/** Interviews, débats et meetings : le modèle « lite » y reste trop général. */
export const SUMMARY_MODEL_LONG = 'google/gemini-3.8-flash';
/** Au-delà de cette durée, ou si elle est inconnue, le modèle long est utilisé. */
export const LONG_VIDEO_S = 20 * 60;

export function summaryModelFor(durationS: number | null): string {
  return durationS === null || durationS > LONG_VIDEO_S ? SUMMARY_MODEL_LONG : SUMMARY_MODEL;
}

export interface SummaryContext {
  title: string;
  outlet: string;
}

export function summaryInstructions({ title, outlet }: SummaryContext): string {
  return [
    `Vidéo publiée par ${outlet}, intitulée « ${title} ».`,
    'Indique d’abord si David Lisnard, candidat à l’élection présidentielle 2027, s’exprime lui-même dans cette vidéo (speaks).',
    'S’il s’exprime, résume en français ce qu’il dit :',
    '- summary : un résumé développé, proportionné à la durée de la vidéo : trois ou quatre phrases pour un extrait de moins de trois minutes, jusqu’à trois courts paragraphes (dix phrases au plus) pour une interview, un discours ou un débat. Sépare les paragraphes par une ligne vide ;',
    '- suis l’ordre des sujets abordés et précise ses propositions concrètes, les chiffres et les exemples qu’il donne ;',
    '- le ton est factuel et neutre, et les propos sont explicitement attribués (« Il estime que… », « Il propose… ») ;',
    '- points : trois à six idées clés, de quelques mots chacune ;',
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
