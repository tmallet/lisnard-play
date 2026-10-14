import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

import { APP_NAME } from '@/config/app';
import { colors } from '@/theme/colors';

/**
 * Document HTML racine (web uniquement, exécuté au rendu serveur / pré-rendu).
 * Métadonnées communes ; titre, description et Open Graph propres à chaque page via <PageHead>.
 */
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content={colors.bleuSombre} />
        <meta property="og:site_name" content={APP_NAME} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fr_FR" />
        {/* Installation sur l'écran d'accueil (notifications sur iPhone, ADR 0024). */}
        <link rel="manifest" href="/manifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <ScrollViewStyleReset />
      </head>
      <body style={{ backgroundColor: colors.bleuSombre }}>{children}</body>
    </html>
  );
}
