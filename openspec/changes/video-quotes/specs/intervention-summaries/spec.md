## MODIFIED Requirements

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
quinze mots, ni information absente de la vidéo. La même réponse DOIT comprendre
les citations de la vidéo (spec `intervention-quotes`) : de 3 à 8 phrases de
David Lisnard, mot pour mot, de 40 mots au plus, chacune avec son minutage en
secondes et son thème.

#### Scenario: Résumé d'un clip
- **WHEN** un clip où David Lisnard présente une proposition sur l'école est résumé
- **THEN** le résumé décrit sa proposition en trois ou quatre phrases, sans jugement, suivi de trois à six points clés

#### Scenario: Résumé d'un débat
- **WHEN** un débat de quarante minutes est résumé
- **THEN** le résumé tient en trois courts paragraphes au plus, qui suivent les sujets abordés et reprennent ses propositions concrètes

#### Scenario: Citations avec le résumé
- **WHEN** une interview est résumée avec la consigne version 4
- **THEN** la réponse comprend le résumé, les points clés et de 3 à 8 citations minutées
