import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { NAV_ITEMS } from '@/config/navigation';
import { blancSecondaire, colors } from '@/theme/colors';
import { fontFamily } from '@/theme/fonts';

/**
 * iOS et Android : barre d'onglets native (UITabBar / BottomNavigationView).
 * Sur iOS 26+, le système dessine la barre en Liquid Glass et ignore `backgroundColor`.
 */
export function AppNavigation() {
  return (
    <NativeTabs
      tintColor={colors.chamois}
      iconColor={{ default: blancSecondaire, selected: colors.chamois }}
      labelStyle={{
        default: { color: blancSecondaire, fontFamily: fontFamily.semibold },
        selected: { color: colors.chamois, fontFamily: fontFamily.semibold },
      }}
      backgroundColor={colors.bleuSombre}
      indicatorColor={colors.bleu}
    >
      {NAV_ITEMS.map((item) => (
        <NativeTabs.Trigger
          key={item.route}
          name={item.route}
          // Fond uni sous chaque onglet (évite un flash clair) ; le dégradé est dessiné par <Screen>.
          contentStyle={{ backgroundColor: colors.bleuSombre }}
        >
          <NativeTabs.Trigger.Label>{item.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={item.icon.sf} md={item.icon.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
