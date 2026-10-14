import { Platform, Pressable, Switch, Text, View } from 'react-native';

import { APP_NAME } from '@/config/app';
import type { PushSupport } from '@/lib/push-types';
import { type Preferences, useNotifications } from '@/lib/useNotifications';
import { colors } from '@/theme/colors';

const PREFERENCES: { key: keyof Preferences; label: string; hint: string }[] = [
  { key: 'live', label: 'Début d’un direct', hint: 'Dès que David Lisnard est en direct.' },
  {
    key: 'reminder',
    label: 'Rappel avant un direct',
    hint: 'Un quart d’heure avant un direct programmé.',
  },
  {
    key: 'newItem',
    label: 'Nouvelles interventions',
    hint: 'Chaque vidéo ou article publié : plusieurs par jour.',
  },
];

const web = Platform.OS === 'web';

function unavailableMessage(support: Exclude<PushSupport, 'supported'>): string {
  switch (support) {
    case 'needs-install':
      return `Sur iPhone et iPad, les notifications ne fonctionnent que pour un site ajouté à l’écran d’accueil : dans Safari, touchez Partager puis « Sur l’écran d’accueil », et ouvrez ${APP_NAME} depuis cette icône.`;
    case 'unsupported':
      return 'Ce navigateur ne permet pas les notifications. Essayez avec une version récente de Chrome, Firefox, Edge ou Safari.';
    case 'unconfigured':
      return web
        ? 'Les notifications ne sont pas encore disponibles.'
        : 'Les notifications arriveront bientôt dans l’application. En attendant, elles sont disponibles sur le site web.';
  }
}

function Button({
  label,
  onPress,
  disabled,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`self-start rounded-full px-5 py-2.5 ${primary ? 'bg-chamois' : 'border border-chamois'} ${disabled ? 'opacity-60' : ''}`}
    >
      <Text
        className={`font-sans-semibold text-base ${primary ? 'text-bleu-sombre' : 'text-chamois'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Message({ children }: { children: string }) {
  return (
    <Text
      accessibilityLiveRegion="polite"
      className="font-sans text-base text-blanc/85 leading-relaxed"
    >
      {children}
    </Text>
  );
}

/** Abonnement et préférences de notification de l'appareil (spec push-notifications). */
export function NotificationSettings() {
  const { state, busy, enable, setPreference, disable } = useNotifications();

  switch (state.status) {
    case 'loading':
      return <Message>Chargement…</Message>;
    case 'unavailable':
      return <Message>{unavailableMessage(state.support)}</Message>;
    case 'error':
      return (
        <View className="gap-3">
          <Message>Une erreur est survenue. Réessayez dans un instant.</Message>
          <Button label="Réessayer" onPress={enable} disabled={busy} />
        </View>
      );
    case 'denied':
      return (
        <View className="gap-3">
          <Message>
            {web
              ? 'Les notifications sont bloquées pour ce site. Autorisez-les dans les réglages du navigateur (icône à gauche de l’adresse), puis réessayez.'
              : 'Les notifications sont bloquées pour l’application. Autorisez-les dans les réglages de l’appareil, puis réessayez.'}
          </Message>
          <Button label="Réessayer" onPress={enable} disabled={busy} />
        </View>
      );
    case 'off':
      return <Button label="Activer les notifications" onPress={enable} disabled={busy} primary />;
    case 'on':
      return (
        <View className="gap-5">
          <Message>Les notifications sont activées sur cet appareil.</Message>
          {PREFERENCES.map(({ key, label, hint }) => (
            <View key={key} className="flex-row items-center justify-between gap-4">
              <View className="flex-1 gap-0.5">
                <Text className="font-sans-semibold text-base text-blanc">{label}</Text>
                <Text className="font-sans text-blanc/70 text-sm">{hint}</Text>
              </View>
              <Switch
                accessibilityLabel={label}
                value={state.preferences[key]}
                onValueChange={(value) => setPreference(key, value)}
                trackColor={{ false: colors.bleu, true: colors.emeraude }}
                thumbColor={colors.blanc}
                disabled={busy}
              />
            </View>
          ))}
          <Button label="Désactiver les notifications" onPress={disable} disabled={busy} />
        </View>
      );
  }
}
