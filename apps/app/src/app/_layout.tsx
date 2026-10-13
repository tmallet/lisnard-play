import '../global.css';

import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';

import { ApiProvider } from '@/lib/trpc';
import { useAppFonts } from '@/theme/fonts';

if (Platform.OS !== 'web') SplashScreen.preventAutoHideAsync();

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
        <Slot />
      </View>
    </ApiProvider>
  );
}
