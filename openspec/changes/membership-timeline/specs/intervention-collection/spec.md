## MODIFIED Requirements

### Requirement: Dédoublonnage
Un même contenu NE DOIT être enregistré qu'une fois, même s'il est trouvé
plusieurs fois ou par plusieurs sources. L'identité d'un contenu est son
identifiant sur la plateforme (identifiant de vidéo YouTube, par exemple), à
défaut son URL canonique. Une nouvelle rencontre d'un contenu connu met à jour
ses métadonnées sans créer de doublon. Les articles de presse au titre identique
(sans tenir compte des accents, de la casse, des guillemets ni de la ponctuation),
publiés à moins de trois jours d'écart par des médias différents, sont des reprises
d'une même dépêche : un seul DOIT rester visible (de préférence un article déjà
affiché), les autres DOIVENT être masqués partout (flux, graphique des adhésions,
notifications) et ne pas être envoyés au classifieur, sans être supprimés.

#### Scenario: Vidéo vue deux fois
- **WHEN** une vidéo déjà enregistrée réapparaît dans une collecte ultérieure
- **THEN** aucun nouvel enregistrement n'est créé et ses métadonnées sont mises à jour

#### Scenario: Dépêche reprise par plusieurs médias
- **WHEN** BFM et Orange Actualités publient le même jour un article au même titre
- **THEN** un seul des deux apparaît dans l'application

#### Scenario: Même titre à un mois d'écart
- **WHEN** deux articles portent le même titre à un mois d'intervalle
- **THEN** les deux restent visibles
