import { NativeTabs } from 'expo-router/unstable-native-tabs';

// Valeurs de la charte (ADR 0001) : les options natives exigent des couleurs JS.
const CHAMOIS = '#b0ad85';
const BLANC_70 = 'rgba(249,249,249,0.7)';
const BLEU_SOMBRE = '#0f1752';
// Fond uni sous chaque onglet (évite un flash clair) ; le dégradé est dessiné par <Screen>.
const CONTENT_STYLE = { backgroundColor: BLEU_SOMBRE };

/**
 * iOS et Android : barre d'onglets native (UITabBar / BottomNavigationView).
 * Sur iOS 26+, le système dessine la barre en Liquid Glass et ignore `backgroundColor`.
 */
export function AppNavigation() {
  return (
    <NativeTabs
      tintColor={CHAMOIS}
      iconColor={{ default: BLANC_70, selected: CHAMOIS }}
      labelStyle={{
        default: { color: BLANC_70, fontFamily: 'Montserrat_600SemiBold' },
        selected: { color: CHAMOIS, fontFamily: 'Montserrat_600SemiBold' },
      }}
      backgroundColor={BLEU_SOMBRE}
      indicatorColor="rgba(176,173,133,0.2)"
    >
      <NativeTabs.Trigger name="index" contentStyle={CONTENT_STYLE}>
        <NativeTabs.Trigger.Label>Accueil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="a-propos" contentStyle={CONTENT_STYLE}>
        <NativeTabs.Trigger.Label>À propos</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'info.circle', selected: 'info.circle.fill' }}
          md="info"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
