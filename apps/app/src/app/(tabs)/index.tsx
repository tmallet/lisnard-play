import { Platform, Text } from 'react-native';

import { Footer } from '@/components/Footer';
import { HealthStatus } from '@/components/HealthStatus';
import { PageHead } from '@/components/PageHead';
import { Screen } from '@/components/Screen';
import { Title } from '@/components/Title';

export default function Home() {
  return (
    <Screen>
      <PageHead />
      <Title highlight="David Lisnard">Toutes les interventions de David Lisnard</Title>
      <Text className="font-sans-bold text-blanc text-lg">
        En direct, à venir et passées : télévision, radio, presse, meetings.
      </Text>
      <Text className="font-sans text-base text-blanc/85 leading-relaxed">
        La liste des interventions arrive bientôt.
      </Text>
      <HealthStatus />
      {Platform.OS !== 'web' && <Footer />}
    </Screen>
  );
}
