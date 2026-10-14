import { Link } from 'expo-router';
import { Text } from 'react-native';

import { LegalLink } from '@/components/LegalLink';
import { PageHead } from '@/components/PageHead';
import { Screen } from '@/components/Screen';
import { Title } from '@/components/Title';
import { APP_NAME, CONTACT, INDEPENDENCE_NOTICE, SOURCES_NOTICE } from '@/config/app';

export default function About() {
  return (
    <Screen footer={false}>
      <PageHead title="À propos" description={INDEPENDENCE_NOTICE} />
      <Title highlight="propos">À propos</Title>
      <Text className="font-sans text-base text-blanc/85 leading-relaxed">
        {APP_NAME} recense les interventions publiques de David Lisnard, candidat à l’élection
        présidentielle de 2027 : passages télévisés et radio, entretiens de presse, podcasts,
        meetings et discours, en direct comme en replay.
      </Text>
      <Text className="font-sans-bold text-base text-blanc">{INDEPENDENCE_NOTICE}</Text>
      <Text className="font-sans text-base text-blanc/85 leading-relaxed">{SOURCES_NOTICE}</Text>
      <Link href={CONTACT.url} className="font-sans-semibold text-base text-chamois underline">
        {CONTACT.label}
      </Link>
      <LegalLink />
    </Screen>
  );
}
