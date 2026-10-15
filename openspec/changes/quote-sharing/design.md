## Context

- La page d'une citation est un gabarit pré-rendu au build (ADR 0011) : son HTML ne
  connaît pas la citation, et les robots d'aperçu n'exécutent pas le JavaScript.
- `server.ts` sert déjà l'image carrée de la citation, à partir de la citation lue par
  l'API interne (ADR 0029).

## Goals / Non-Goals

**Goals :**
- aperçus de lien justes pour les pages de citation dès maintenant ;
- partage sur X en un clic ;
- aucun traceur.

**Non-Goals :**
- rendu complet des pages par le serveur (SDK 58) ;
- aperçus des pages d'intervention.

## Decisions

Décision durable consignée dans l'ADR 0030. En résumé :

- **Réécriture de l'en-tête par `server.ts`** : pour une adresse de page de citation,
  le serveur lit la citation par l'API interne (comme pour l'image), puis transforme
  le HTML du gabarit au vol avec `HTMLRewriter`, intégré à Bun :
  - il remplace `<title>`, `description`, `og:title`, `og:description` ;
  - il ajoute `og:image` (variante paysage, avec largeur, hauteur et texte
    alternatif), `og:url`, `twitter:card` (`summary_large_image`) et `twitter:image`.

  Alternatives écartées :
  - attendre le SDK 58, qui laisse les liens génériques pendant des mois ;
  - pré-rendre une page par citation au build, impossible puisque les citations
    arrivent chaque jour.
- **Adresses absolues** : `og:url` et `og:image` sur le domaine public de la requête
  (`publicOrigin`), pour que les prévisualisations restent cohérentes. Rien n'est mis
  en cache par domaine.
- **Citation introuvable ou API en erreur** : le gabarit est servi tel quel, avec ses
  métadonnées génériques. La page s'occupe ensuite de la redirection côté client,
  comme aujourd'hui.
- **Variante paysage** : `quoteCard(data, 'landscape')` reprend la même composition
  (cadre, en-tête, guillemet, citation, signature, barre de lecture, pied) en
  1200 × 630, avec des tailles réduites. Elle est servie à `…/apercu.png` par la même
  route et le même cache, dont la clé inclut le format.
- **Bouton X** :
  - adresse `https://x.com/intent/post?text=…&url=…`, ouverte par `Linking.openURL`
    (sur mobile, l'app X la prend en charge) ;
  - texte « « citation » — David Lisnard », raccourci à 280 caractères en comptant
    23 caractères pour le lien, comme X le fait ;
  - aucun script de X n'est chargé.

## Risks / Trade-offs

- **Coût d'une lecture de citation pour chaque page de citation servie** → les pages
  de citation sont peu nombreuses à être consultées. La lecture est indexée (5 s
  près, ADR 0028). En cas d'échec, la page est servie sans attendre davantage.
- **Écart entre l'en-tête réécrit et celui que pose ensuite le client** → la page
  pose les mêmes titre et description une fois chargée (`PageHead`). Seules les
  balises d'image n'existent que côté serveur, et elles ne servent qu'aux robots.
- **Cache des aperçus par X et les messageries** → une citation régénérée garde
  parfois son ancien aperçu chez eux quelques jours. On n'y peut rien, et c'est
  acceptable.
