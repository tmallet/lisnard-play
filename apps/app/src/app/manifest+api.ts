import { APP_DESCRIPTION, APP_NAME } from '@/config/app';
import { colors } from '@/theme/colors';

/**
 * Manifeste web (spec push-notifications, design D3) : permet d'ajouter le site à
 * l'écran d'accueil, seule voie des notifications sur iPhone. Servi par une route
 * pour lire le nom depuis la configuration (identity.json) plutôt que de le recopier.
 */
export function GET() {
  return Response.json(
    {
      name: APP_NAME,
      short_name: APP_NAME,
      description: APP_DESCRIPTION,
      lang: 'fr',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: colors.bleuSombre,
      theme_color: colors.bleuSombre,
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
}
