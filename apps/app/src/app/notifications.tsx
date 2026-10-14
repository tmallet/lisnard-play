import { Stack } from 'expo-router';
import { Platform, Text } from 'react-native';

import { NotificationSettings } from '@/components/NotificationSettings';
import { PageHead } from '@/components/PageHead';
import { Screen } from '@/components/Screen';
import { Title } from '@/components/Title';
import { WebChrome } from '@/components/WebChrome';
import { APP_NAME } from '@/config/app';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/fonts';

/** Notifications : abonnement de l'appareil et préférences (spec push-notifications). */
export default function NotificationsScreen() {
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
          title="Notifications"
          description={`Être prévenu des directs et des nouvelles interventions sur ${APP_NAME}.`}
        />
        <Title highlight="prévenu">Être prévenu</Title>
        <Text className="font-sans text-base text-blanc/85 leading-relaxed">
          Recevez une notification au début d’un direct de David Lisnard, un quart d’heure avant un
          direct programmé et, si vous le souhaitez, à chaque nouvelle intervention. Aucun compte
          n’est nécessaire.
        </Text>
        <NotificationSettings />
      </Screen>
    </WebChrome>
  );
}
