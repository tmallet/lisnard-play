## Context

Motivation : `proposal.md`. Décisions d'origine : ADR 0024 (notifications), ADR 0021
(résumés). Capture du 15 octobre 2026 sur iPhone : titre coupé vers 30 caractères,
« from Lisnard Play » ajouté par iOS, une seule ligne de texte en mode replié, deux à
quatre lignes une fois dépliée.

## Decisions

### D1 — Données de l'événement (`listNotificationEvents`)

En plus de `itemId`, `kind`, `title` et `outlet`, chaque événement porte :
- `official` (source officielle) et `interventionKind` (`presse`, `tv`…) ;
- `startsAt` (rappel) et `durationS` (vidéo) ;
- `thumbnailUrl`, avec repli sur l'image Open Graph pour un article ;
- `summaryLead` : première phrase du résumé s'il est de type `ok`.

**Attente du résumé** : une `new_item` de source YouTube n'est retenue que si
`summary is not null` ou si `first_seen_at <= now() - interval '10 minutes'`. Les
articles de presse (source RSS) n'attendent pas : ils n'ont pas de résumé (ADR 0021).

### D2 — Messages (`src/notifications/message.ts`)

- **Titres** :
  - `live` → « 🔴 David Lisnard est en direct » ;
  - `reminder` → « ⏰ Dans 15 min : David Lisnard en direct » ;
  - `new_item` d'une source officielle → « 🎥 Nouvelle vidéo de David Lisnard » ;
  - autre `new_item` → « 📰 David Lisnard sur <média> », ou « dans <média> » quand le
    type est `presse` ou `podcast`.
- **Texte**, parties séparées par « · », assemblé dans l'ordre :
  1. titre lisible (D3) ;
  2. média, sauf pour la chaîne officielle et quand le titre le nomme déjà ;
  3. « à 8 h 30 » pour un rappel (heure de Paris) ;
  4. durée « 2 min » ou « 1 h 05 » pour une vidéo ;
  5. puis, sur une nouvelle ligne, la première phrase du résumé, tronquée à 140
     caractères.
- **Image** : miniature en grand format (`hq720` pour YouTube, comme les cartes de
  l'app), jointe au message Web Push (`image`) et Expo (`richContent.image`).

### D3 — Titres en majuscules

Un titre dont au moins 70 % des lettres sont des majuscules, et qui compte au moins
8 lettres, est remis en minuscules puis la première lettre est remise en majuscule.
Une courte liste de sigles est rétablie (BFMTV, RMC, LCI, CNEWS, TF1, LFI, RN, PS,
LR, UE, IA, PME, TVA, CSG, SNCF, EDF, RSA, SMIC). Un titre en casse mixte n'est pas
modifié.

### D4 — Service worker

`public/sw.js` passe `image` à `showNotification`. Le texte garde son saut de ligne :
iOS l'affiche une fois la notification dépliée.

## Risks / Trade-offs

- **[Sigles non listés]** : un sigle absent de la liste passe en minuscules (« la
  bce »). C'est un risque limité, puisque la liste se complète facilement, et
  préférable à un titre illisible.
- **[Retard des nouvelles vidéos]** : 10 minutes au plus, assumé. Les directs ne sont
  pas concernés.
