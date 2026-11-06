## 1. Données et API

- [ ] 1.1 Ajouter le filtre par format à `listPublished`, avec le seuil de 300 secondes (`packages/db/src/read.ts`)
- [ ] 1.2 Tester les limites : 300 s, 301 s, durée inconnue, lien sans lecteur, format combiné au thème et pagination
- [ ] 1.3 Ajouter le paramètre `format` à `interventions.list` et tester le rejet d'une valeur inconnue (`packages/api`)

## 2. Accueil

- [ ] 2.1 Rendre le composant de pastilles générique, utilisé par le filtre de thème
- [ ] 2.2 Ajouter la rangée de format sous les thèmes dans `InterventionFeed`, appliquée à la seule requête « Passées »
- [ ] 2.3 Adapter le message d'absence de résultat, et l'invitation aux notifications quand un format est choisi
- [ ] 2.4 Tester le filtre (composant et accueil), puis vérifier à 375 px et sur le web

## 3. Vérification

- [ ] 3.1 Contrôler un échantillon de liens `tv` et `radio` classés « Articles »
- [ ] 3.2 Lancer `bun run check` et `bun run smoke:web`

## 4. Documentation

- [ ] 4.1 Passer en revue `docs/architecture/README.md` (API et accueil) et `apps/app/AGENTS.md`, `packages/db/AGENTS.md`, `packages/api/AGENTS.md`
- [ ] 4.2 Vérifier que l'ADR 0033 et son index reflètent le seuil livré
- [ ] 4.3 Vérifier qu'aucun skill n'est à mettre à jour (`charte-ui`, `trpc-procedure`)
