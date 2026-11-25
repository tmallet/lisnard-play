import { APP_NAME } from '@/config/app';
import type { PushSupport } from '@/lib/push-types';
import { ApiProvider } from '@/lib/trpc';
import { type Preferences, useNotifications } from '@/lib/useNotifications';

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

function unavailableMessage(support: Exclude<PushSupport, 'supported'>): string {
  switch (support) {
    case 'needs-install':
      return `Sur iPhone et iPad, les notifications ne fonctionnent que pour un site ajouté à l’écran d’accueil : dans Safari, touchez Partager puis « Sur l’écran d’accueil », et ouvrez ${APP_NAME} depuis cette icône.`;
    case 'unsupported':
      return 'Ce navigateur ne permet pas les notifications. Essayez avec une version récente de Chrome, Firefox, Edge ou Safari.';
    case 'unconfigured':
      return 'Les notifications ne sont pas encore disponibles.';
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
    <button
      type="button"
      disabled={disabled}
      onClick={onPress}
      className={`self-start rounded-full px-5 py-2.5 font-sans-semibold text-base ${primary ? 'bg-chamois text-bleu-sombre' : 'border border-chamois text-chamois'} ${disabled ? 'opacity-60' : ''}`}
    >
      {label}
    </button>
  );
}

function Message({ children }: { children: string }) {
  return (
    <p aria-live="polite" className="font-sans text-base text-blanc/85 leading-relaxed">
      {children}
    </p>
  );
}

/** Interrupteur accessible (case à cocher au rôle `switch`) aux couleurs de la charte. */
function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full bg-bleu transition-colors duration-200 before:absolute before:top-1 before:left-1 before:size-5 before:rounded-full before:bg-blanc before:transition-transform before:duration-200 checked:bg-emeraude checked:before:translate-x-5 motion-reduce:transition-none motion-reduce:before:transition-none"
    />
  );
}

/** Abonnement et préférences du navigateur (spec push-notifications). */
function Settings() {
  const { state, busy, enable, setPreference, disable } = useNotifications();
  switch (state.status) {
    case 'loading':
      return <Message>Chargement…</Message>;
    case 'unavailable':
      return <Message>{unavailableMessage(state.support)}</Message>;
    case 'error':
      return (
        <div className="flex flex-col gap-3">
          <Message>Une erreur est survenue. Réessayez dans un instant.</Message>
          <Button label="Réessayer" onPress={enable} disabled={busy} />
        </div>
      );
    case 'denied':
      return (
        <div className="flex flex-col gap-3">
          <Message>
            Les notifications sont bloquées pour ce site. Autorisez-les dans les réglages du
            navigateur (icône à gauche de l’adresse), puis réessayez.
          </Message>
          <Button label="Réessayer" onPress={enable} disabled={busy} />
        </div>
      );
    case 'off':
      return <Button label="Activer les notifications" onPress={enable} disabled={busy} primary />;
    case 'on':
      return (
        <div className="flex flex-col gap-5">
          <Message>Les notifications sont activées sur cet appareil.</Message>
          {PREFERENCES.map(({ key, label, hint }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="font-sans-semibold text-base text-blanc">{label}</span>
                <span className="font-sans text-blanc/70 text-sm">{hint}</span>
              </div>
              <Switch
                label={label}
                checked={state.preferences[key]}
                onChange={(value) => setPreference(key, value)}
              />
            </div>
          ))}
          <Button label="Désactiver les notifications" onPress={disable} disabled={busy} />
        </div>
      );
  }
}

export default function NotificationSettings() {
  return (
    <ApiProvider>
      <Settings />
    </ApiProvider>
  );
}
