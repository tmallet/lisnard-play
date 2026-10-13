## Purpose

Décider automatiquement, pour chaque contenu candidat, s'il s'agit d'une
intervention publique de David Lisnard dans le périmètre de l'application (tout
sauf la mairie de Cannes, AMF inclus), puis publier ou écarter le contenu en
gardant une trace complète de chaque décision.

## ADDED Requirements

### Requirement: Questions posées au classifieur
Pour chaque contenu candidat, le système DOIT obtenir du classifieur, à partir du
titre, de la description, du média et des dates :
- la probabilité que David Lisnard **intervienne lui-même** dans le contenu
  (et pas seulement qu'il soit cité) ;
- le **rôle** dominant de l'intervention, parmi `national`, `amf`, `mairie`
  et `hors_sujet`, avec une probabilité par option ;
- le **type** d'intervention, parmi `tv`, `radio`, `presse`, `podcast`,
  `meeting`, `discours`, `stream` et `reseau_social`.

#### Scenario: Interview télévisée
- **WHEN** un contenu « David Lisnard invité de la matinale de BFMTV » est classé
- **THEN** le système obtient une probabilité d'intervention, une distribution sur les rôles et une distribution sur les types

### Requirement: Règle de publication
Un contenu DOIT être publié si et seulement si :
- la probabilité d'intervention est au moins égale au seuil `τ_intervient` du
  modèle utilisé ;
- le rôle le plus probable est `national` ou `amf` ;
- la confiance associée à ce rôle est au moins égale au seuil `τ_role`.

Sinon, il DOIT être écarté. Un contenu écarté reste en base et n'est jamais
visible publiquement.

#### Scenario: Intervention nationale
- **WHEN** un contenu obtient une probabilité d'intervention et une confiance de rôle `national` toutes deux supérieures aux seuils
- **THEN** il est publié avec le rôle `national`

#### Scenario: Intervention en tant que maire
- **WHEN** le rôle le plus probable d'un contenu est `mairie`
- **THEN** il est écarté, quelle que soit la probabilité d'intervention

#### Scenario: Simple citation
- **WHEN** un article cite David Lisnard sans qu'il s'exprime lui-même et que la probabilité d'intervention est sous le seuil
- **THEN** le contenu est écarté

#### Scenario: Intervention AMF
- **WHEN** le rôle le plus probable d'un contenu est `amf` avec une confiance supérieure au seuil, et la probabilité d'intervention aussi
- **THEN** il est publié avec le rôle `amf`, ce qui permet de le filtrer

### Requirement: Modèle épinglé et seuils par modèle
Le système DOIT utiliser un identifiant de modèle épinglé (version explicite,
jamais un alias « latest »). Les seuils DOIVENT être définis par identifiant de
modèle. Si aucun seuil n'est défini pour le modèle configuré, aucune
publication NE DOIT avoir lieu.

#### Scenario: Modèle sans seuils
- **WHEN** le modèle configuré n'a pas de seuils définis
- **THEN** les contenus sont classés et journalisés, mais aucun n'est publié, et une erreur de configuration est journalisée

### Requirement: Journal des décisions
Chaque classification DOIT être enregistrée avec : le contenu concerné,
l'identifiant du modèle, la version des questions, les probabilités brutes
renvoyées pour chaque question, les seuils appliqués, le résultat (publié ou
écarté) et l'horodatage. Le journal NE DOIT jamais être modifié ; une nouvelle
classification ajoute une entrée.

#### Scenario: Traçabilité
- **WHEN** un contenu est publié
- **THEN** on peut retrouver le modèle, les probabilités et les seuils qui ont conduit à sa publication

### Requirement: Recalcul sans nouvel appel
Le système DOIT permettre de recalculer le résultat (publié ou écarté) de tous
les contenus à partir des probabilités déjà journalisées et de nouveaux seuils,
sans rappeler le classifieur.

#### Scenario: Changement de seuils
- **WHEN** les seuils d'un modèle sont modifiés et qu'un recalcul est lancé
- **THEN** la publication de chaque contenu est réévaluée avec les nouveaux seuils, sans aucun appel au classifieur

### Requirement: Reclassification
Le système DOIT permettre de reclassifier des contenus déjà classés, par exemple
après un changement de modèle ou de version des questions. Une nouvelle entrée
de journal est ajoutée à chaque fois, et la décision la plus récente fait foi.

#### Scenario: Nouvelle version des questions
- **WHEN** la version des questions change et qu'une reclassification est lancée
- **THEN** chaque contenu reçoit une nouvelle entrée de journal avec la nouvelle version, et son statut suit cette décision

### Requirement: Indisponibilité du classifieur
Si le classifieur est indisponible ou renvoie une réponse invalide, le contenu
DOIT rester en attente (ni publié ni écarté) et être retenté lors d'un cycle
ultérieur.

#### Scenario: Erreur du classifieur
- **WHEN** l'appel au classifieur échoue pour un contenu
- **THEN** le contenu reste en attente et une nouvelle tentative a lieu au cycle suivant
