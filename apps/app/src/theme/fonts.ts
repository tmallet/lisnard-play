import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/montserrat';

/**
 * Noms des familles Montserrat chargées (design D5). Ils doivent correspondre aux
 * tokens `--font-sans-*` de global.css ; à utiliser là où une API exige un nom JS.
 */
export const fontFamily = {
  regular: 'Montserrat_400Regular',
  semibold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
  extrabold: 'Montserrat_800ExtraBold',
} as const;

/** Montserrat embarquée dans le bundle : aucun appel à Google Fonts à l'exécution. */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    [fontFamily.regular]: Montserrat_400Regular,
    [fontFamily.semibold]: Montserrat_600SemiBold,
    [fontFamily.bold]: Montserrat_700Bold,
    [fontFamily.extrabold]: Montserrat_800ExtraBold,
  });
  // En cas d'échec de chargement, on affiche quand même l'interface (police système).
  return loaded || error != null;
}
