import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { blancSecondaire, colors } from '@/theme/colors';
import { fontFamily } from '@/theme/fonts';

/**
 * Champ de recherche de l'accueil (spec intervention-feed) : une seule ligne, pour ne pas
 * repousser les interventions sous la ligne de flottaison d'un téléphone.
 */
export function SearchBox({ value, onSearch }: { value: string; onSearch: (q: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <View
      accessibilityRole="search"
      className="flex-row items-center gap-2 rounded-full border border-blanc/25 bg-blanc/5 pr-1 pl-4"
    >
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => onSearch(text.trim())}
        placeholder="Rechercher une citation, un sujet…"
        placeholderTextColor={blancSecondaire}
        returnKeyType="search"
        accessibilityLabel="Rechercher dans les citations et les interventions"
        autoCorrect={false}
        style={{
          flex: 1,
          color: colors.blanc,
          fontFamily: fontFamily.regular,
          fontSize: 15,
          paddingVertical: 8,
        }}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onSearch('')}
          className="rounded-full px-3 py-1.5"
        >
          <Text className="font-sans-semibold text-chamois text-sm">Effacer</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lancer la recherche"
          onPress={() => onSearch(text.trim())}
          className="rounded-full bg-chamois px-3 py-1.5"
        >
          <Text className="font-sans-bold text-bleu-sombre text-sm">OK</Text>
        </Pressable>
      )}
    </View>
  );
}
