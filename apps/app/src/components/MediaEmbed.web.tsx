/**
 * Lecteur intégré sur le web (spec intervention-media) : iframe isolée, chargée depuis
 * l'origine du fournisseur. Aucun HTML tiers n'est injecté dans la page.
 */
export function MediaEmbed({ embedUrl, title }: { embedUrl: string; title: string }) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <iframe
        src={embedUrl}
        title={title}
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
      />
    </div>
  );
}
