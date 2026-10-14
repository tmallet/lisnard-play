import '../global.css';

import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';

import { ApiProvider } from '@/lib/trpc';
import { colors } from '@/theme/colors';
import { useAppFonts } from '@/theme/fonts';

if (Platform.OS !== 'web') SplashScreen.preventAutoHideAsync();

/**
 * Les onglets restent sous l'écran de détail, même ouvert par un lien partagé :
 * le bouton retour mène à l'accueil.
 */
export const unstable_settings = { initialRouteName: '(tabs)' };

/** Thème de navigation : fond transparent pour laisser voir le dégradé de la racine. */
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: 'transparent',
    card: colors.bleuSombre,
    primary: colors.chamois,
  },
};

export default function RootLayout() {
  const fontsReady = useAppFonts();

  useEffect(() => {
    if (fontsReady && Platform.OS !== 'web') SplashScreen.hideAsync();
  }, [fontsReady]);

  // Sur le web, on rend immédiatement (HTML pré-rendu) ; les polices s'appliquent au chargement.
  if (!fontsReady && Platform.OS !== 'web') return null;

  return (
    <ApiProvider>
      {/* Dégradé signature (160°, bleu → bleu sombre). Web : visible derrière tout le contenu.
          Mobile : masqué par les onglets natifs, chaque <Screen> le redessine. */}
      <View className="flex-1 bg-bleu-sombre bg-linear-160 from-bleu to-bleu-sombre">
        <StatusBar style="light" />
        {/* Pile racine : les onglets, et l'écran de détail ouvert par-dessus sur mobile. */}
        <ThemeProvider value={navigationTheme}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: Platform.OS === 'web' ? 'transparent' : colors.bleuSombre,
              },
            }}
          />
        </ThemeProvider>
      </View>
    </ApiProvider>
  );
}
