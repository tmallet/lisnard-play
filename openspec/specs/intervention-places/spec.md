# intervention-places Specification

## Purpose
TBD - created by archiving change campaign-map. Update Purpose after archive.
## Requirements
### Requirement: Lieu des déplacements
Pour chaque intervention publiée, le système DOIT déterminer, à partir de son titre
et de sa description uniquement, si elle s'est tenue sur place hors d'un studio
(meeting, discours, visite, rencontre, interview tournée en région) et, si oui, à
quel endroit. Le lieu retenu DOIT être celui où l'intervention s'est tenue, et non
celui dont elle parle. Une intervention sur un plateau de télévision ou de radio,
un article de presse ou une vidéo sans lieu identifiable NE DOIT PAS recevoir de
lieu. En cas de doute, le système DOIT conclure à l'absence de lieu plutôt
qu'inventer. Le lieu DOIT être situé en France (outre-mer compris) par la Base
adresse nationale : une commune reçoit ses coordonnées, une région ou un département
reçoit son centre et la mention « approximatif ». Un lieu hors de France ou introuvable
DOIT être enregistré sans coordonnées et ne pas figurer sur la carte. Le résultat
DOIT être enregistré avec le modèle et la version de la consigne, et recalculé si la
consigne change.

#### Scenario: Meeting dans une commune
- **WHEN** une vidéo intitulée « Grand meeting de David Lisnard à Saint-Raphaël » est publiée
- **THEN** elle reçoit le lieu Saint-Raphaël (Var) avec ses coordonnées

#### Scenario: Plateau de télévision
- **WHEN** une interview sur le plateau de BFMTV, au sujet de Marseille, est publiée
- **THEN** elle ne reçoit aucun lieu

#### Scenario: Lieu régional
- **WHEN** une vidéo intitulée « Meeting de David Lisnard en Alsace » est publiée
- **THEN** elle est placée au centre de l'Alsace, avec la mention « approximatif »

### Requirement: Coût borné
Les appels au modèle pour les lieux DOIVENT être imputés sur le plafond quotidien de
dépense des résumés (ADR 0021), après les résumés, et s'arrêter quand il est atteint.
Une indisponibilité du service NE DOIT PAS compter comme un échec. Une réponse
inexploitable DOIT être réessayée après une attente croissante, et abandonnée au bout
de trois essais (sans lieu, jusqu'à une nouvelle consigne). Une réponse payée NE DOIT
jamais être redemandée parce que la géolocalisation a échoué : elle est gardée et
géolocalisée plus tard.

#### Scenario: Réponses inexploitables
- **WHEN** le modèle renvoie trois fois une réponse inexploitable pour une intervention
- **THEN** l'intervention est abandonnée sans lieu et n'est plus envoyée au modèle

#### Scenario: Base adresse nationale indisponible
- **WHEN** la géolocalisation échoue après une réponse du modèle
- **THEN** la réponse est gardée et géolocalisée plus tard, sans nouvel appel au modèle

#### Scenario: Plafond atteint
- **WHEN** le plafond quotidien est atteint
- **THEN** les interventions restantes attendent le lendemain, sans erreur

### Requirement: Carte des déplacements
La vue « Déplacements » de l'onglet « Campagne » DOIT afficher une carte de France
(régions de métropole, outre-mer en encarts) avec un repère par lieu, de taille
croissante avec le nombre d'interventions qui s'y sont tenues, et le nombre de lieux
et d'interventions représentés. Un repère approximatif DOIT être distingué. Toucher
un repère DOIT afficher la liste des interventions du lieu (titre, date) avec un lien
vers chacune. La carte DOIT être dessinée à partir de données intégrées à
l'application, aux couleurs de la charte, sans service tiers ni traceur.

#### Scenario: Plusieurs interventions au même endroit
- **WHEN** deux vidéos du même meeting à Saint-Raphaël sont publiées
- **THEN** un seul repère, plus grand, les regroupe, et le toucher les liste toutes les deux

#### Scenario: Aucun déplacement
- **WHEN** aucune intervention n'a de lieu
- **THEN** la vue l'indique au lieu d'afficher une carte vide sans explication

