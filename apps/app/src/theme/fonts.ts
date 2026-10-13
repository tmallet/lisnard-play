import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/montserrat';

/**
 * Montserrat embarquée dans le bundle (design D5) : aucun appel à Google Fonts
 * à l'exécution. Les noms doivent correspondre aux tokens `--font-sans-*` de global.css.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });
  // En cas d'échec de chargement, on affiche quand même l'interface (police système).
  return loaded || error != null;
}
