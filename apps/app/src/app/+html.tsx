import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

import { APP_DESCRIPTION, APP_NAME } from '@/config/app';

/**
 * Document HTML racine (web uniquement, exécuté au rendu serveur / pré-rendu).
 * Métadonnées de base de la spec app-shell ; chaque page complète via <Head>.
 */
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="description" content={APP_DESCRIPTION} />
        <meta name="theme-color" content="#0f1752" />
        <meta property="og:site_name" content={APP_NAME} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fr_FR" />
        <ScrollViewStyleReset />
      </head>
      <body style={{ backgroundColor: '#0f1752' }}>{children}</body>
    </html>
  );
}
