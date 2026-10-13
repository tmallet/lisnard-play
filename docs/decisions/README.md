# Décisions d'architecture (ADR)

Source durable du « pourquoi » du projet. Chaque fichier `NNNN-slug.md` porte
un frontmatter typé (voir [`_template.md`](_template.md)). Pour créer ou
remplacer un ADR, suivre le skill `record-decision`.

Règles :
- Numérotation séquentielle sur 4 chiffres, jamais réutilisée.
- Un ADR `accepted` ne se réécrit pas sur le fond : on crée un nouvel ADR qui
  le remplace (`supersedes`), puis on passe l'ancien en `superseded`.
- Cet index liste tous les ADR, une ligne chacun, triés par numéro.

| ID   | Titre | Statut | Tags |
|------|-------|--------|------|
| [0001](0001-application-independante.md) | Application indépendante, non affiliée à la campagne | accepted | produit, juridique, charte |
| [0002](0002-stack-technique.md) | Stack technique — Expo, Bun, tRPC, Uniwind | accepted | architecture, stack |
| [0003](0003-web-d-abord-worker-separe.md) | Web d'abord, API routes tRPC et worker d'ingestion séparé | superseded | architecture, web, ingestion |
| [0004](0004-classification-jev-openrouter.md) | Classifier la pertinence avec Jev via OpenRouter (System One) | accepted | ingestion, ia, classifier |
| [0005](0005-publication-automatique-journal.md) | Publication tout automatique et journal des décisions du classifieur | accepted | ingestion, ia, classifier, notifications |
| [0006](0006-perimetre-des-interventions.md) | Périmètre des interventions — tout sauf la mairie de Cannes | accepted | produit, perimetre, classifier |
| [0007](0007-rendu-medias-oembed.md) | Rendu des médias — intégration oEmbed, sinon lien vers la source | accepted | ingestion, media, ui |
| [0008](0008-systeme-de-documentation.md) | Système de documentation structuré pour les agents de codage | accepted | documentation, outillage, agents |
| [0009](0009-outillage-qualite.md) | Outillage qualité — Biome, bun test, jest-expo, smoke test web, GitHub Actions | accepted | outillage, qualite, ci |
| [0010](0010-asdf-et-devcontainer.md) | Versions d'outils via asdf et devcontainer bac à sable pour agents | accepted | outillage, environnement, agents, securite |
| [0011](0011-rendu-web-prerendu-sdk57.md) | Web d'abord — pré-rendu et API routes en SDK 57, SSR à la montée en SDK 58 | accepted | architecture, web, ingestion |
| [0012](0012-sources-charte-graphique.md) | Sources de la charte graphique — référence numérique, typographie et éléments exclus | accepted | charte, produit, juridique |
