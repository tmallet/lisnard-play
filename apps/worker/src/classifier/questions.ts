/**
 * Questions posées au classifieur (spec intervention-classification, ADR 0006).
 * Toute modification du texte ou des options incrémente QUESTIONS_VERSION : les
 * contenus seront reclassés automatiquement (empreinte d'entrée, design D4).
 */
export const QUESTIONS_VERSION = 2;

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
    // v2 : les déclarations rapportées comptent comme une prise de parole (calibration du 2026-10-13).
    instructions:
      "Ce contenu rapporte une prise de parole de David Lisnard lui-même : interview, débat, discours, meeting ou déplacement de campagne, tribune, vidéo où il s'exprime, publication de sa part, ou article reprenant ses déclarations (« déclare », « affirme », « estime », « souhaite » David Lisnard, ou citation entre guillemets de ses propos). C'est faux si le contenu parle de lui sans rapporter ce qu'il a dit : analyse, portrait, sondage, cote, anecdote ou incident le concernant, ralliements, soutiens, ou propos d'autres personnes à son sujet.",
  },
  role: {
    type: 'choice',
    // v2 : « mairie » seulement si le sujet porte explicitement sur la ville de Cannes.
    instructions:
      "À quel titre David Lisnard intervient-il principalement dans ce contenu ? Il est candidat à la présidentielle 2027 : par défaut, et notamment pour toute interview dans un média national, choisir national. Choisir amf quand il s'exprime sur les communes, les maires, les collectivités ou les finances locales, ou en tant que président de l'AMF. Le fait qu'il soit présenté comme maire de Cannes ne suffit pas à choisir mairie.",
    criteria: {
      national:
        "Candidat à l'élection présidentielle 2027, fondateur de Nouvelle Énergie, ou responsable politique national : programme, économie, sécurité, institutions, actualité nationale ou internationale, même illustrée par un exemple local.",
      amf: "Président de l'Association des maires de France (AMF) : collectivités locales, maires, décentralisation, finances locales, relations avec l'État.",
      mairie:
        'Maire de Cannes, uniquement si le sujet porte explicitement sur la ville : vie municipale, Festival de Cannes, événements, travaux, sécurité ou communication institutionnelle de la ville.',
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
