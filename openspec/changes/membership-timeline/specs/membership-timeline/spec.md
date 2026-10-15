## ADDED Requirements

### Requirement: Onglet « Adhésions »
L'application DOIT proposer un onglet « Adhésions » dans la navigation principale
(en-tête sur le web, barre d'onglets sur iOS et Android), qui mène à une page
présentant le nombre d'adhérents de Nouvelle Énergie et son évolution au fil des
interventions. Sur le web, la page DOIT être accessible à l'adresse `/adhesions`.

#### Scenario: Accès depuis la navigation
- **WHEN** l'utilisateur choisit « Adhésions » dans la navigation
- **THEN** la page affiche le total d'adhérents en cours, sa date de mise à jour et le graphique

### Requirement: Données d'adhésion mises en cache
Le système DOIT obtenir le total en cours et l'historique quotidien des adhérents
depuis les fichiers publics de Nouvelle Énergie, par le serveur de l'application et
jamais depuis le navigateur ou l'appareil du visiteur. Il DOIT les conserver en cache
au moins 60 et au plus 120 secondes, quel que soit le nombre de visiteurs. Si la
source est indisponible ou renvoie une réponse invalide, il DOIT servir la dernière
valeur valide avec sa date ; s'il n'en a aucune, la page DOIT l'indiquer sans erreur
technique. Aucune donnée d'adhésion NE DOIT être enregistrée en base.

#### Scenario: Plusieurs visiteurs
- **WHEN** cent visiteurs ouvrent la page dans la même minute
- **THEN** la source n'est interrogée qu'une fois

#### Scenario: Source indisponible
- **WHEN** la source répond en erreur alors qu'une valeur a déjà été obtenue
- **THEN** la page affiche cette dernière valeur et sa date de mise à jour

### Requirement: Graphique des adhésions et des interventions
La page DOIT afficher la courbe du total cumulé d'adhérents, jour par jour, depuis la
date de la plus ancienne intervention publiée jusqu'au jour en cours (le jour en cours
prenant le total en direct). Toutes les interventions publiées de la période DOIVENT
y figurer, posées sur la courbe au jour où elles ont eu lieu :
- une vidéo de la chaîne officielle de David Lisnard, par un rond contenant sa
  miniature ;
- toute autre intervention, par un point ;
- un direct, par un liseré distinct ;
- plusieurs interventions du même jour, empilées sans se recouvrir ; au-delà de cinq,
  un repère « +N » regroupe les autres, en gardant visibles les vidéos officielles.

Toucher ou survoler un repère DOIT afficher le titre, le média, la date et le total
d'adhérents de ce jour, avec un lien vers la page de l'intervention. Le graphique DOIT
garder une échelle lisible (au moins la taille d'un rond par jour) et défiler
horizontalement, en s'ouvrant sur les jours les plus récents. Toucher un repère « +N »
DOIT afficher la liste des interventions qu'il regroupe, avec un lien vers chacune.

#### Scenario: Vidéo officielle
- **WHEN** une vidéo de la chaîne officielle a été publiée le 8 octobre
- **THEN** sa miniature ronde apparaît sur la courbe au 8 octobre

#### Scenario: Journée chargée
- **WHEN** cinq interventions ont eu lieu le même jour
- **THEN** cinq repères distincts sont empilés au-dessus du point de ce jour

#### Scenario: Journée très chargée
- **WHEN** dix-huit interventions ont eu lieu le même jour
- **THEN** quatre repères et un repère « +14 » sont empilés, et le « +14 » liste les quatorze autres

#### Scenario: Ouverture d'une intervention
- **WHEN** l'utilisateur touche un repère puis le lien de la carte
- **THEN** la page de l'intervention s'ouvre

### Requirement: Source et prudence
La page DOIT citer la source des chiffres (« Source : Nouvelle Énergie ») et préciser
que la coïncidence entre une intervention et une hausse des adhésions ne démontre pas
un effet. Elle NE DOIT utiliser que la charte de l'application, sans logo ni visuel du
parti, et n'ajouter aucun traceur.

#### Scenario: Mention de la source
- **WHEN** un visiteur ouvre la page « Adhésions »
- **THEN** il y lit la source des chiffres et l'avertissement sur la corrélation
