import { Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking, Platform, Text, View } from 'react-native';

import { PageHead } from '@/components/PageHead';
import { Screen } from '@/components/Screen';
import { Title } from '@/components/Title';
import { WebChrome } from '@/components/WebChrome';
import { APP_NAME, INDEPENDENCE_NOTICE } from '@/config/app';
import { LEGAL } from '@/config/legal';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/fonts';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text
        role="heading"
        aria-level={2}
        className="font-sans-semibold text-chamois text-xs uppercase tracking-wider"
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function P({ children }: { children: ReactNode }) {
  return <Text className="font-sans text-base text-blanc/85 leading-relaxed">{children}</Text>;
}

function ExternalLink({ url, children }: { url: string; children: string }) {
  return (
    <Text
      accessibilityRole="link"
      onPress={() => Linking.openURL(url)}
      className="font-sans-semibold text-chamois underline"
    >
      {children}
    </Text>
  );
}

/** Mentions légales et confidentialité (spec app-shell, ADR 0022). Page statique, pré-rendue. */
export default function LegalNotice() {
  const mail = `mailto:${LEGAL.contactEmail}`;
  return (
    <WebChrome>
      <Stack.Screen
        options={{
          headerShown: Platform.OS !== 'web',
          title: '',
          headerBackTitle: 'Retour',
          headerTintColor: colors.blanc,
          headerStyle: { backgroundColor: colors.bleuSombre },
          headerTitleStyle: { fontFamily: fontFamily.semibold },
        }}
      />
      <Screen>
        <PageHead
          title="Mentions légales et confidentialité"
          description={`Éditeur, hébergeur et données personnelles de ${APP_NAME}.`}
        />
        <Title highlight="confidentialité">Mentions légales et confidentialité</Title>
        <P>{INDEPENDENCE_NOTICE}</P>

        <Section title="Éditeur">
          <P>
            {APP_NAME} est édité par une personne physique, à titre non professionnel, qui a choisi
            de rester anonyme. Ses coordonnées ont été communiquées à l’hébergeur, conformément à
            l’article 6 de la loi pour la confiance dans l’économie numérique.
          </P>
          <P>
            Contact : <ExternalLink url={mail}>{LEGAL.contactEmail}</ExternalLink>
          </P>
        </Section>

        <Section title="Hébergeur">
          <P>
            {LEGAL.host.name}, {LEGAL.host.address} —{' '}
            <ExternalLink url={LEGAL.host.url}>
              {LEGAL.host.url.replace('https://', '')}
            </ExternalLink>
          </P>
        </Section>

        <Section title="Contenus">
          <P>
            Les interventions recensées proviennent de sources publiques (chaînes vidéo, médias,
            podcasts). Les vidéos sont lues depuis leur plateforme d’origine et les articles
            renvoient vers le site de leur éditeur : aucun contenu n’est copié ni réhébergé.
          </P>
          <P>
            Les résumés de vidéos sont générés automatiquement par un modèle d’intelligence
            artificielle et signalés comme tels. Pour signaler une erreur ou demander le retrait
            d’un contenu, écrivez à <ExternalLink url={mail}>{LEGAL.contactEmail}</ExternalLink>.
          </P>
        </Section>

        <Section title="Données personnelles">
          <P>
            {APP_NAME} ne demande aucun compte, ne mesure pas l’audience et ne dépose aucun cookie.
            Le serveur conserve des journaux techniques (adresse IP, page demandée, date) pendant au
            plus 30 jours, pour la sécurité et le bon fonctionnement du service ; ils ne sont ni
            exploités à d’autres fins ni transmis à des tiers, hors l’hébergeur.
          </P>
          <P>
            Les vidéos YouTube et Dailymotion ne se chargent que si vous appuyez sur « Lire la vidéo
            ». La plateforme peut alors déposer des cookies et recueillir des données selon ses
            propres règles (pour YouTube :{' '}
            <ExternalLink url={LEGAL.googlePrivacyUrl}>
              règles de confidentialité de Google
            </ExternalLink>
            ). Les vidéos YouTube sont servies en mode de confidentialité renforcée
            (youtube-nocookie.com).
          </P>
          <P>
            Vous disposez d’un droit d’accès, de rectification, d’effacement et d’opposition sur les
            données vous concernant : écrivez à{' '}
            <ExternalLink url={mail}>{LEGAL.contactEmail}</ExternalLink>. Vous pouvez aussi adresser
            une réclamation à la CNIL (
            <ExternalLink url="https://www.cnil.fr">cnil.fr</ExternalLink>).
          </P>
        </Section>

        <Text className="font-sans text-blanc/60 text-sm">Mise à jour : {LEGAL.updatedAt}.</Text>
      </Screen>
    </WebChrome>
  );
}
