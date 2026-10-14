# intervention-summaries Specification

## Purpose
Offrir, sous le lecteur de l'écran de détail d'une intervention vidéo, un résumé court
et factuel de ce que dit David Lisnard, pour qui ne veut pas regarder la vidéo
en entier (ADR 0021).
## Requirements
### Requirement: Contenus résumés
Le système DOIT produire un résumé pour chaque intervention publiée dont le
média est une vidéo YouTube intégrée, une fois sa diffusion terminée. Il NE
DOIT PAS en produire pour une vidéo dont le direct est à venir ou en cours,
ni pour un article de presse ou tout autre contenu non vidéo.

#### Scenario: Vidéo publiée
- **WHEN** une vidéo YouTube de la chaîne officielle est publiée et dotée de son lecteur intégré
- **THEN** un résumé est produit lors d'un cycle ultérieur du worker

#### Scenario: Direct en cours
- **WHEN** une intervention publiée est un direct YouTube encore en cours
- **THEN** aucun résumé n'est produit tant que le direct n'est pas terminé

#### Scenario: Article de presse
- **WHEN** une intervention publiée est un article de presse
- **THEN** aucun résumé n'est produit et le texte de l'article n'est jamais récupéré

### Requirement: Forme du résumé
Un résumé DOIT être rédigé en français, de façon factuelle et neutre, et
attribuer explicitement les propos à David Lisnard (« il estime que… »). Sa
longueur DOIT être proportionnée à la vidéo :
- trois ou quatre phrases pour un extrait de moins de trois minutes ;
- jusqu'à trois courts paragraphes (dix phrases au plus) pour une interview, un
  discours ou un débat.

Il DOIT suivre l'ordre des sujets abordés et préciser les propositions
concrètes, chiffres et exemples avancés, et être accompagné de trois à six
points clés courts. Il NE DOIT contenir ni opinion, ni citation de plus de
quinze mots, ni information absente de la vidéo.

#### Scenario: Résumé d'un clip
- **WHEN** un clip où David Lisnard présente une proposition sur l'école est résumé
- **THEN** le résumé décrit sa proposition en trois ou quatre phrases, sans jugement, suivi de trois à six points clés

#### Scenario: Résumé d'un débat
- **WHEN** un débat de quarante minutes est résumé
- **THEN** le résumé tient en trois courts paragraphes au plus, qui suivent les sujets abordés et reprennent ses propositions concrètes

### Requirement: Absence de prise de parole
Si le modèle indique que David Lisnard ne s'exprime pas dans la vidéo, le
système NE DOIT PAS afficher de résumé pour ce contenu. Ce résultat est tout de
même enregistré, pour ne pas redemander le même résumé.

#### Scenario: Vidéo sans prise de parole
- **WHEN** le modèle signale que David Lisnard n'intervient pas dans une vidéo publiée
- **THEN** aucun résumé n'est affiché et aucune nouvelle demande n'est faite pour ce contenu

### Requirement: Traçabilité et régénération
Chaque résumé DOIT être enregistré avec l'identifiant du modèle, la version de
la consigne et sa date de production. Le modèle DOIT être épinglé. Quand la
version de la consigne change, les résumés existants DOIVENT être régénérés.

#### Scenario: Nouvelle consigne
- **WHEN** la version de la consigne est incrémentée
- **THEN** chaque résumé produit avec l'ancienne version est régénéré au fil des cycles suivants

### Requirement: Garde-fous de coût et d'échec
Le système DOIT plafonner la dépense quotidienne consacrée aux résumés et le
nombre de résumés produits par cycle. Un échec (réseau, réponse invalide) DOIT
laisser le contenu sans résumé, retenté lors d'un cycle ultérieur, dans la
limite de trois tentatives, espacées d'un délai croissant (un direct tout juste
terminé n'est souvent pas encore lisible). La dépense comptée DOIT inclure tout
appel payé, même si sa réponse est inexploitable ou si le résumé est remplacé
ensuite. Une indisponibilité du service (crédit épuisé, limite de
débit, panne) NE DOIT PAS compter comme une tentative : elle interrompt le cycle,
qui reprend plus tard. Un résumé absent NE DOIT jamais empêcher la
publication ni l'affichage d'une intervention.

#### Scenario: Plafond quotidien atteint
- **WHEN** la dépense du jour en résumés atteint le plafond configuré
- **THEN** aucun nouveau résumé n'est demandé avant le lendemain, et les interventions restent visibles sans résumé

#### Scenario: Crédit épuisé
- **WHEN** le fournisseur répond que le crédit est épuisé
- **THEN** le cycle s'arrête, aucune tentative n'est décomptée, et les vidéos restent à résumer pour un cycle ultérieur

#### Scenario: Échecs répétés
- **WHEN** la production du résumé d'un contenu échoue trois fois
- **THEN** le système cesse de le demander, et le contenu reste visible sans résumé

### Requirement: Affichage du résumé
L'écran de détail DOIT afficher le résumé, quand il existe, juste sous le
lecteur vidéo, avant la description, avec ses points clés et la
mention « Résumé généré automatiquement ». Sans résumé, l'écran s'affiche sans
bloc vide ni message.

#### Scenario: Vidéo résumée
- **WHEN** l'utilisateur ouvre une vidéo qui a un résumé
- **THEN** le résumé, ses points clés et la mention « Résumé généré automatiquement » apparaissent juste sous le lecteur

#### Scenario: Vidéo sans résumé
- **WHEN** l'utilisateur ouvre une vidéo dont le résumé n'est pas encore produit
- **THEN** l'écran affiche le titre, la date et le lecteur, sans bloc de résumé

