import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { MembershipView } from '@/components/MembershipView';
import { PageHead } from '@/components/PageHead';
import { Screen } from '@/components/Screen';
import { Title } from '@/components/Title';
import { TravelsView } from '@/components/TravelsView';

const VIEWS = [
  { value: 'adhesions', label: 'Adhésions' },
  { value: 'deplacements', label: 'Déplacements' },
] as const;
type View_ = (typeof VIEWS)[number]['value'];

/**
 * Onglet « Campagne » (specs membership-timeline et intervention-places, ADR 0027) : la
 * courbe des adhésions et la carte des déplacements. La vue choisie est dans l'adresse.
 */
export default function Campaign() {
  const { vue } = useLocalSearchParams<{ vue?: string }>();
  const current: View_ = vue === 'deplacements' ? 'deplacements' : 'adhesions';

  return (
    <Screen wide>
      <PageHead
        title="Campagne"
        description="Les adhésions à Nouvelle Énergie et les déplacements de David Lisnard au fil de sa campagne."
      />
      <Title highlight="campagne">La campagne en chiffres</Title>
      <View role="tablist" className="flex-row self-start rounded-full border border-blanc/20 p-1">
        {VIEWS.map((view) => {
          const selected = view.value === current;
          return (
            <Pressable
              key={view.value}
              role="tab"
              accessibilityState={{ selected }}
              onPress={() =>
                router.setParams({ vue: view.value === 'adhesions' ? undefined : view.value })
              }
              className={`rounded-full px-4 py-1.5 ${selected ? 'bg-chamois' : ''}`}
            >
              <Text
                className={`font-sans-semibold text-sm ${selected ? 'text-bleu-sombre' : 'text-blanc'}`}
              >
                {view.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {current === 'deplacements' ? <TravelsView /> : <MembershipView />}
    </Screen>
  );
}
