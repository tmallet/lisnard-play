import { Link } from 'expo-router';
import { Text } from 'react-native';

import { PageHead } from '@/components/PageHead';
import { Screen } from '@/components/Screen';
import { Title } from '@/components/Title';

export default function NotFound() {
  return (
    <Screen>
      <PageHead title="Page introuvable" description="Cette page n’existe pas ou a été déplacée." />
      <Title highlight="introuvable">Page introuvable</Title>
      <Text className="font-sans text-base text-blanc/85 leading-relaxed">
        Cette page n’existe pas ou a été déplacée.
      </Text>
      <Link href="/" className="font-sans-semibold text-base text-chamois underline">
        Revenir à l’accueil
      </Link>
    </Screen>
  );
}
