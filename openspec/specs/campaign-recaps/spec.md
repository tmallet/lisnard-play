# campaign-recaps Specification

## Purpose
Récapitulatifs du jour et de la semaine de la campagne de David Lisnard, destinés à être
partagés (compte X de Lisnard Play) et menant à la page Campagne.

## Requirements
### Requirement: Citation la plus marquante
Chaque citation DOIT recevoir une note « marquante » entre 0 et 1, donnée par le
classifieur Jev, une seule fois par version de la question. La note DOIT être gardée en
base et réutilisée par tous les récapitulatifs, sans nouvel appel. Une citation
régénérée avec son résumé DOIT être notée de nouveau.

#### Scenario: Notation à l'extraction
- **WHEN** une vidéo reçoit ses citations
- **THEN** chacune est notée par Jev au cycle suivant du worker, puis n'est plus jamais renvoyée au modèle tant que la question ne change pas

#### Scenario: Récapitulatifs sans appel au modèle
- **WHEN** le récapitulatif d'un jour ou d'une semaine est affiché plusieurs fois
- **THEN** aucun appel à Jev n'est fait ; la citation de plus haute note de la période est reprise

### Requirement: Contenu d'un récapitulatif
Un récapitulatif DOIT couvrir :
- soit un jour (heure de Paris) ;
- soit une semaine (du lundi au dimanche).

Il DOIT contenir :
- le nombre d'interventions visibles de la période qui ont eu lieu ou sont en cours (un
  direct ou un meeting annoncé pour plus tard n'y entre pas encore) ;
- les médias, regroupés avec leur nombre (sa chaîne comprise) ;
- les lieux des déplacements situés sur la carte ;
- la citation de plus haute note, avec son média ;
- quand les données d'adhésion sont disponibles, le total d'adhérents en fin de période,
  la hausse depuis la veille du début (sauf si la veille précède l'historique) et la
  courbe des jours concernés.

Un jour sans intervention N'A PAS de récapitulatif.

#### Scenario: Journée chargée
- **WHEN** le récapitulatif du 13 octobre 2026 est demandé
- **THEN** il compte les 18 interventions du jour, regroupe les médias (« BFMTV ×10 »), donne la hausse des adhérents depuis le 12 octobre et la citation la mieux notée du jour

#### Scenario: Jour sans intervention
- **WHEN** le récapitulatif d'un jour sans intervention est demandé
- **THEN** il n'existe pas, et l'adresse affiche la page Campagne ordinaire

### Requirement: Récapitulatif dans la page Campagne
La page Campagne DOIT afficher le récapitulatif d'une période à
`/campagne?jour=AAAA-MM-JJ` ou `/campagne?semaine=AAAA-MM-JJ` (date du lundi), avec la
liste de ses interventions et un lien vers chacune. Elle DOIT proposer une vue
« Récaps » listant les jours (avec intervention) et les semaines récents. Chaque
récapitulatif DOIT proposer :
- « Publier sur X », qui ouvre une rédaction X pré-remplie (période, nombre
  d'interventions, hausse des adhérents) avec le lien du récapitulatif ;
- « Partager ».

La publication reste manuelle.

#### Scenario: Publication du soir
- **WHEN** l'animateur du compte X ouvre la vue « Récaps » et touche « Publier sur X » sur le jour en cours
- **THEN** X s'ouvre avec un message comme « Mardi 13 octobre : 18 interventions, +1 955 adhérents. » et le lien `/campagne?jour=2026-10-13`

### Requirement: Aperçu du lien d'un récapitulatif
Chaque récapitulatif DOIT disposer d'une image PNG de 1200 × 630 pixels, aux couleurs
de la charte, à `/campagne/recap/jour/<date>.png` ou `/campagne/recap/semaine/<date>.png`.
L'image DOIT montrer :
- la période ;
- le nombre d'interventions et les médias ;
- la hausse des adhérents et la courbe ;
- la carte des lieux s'il y a des déplacements ;
- la citation mise en avant ;
- le nom et l'adresse du site ;
- la mention d'indépendance.

Le HTML servi pour l'adresse d'un récapitulatif DOIT porter, sans JavaScript, un titre,
une description, `og:image` vers cette image et `twitter:card` de valeur
`summary_large_image`.

#### Scenario: Lien publié sur X
- **WHEN** le lien `/campagne?jour=2026-10-13` est publié sur X
- **THEN** l'aperçu montre l'image du récapitulatif du 13 octobre

#### Scenario: Période inconnue
- **WHEN** l'image d'un jour sans intervention est demandée
- **THEN** le serveur répond 404, et la page garde ses métadonnées ordinaires
