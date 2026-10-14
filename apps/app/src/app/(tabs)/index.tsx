import { Text } from 'react-native';

import { InterventionFeed } from '@/components/InterventionFeed';
import { PageHead } from '@/components/PageHead';
import { Screen } from '@/components/Screen';
import { Title } from '@/components/Title';

export default function Home() {
  return (
    <Screen wide>
      <PageHead />
      <Title highlight="David Lisnard">Toutes les interventions de David Lisnard</Title>
      <Text className="font-sans-bold text-blanc text-lg">
        En direct, à venir et passées : télévision, radio, presse, meetings.
      </Text>
      <InterventionFeed />
    </Screen>
  );
}
