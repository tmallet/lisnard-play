// Le module natif `bun` n'existe pas pour Metro : il est remplacé à l'empaquetage par
// l'objet global Bun, disponible à l'exécution des API routes (serveur Bun, ADR 0015).
module.exports = globalThis.Bun;
