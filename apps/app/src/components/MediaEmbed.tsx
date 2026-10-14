import { Linking, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors } from '@/theme/colors';

/**
 * Lecteur intégré sur mobile (spec intervention-media). La WebView charge une page
 * enveloppe contenant l'iframe du fournisseur avec une origine déclarée : les lecteurs
 * (YouTube notamment) refusent de démarrer sans. Seuls la page enveloppe et le
 * contenu de l'iframe se chargent dans la vue ; tout lien suivi depuis le lecteur
 * (titre, « Regarder sur YouTube ») s'ouvre dans l'app ou le navigateur du système.
 */
const ORIGIN = process.env.EXPO_PUBLIC_SITE_URL ?? 'https://lisnard-play.app';

/** Navigation dans la vue : page enveloppe ou chargement d'un cadre (le lecteur lui-même). */
export function allowsInWebView(
  request: { url: string; isTopFrame?: boolean },
  embedUrl: string,
): boolean {
  if (request.url === 'about:blank' || request.url.startsWith(ORIGIN)) return true;
  // iOS signale les chargements de l'iframe (isTopFrame false) ; Android ne soumet que
  // la navigation principale.
  if (request.isTopFrame === false) return true;
  return request.url === embedUrl;
}

export function MediaEmbed({ embedUrl, title }: { embedUrl: string; title: string }) {
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;background:${colors.bleuSombre};height:100%}iframe{position:absolute;inset:0;width:100%;height:100%;border:0}</style>
</head><body><iframe src="${embedUrl.replaceAll('"', '&quot;')}" title="${title.replaceAll('"', '&quot;')}"
allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen
referrerpolicy="strict-origin-when-cross-origin"></iframe></body></html>`;
  return (
    <View className="aspect-video w-full overflow-hidden rounded-xl bg-bleu-sombre">
      <WebView
        source={{ html, baseUrl: ORIGIN }}
        originWhitelist={['*']}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction
        style={{ backgroundColor: colors.bleuSombre }}
        onShouldStartLoadWithRequest={(request) => {
          if (allowsInWebView(request, embedUrl)) return true;
          void Linking.openURL(request.url);
          return false;
        }}
        onOpenWindow={(event) => void Linking.openURL(event.nativeEvent.targetUrl)}
      />
    </View>
  );
}
