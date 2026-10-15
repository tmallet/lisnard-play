/**
 * Consigne d'extraction du lieu (spec intervention-places, ADR 0027). Changer la
 * consigne impose d'incrémenter PLACE_PROMPT_VERSION : les lieux sont recalculés.
 */
export const PLACE_PROMPT_VERSION = 1;

export interface PlaceContext {
  title: string;
  description: string;
  outlet: string;
}

export const PLACE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['on_site', 'city', 'department', 'precision'],
  properties: {
    on_site: { type: 'boolean' },
    city: { type: 'string' },
    department: { type: 'string' },
    precision: { type: 'string', enum: ['city', 'department', 'region', 'country', 'none'] },
  },
} as const;

export function placeInstructions({ title, description, outlet }: PlaceContext): string {
  return `Tu analyses une intervention publique de David Lisnard (vidéo ou article).
Détermine si elle s'est tenue SUR PLACE lors d'un déplacement (meeting, discours,
visite, rencontre, réunion publique, interview tournée en région), et où.

Règles :
- Le lieu est celui où l'intervention a eu lieu, jamais celui dont elle parle.
- Un plateau de télévision ou de radio, un studio, un podcast, une interview de presse,
  une vidéo face caméra ou un extrait d'émission : on_site = false.
- Si le lieu n'est pas indiqué clairement dans le titre ou la description : on_site =
  false. Ne devine pas, n'invente pas.
- city : la commune française où s'est tenue l'intervention. Si seule une région ou un
  département est connu (« en Alsace »), donne sa ville principale (Strasbourg) et
  precision = "region" ou "department". Vide si on_site = false.
- department : le nom du département de cette commune s'il est connu, sinon vide.
- precision : "city" si la commune est explicite, "department" ou "region" si seule la
  zone l'est, "country" pour un lieu hors de France, "none" si on_site = false.

Média : ${outlet}
Titre : ${title}
Description : ${description.slice(0, 1500)}`;
}
