/**
 * Questions posées au classifieur (spec intervention-classification, ADR 0006).
 * Toute modification du texte ou des options incrémente QUESTIONS_VERSION : les
 * contenus seront reclassés automatiquement (empreinte d'entrée, design D4).
 */
export const QUESTIONS_VERSION = 1;

export const ROLES = ['national', 'amf', 'mairie', 'hors_sujet'] as const;
export const KINDS = [
  'tv',
  'radio',
  'presse',
  'podcast',
  'meeting',
  'discours',
  'stream',
  'reseau_social',
] as const;

export type Role = (typeof ROLES)[number];
export type Kind = (typeof KINDS)[number];

export const QUESTIONS = {
  intervient: {
    type: 'noul',
    instructions:
      "David Lisnard s'exprime lui-même dans ce contenu (interview, débat, discours, meeting, tribune signée, prise de parole). Faux s'il est seulement cité, commenté ou évoqué par d'autres.",
  },
  role: {
    type: 'choice',
    instructions: 'À quel titre David Lisnard intervient-il principalement dans ce contenu ?',
    criteria: {
      national:
        "Candidat à l'élection présidentielle 2027, fondateur de Nouvelle Énergie, ou responsable politique national : programme, économie, sécurité, institutions, actualité nationale ou internationale, même illustrée par un exemple local.",
      amf: "Président de l'Association des maires de France (AMF) : collectivités locales, maires, décentralisation, finances locales, relations avec l'État.",
      mairie:
        'Maire de Cannes : vie municipale, Festival de Cannes, événements, travaux ou communication institutionnelle de la ville.',
      hors_sujet:
        "Le contenu ne porte pas sur une intervention de David Lisnard, ou il n'y joue aucun rôle.",
    },
  },
  kind: {
    type: 'choice',
    instructions: "Quel est le format de l'intervention ?",
    criteria: {
      tv: 'Émission ou interview télévisée',
      radio: 'Émission ou interview radio',
      presse: 'Interview ou tribune dans la presse écrite ou en ligne',
      podcast: 'Podcast',
      meeting: 'Meeting ou réunion publique de campagne',
      discours: 'Discours officiel (congrès, cérémonie, conférence)',
      stream: 'Vidéo ou direct publié par sa propre chaîne',
      reseau_social: 'Publication sur un réseau social',
    },
  },
} as const;

/** Description tronquée : borne la taille de l'état envoyé (design D4). */
export const MAX_DESCRIPTION = 2000;
