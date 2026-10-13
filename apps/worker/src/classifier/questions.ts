/**
 * Questions posées au classifieur (specs intervention-classification et
 * intervention-themes, ADR 0020).
 * Toute modification du texte ou des options incrémente QUESTIONS_VERSION : les
 * contenus seront reclassés automatiquement (empreinte d'entrée, design D4).
 */
import { THEMES, type Theme } from '@lisnard/db/schema';

export const QUESTIONS_VERSION = 3;

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

/** Définition de chaque thème, reprise de la spec intervention-themes. */
const THEME_DEFINITIONS: Record<Theme, string> = {
  economie:
    "l'économie : fiscalité, impôts, dépenses et dette publiques, entreprises, emploi, travail, retraites, pouvoir d'achat",
  securite: 'la sécurité : délinquance, criminalité, justice, police, prisons, ordre public',
  immigration: "l'immigration : flux migratoires, asile, intégration, nationalité, frontières",
  education: "l'éducation : école, enseignants, jeunesse, enseignement supérieur, formation",
  institutions:
    "les institutions : fonctionnement de l'État, réforme institutionnelle, Constitution, décentralisation, libertés locales, vie démocratique, bureaucratie",
  international:
    "l'international : Union européenne, diplomatie, guerres et conflits, défense, armées, relations avec d'autres pays",
  campagne:
    "la vie de sa campagne elle-même : meeting, déplacement de campagne, soutiens et ralliements, organisation de Nouvelle Énergie, parrainages, stratégie électorale, sondages qu'il commente. Pas une prise de position sur un sujet de fond",
};

/** Clé de la question d'un thème dans la requête System One. */
export const themeQuestionKey = (theme: Theme) => `theme_${theme}` as const;

const THEME_QUESTIONS = Object.fromEntries(
  THEMES.map((theme) => [
    themeQuestionKey(theme),
    {
      type: 'noul',
      instructions: `David Lisnard aborde-t-il dans ce contenu ${THEME_DEFINITIONS[theme]} ? Répondre vrai si ce sujet est traité, même parmi d'autres ; faux s'il n'est pas évoqué ou seulement en passant.`,
    },
  ]),
) as Record<`theme_${Theme}`, { type: 'noul'; instructions: string }>;

export const QUESTIONS = {
  intervient: {
    type: 'noul',
    // v2 : les déclarations rapportées comptent comme une prise de parole (calibration du 2026-10-13).
    instructions:
      "Ce contenu rapporte une prise de parole de David Lisnard lui-même : interview, débat, discours, meeting ou déplacement de campagne, tribune, vidéo où il s'exprime, publication de sa part, ou article reprenant ses déclarations (« déclare », « affirme », « estime », « souhaite » David Lisnard, ou citation entre guillemets de ses propos). C'est faux si le contenu parle de lui sans rapporter ce qu'il a dit : analyse, portrait, sondage, cote, anecdote ou incident le concernant, ralliements, soutiens, ou propos d'autres personnes à son sujet.",
  },
  role: {
    type: 'choice',
    // v3 : seul national est publiable (ADR 0020) ; amf seulement s'il parle au nom des maires.
    instructions:
      "À quel titre David Lisnard intervient-il principalement dans ce contenu ? Il est candidat à la présidentielle 2027 : par défaut, et notamment pour toute interview dans un média national, choisir national, y compris quand il évoque les communes ou la décentralisation dans son programme. Choisir amf seulement s'il s'exprime explicitement en tant que président de l'Association des maires de France, au nom des maires. Le fait qu'il soit présenté comme maire de Cannes ne suffit pas à choisir mairie.",
    criteria: {
      national:
        "Candidat à l'élection présidentielle 2027, fondateur de Nouvelle Énergie, ou responsable politique national : programme, économie, sécurité, institutions, actualité nationale ou internationale, même illustrée par un exemple local.",
      amf: "Président de l'Association des maires de France (AMF), au nom des maires : congrès des maires, finances des collectivités, négociations entre l'AMF et l'État.",
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
  ...THEME_QUESTIONS,
} as const;

/** Description tronquée : borne la taille de l'état envoyé (design D4). */
export const MAX_DESCRIPTION = 2000;
