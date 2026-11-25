## ADDED Requirements

### Requirement: Métadonnées de référencement de l'accueil et des interventions
Le HTML servi pour l'accueil et pour chaque page `/interventions/<id>` DOIT porter, sans
exécuter de JavaScript, une adresse canonique sur le domaine de production, des balises
Open Graph et Twitter, et des données structurées JSON-LD. Une page d'intervention DOIT avoir
un titre (intervention et date), une description et une image propres, et décrire une
vidéo en `VideoObject` (date de mise en ligne, miniature, lecteur) ou un lien vers la presse
en `WebPage`. Elle DOIT aussi contenir en texte son titre, sa description et, pour une
vidéo seulement, son résumé. Une intervention de presse N'A PAS de résumé ni de texte
d'article (ADR 0021). Les valeurs issues des données DOIVENT être échappées. Une intervention
inconnue ou masquée DOIT répondre HTTP 404.

#### Scenario: Vidéo
- **WHEN** un robot demande `/interventions/<id>` d'une vidéo publiée
- **THEN** le HTML a un titre propre daté, `link rel=canonical`, `og:image`, `twitter:card`, un JSON-LD `VideoObject` et le résumé en texte

#### Scenario: Presse
- **WHEN** un robot demande l'intervention d'un article relayé
- **THEN** le HTML porte titre, média et date, un JSON-LD `WebPage`, et aucun résumé

#### Scenario: Intervention inconnue
- **WHEN** un robot demande `/interventions/<uuid inconnu>`
- **THEN** la réponse est HTTP 404

#### Scenario: Accueil
- **WHEN** un robot demande `/`
- **THEN** le HTML contient la canonique, la carte Twitter, l'image et un JSON-LD `WebSite` et `Organization` portant la mention d'indépendance
