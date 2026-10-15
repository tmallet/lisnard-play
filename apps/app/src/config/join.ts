/**
 * Invitation à adhérer (spec app-shell, ADR 0025). Lien de parrainage de l'éditeur :
 * changer de lien ne touche que ce fichier.
 */
export const JOIN = {
  url: 'https://soutenir.unenouvelleenergie.fr/p/HDEKQSMA',
  title: 'Vous partagez ces idées ?',
  pitch:
    'Adhérez à Nouvelle Énergie, le parti de David Lisnard, pour soutenir sa candidature et faire entendre votre voix.',
  button: 'Adhérer à Nouvelle Énergie',
  /** Bouton sur téléphone, dans l'encart compact de l'accueil. */
  buttonShort: 'Adhérer',
  disclosure:
    'Site du parti, ouvert dans un nouvel onglet. Lien de parrainage de l’éditeur de ce site : votre adhésion lui sera rattachée.',
  /** Mention courte (encart compact sur téléphone) : site du parti et parrainage restent dits. */
  disclosureShort: 'Site du parti · lien de parrainage de l’éditeur de ce site.',
} as const;
