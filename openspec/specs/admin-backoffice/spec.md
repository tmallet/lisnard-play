# admin-backoffice Specification

## Purpose
Backoffice réservé à l'exploitant de Lisnard Play pour modérer les vidéos publiées et
relancer leur résumé, sans accès direct à la base.

## Requirements
### Requirement: Accès au backoffice
Le backoffice DOIT être servi à `/admin` du site. Il NE DOIT être accessible qu'après :
- une connexion par mot de passe ;
- un code TOTP valide, ou un code de secours à usage unique.

Il DOIT exister un seul compte, créé par une commande d'exploitation, sans inscription
depuis le site. Les tentatives de connexion DOIVENT être limitées en fréquence. La
session DOIT expirer après une période d'inactivité. Les pages et l'API du backoffice
NE DOIVENT pas être indexables. Le cookie de session DOIT être restreint à `/admin`.

#### Scenario: Première connexion
- **WHEN** l'exploitant se connecte pour la première fois avec le mot de passe du compte créé par la commande
- **THEN** le backoffice lui impose d'associer une application d'authentification (code QR) et lui remet des codes de secours avant tout accès

#### Scenario: Code manquant
- **WHEN** une personne connaît le mot de passe mais pas le code TOTP
- **THEN** elle n'accède à aucune page ni aucune donnée du backoffice

#### Scenario: Inscription impossible
- **WHEN** quelqu'un tente de créer un compte par l'API d'authentification
- **THEN** la demande est refusée

### Requirement: Masquer une vidéo
L'exploitant DOIT pouvoir masquer une vidéo publiée, avec un motif facultatif, et la
réafficher. Une vidéo masquée NE DOIT apparaître nulle part sur le site ni dans l'app
(flux, détail, recherche, citations, récapitulatifs, carte, plan du site) et NE DOIT
déclencher aucune notification. Le masquage DOIT résister à une nouvelle
classification. L'effet DOIT être visible sur le site en une minute au plus.

#### Scenario: Vidéo hors sujet
- **WHEN** l'exploitant masque une vidéo publiée par erreur
- **THEN** elle disparaît du flux, de la recherche et des récapitulatifs, et son adresse répond comme une intervention introuvable

#### Scenario: Reclassement
- **WHEN** le classifieur reclasse une vidéo masquée
- **THEN** elle reste masquée

### Requirement: Relancer le résumé d'une vidéo
L'exploitant DOIT pouvoir demander un nouveau résumé d'une vidéo. Le worker DOIT le
produire au cycle suivant, en priorité, dans la limite du plafond quotidien, avec ses
citations et leurs notes. Le backoffice DOIT afficher l'état de la demande : demandée,
faite ou en échec.

#### Scenario: Résumé raté
- **WHEN** l'exploitant relance le résumé d'une vidéo en échec
- **THEN** le résumé est refait au cycle suivant et la vidéo affiche le nouveau résumé et ses citations

#### Scenario: Plafond atteint
- **WHEN** le plafond du jour est atteint
- **THEN** la demande reste en attente et est traitée le lendemain, ce que le backoffice indique

### Requirement: Historique des actions
Chaque masquage, réaffichage et demande de résumé DOIT être inscrit dans un journal, en
ajout seul, avec la date, l'action, la vidéo et le motif. Le backoffice DOIT afficher ce
journal.

#### Scenario: Retrouver un masquage
- **WHEN** l'exploitant consulte l'historique
- **THEN** il voit quand et pourquoi chaque vidéo a été masquée ou réaffichée
