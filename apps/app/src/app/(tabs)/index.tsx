import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { InterventionFeed } from '@/components/InterventionFeed';
import { NotificationsEntry } from '@/components/NotificationsEntry';
import { PageHead } from '@/components/PageHead';
import { Screen } from '@/components/Screen';
import { SearchBox } from '@/components/SearchBox';
import { SearchResults } from '@/components/SearchResults';
import { Title } from '@/components/Title';

export default function Home() {
  // Recherche dans l'adresse (?q=) : une recherche se partage comme une page.
  const { q } = useLocalSearchParams<{ q?: string }>();
  const query = typeof q === 'string' ? q.trim() : '';
  return (
    <Screen wide>
      <PageHead />
      <Title highlight="David Lisnard">Toutes les interventions de David Lisnard</Title>
      <Text className="font-sans-bold text-blanc text-sm md:text-lg">
        En direct, à venir et passées : télévision, radio, presse, meetings.
      </Text>
      <NotificationsEntry />
      <SearchBox
        value={query}
        onSearch={(text) =>
          // replace plutôt que setParams : jamais de « q=undefined » dans l'adresse.
          router.replace(text ? `/?q=${encodeURIComponent(text)}` : '/')
        }
      />
      {query ? <SearchResults q={query} /> : <InterventionFeed />}
    </Screen>
  );
}
