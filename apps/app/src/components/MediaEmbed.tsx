import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors } from '@/theme/colors';

/**
 * Lecteur intégré sur mobile (spec intervention-media). La WebView charge une page
 * enveloppe contenant l'iframe du fournisseur avec une origine déclarée : les lecteurs
 * (YouTube notamment) refusent de démarrer sans. La navigation est limitée à l'hôte
 * du lecteur ; tout autre lien est bloqué.
 */
const ORIGIN = process.env.EXPO_PUBLIC_SITE_URL ?? 'https://lisnard-play.app';

export function MediaEmbed({ embedUrl, title }: { embedUrl: string; title: string }) {
  const host = new URL(embedUrl).host;
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
        onShouldStartLoadWithRequest={(request) =>
          request.url === 'about:blank' ||
          request.url.startsWith(ORIGIN) ||
          new URL(request.url).host === host
        }
      />
    </View>
  );
}
