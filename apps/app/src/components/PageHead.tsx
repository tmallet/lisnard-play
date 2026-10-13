import Head from 'expo-router/head';

import { APP_DESCRIPTION, pageTitle } from '@/config/app';

/** Titre et balises Open Graph propres à une page (web). */
export function PageHead({
  title,
  description = APP_DESCRIPTION,
}: {
  title?: string;
  description?: string;
}) {
  const fullTitle = pageTitle(title);
  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
    </Head>
  );
}
