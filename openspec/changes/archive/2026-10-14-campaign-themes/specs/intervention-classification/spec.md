## MODIFIED Requirements

### Requirement: Questions posées au classifieur
Pour chaque contenu candidat, le système DOIT obtenir du classifieur, à partir du
titre, de la description, du média et des dates :
- la probabilité que David Lisnard **intervienne lui-même** dans le contenu
  (et pas seulement qu'il soit cité) ;
- le **rôle** dominant de l'intervention, parmi `national` (candidat à la
  présidentielle et responsable politique national), `amf`, `mairie` et
  `hors_sujet`, avec une probabilité par option ;
- le **type** d'intervention, parmi `tv`, `radio`, `presse`, `podcast`,
  `meeting`, `discours`, `stream` et `reseau_social` ;
- une probabilité par **thème** (spec `intervention-themes`).

#### Scenario: Interview télévisée
- **WHEN** un contenu « David Lisnard invité de la matinale de BFMTV » est classé
- **THEN** le système obtient une probabilité d'intervention, une distribution sur les rôles, une distribution sur les types et une probabilité pour chaque thème

### Requirement: Règle de publication
Un contenu DOIT être publié si et seulement si :
- la probabilité d'intervention est au moins égale au seuil `τ_intervient` du
  modèle utilisé, sauf pour un contenu de la chaîne officielle de David Lisnard,
  où son intervention est présumée (ADR 0018) ;
- le rôle le plus probable est `national` ;
- la confiance associée à ce rôle est au moins égale au seuil `τ_role`.

Sinon, il DOIT être écarté. Un contenu écarté reste en base et n'est jamais
visible publiquement. Le périmètre est celui de la campagne présidentielle : les
interventions au titre de l'AMF ou de la mairie de Cannes sont écartées.

#### Scenario: Intervention nationale
- **WHEN** un contenu obtient une probabilité d'intervention et une confiance de rôle `national` toutes deux supérieures aux seuils
- **THEN** il est publié avec le rôle `national`

#### Scenario: Intervention en tant que maire
- **WHEN** le rôle le plus probable d'un contenu est `mairie`
- **THEN** il est écarté, quelle que soit la probabilité d'intervention

#### Scenario: Intervention AMF
- **WHEN** le rôle le plus probable d'un contenu est `amf`, même avec une confiance et une probabilité d'intervention supérieures aux seuils
- **THEN** il est écarté

#### Scenario: Simple citation
- **WHEN** un article cite David Lisnard sans qu'il s'exprime lui-même et que la probabilité d'intervention est sous le seuil
- **THEN** le contenu est écarté

#### Scenario: Vidéo de la chaîne officielle
- **WHEN** une vidéo de la chaîne officielle obtient une probabilité d'intervention sous le seuil, avec le rôle `national` et une confiance supérieure au seuil
- **THEN** elle est publiée

#### Scenario: Vidéo de la chaîne officielle sur la ville de Cannes
- **WHEN** le rôle le plus probable d'une vidéo de la chaîne officielle est `mairie`
- **THEN** elle est écartée

#### Scenario: Contenu AMF déjà publié
- **WHEN** un recalcul est lancé après l'entrée en vigueur de cette règle, sur un contenu publié auparavant avec le rôle `amf`
- **THEN** il est écarté, sans appel au classifieur
