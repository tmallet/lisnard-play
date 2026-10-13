import { useQuery } from '@tanstack/react-query';
import { Text } from 'react-native';

import { useTRPC } from '@/lib/trpc';

/** Statut de l'API, affiché en développement uniquement (spec api-transport). */
export function HealthStatus() {
  if (!__DEV__) return null;
  return <HealthStatusQuery />;
}

function HealthStatusQuery() {
  const trpc = useTRPC();
  const { data, error, isPending } = useQuery(trpc.health.queryOptions());
  const label = isPending
    ? 'API : vérification…'
    : error
      ? `API : erreur (${error.message})`
      : `API : ${data?.status} · v${data?.version}`;
  return (
    <Text testID="health-status" className="font-sans text-emeraude text-xs">
      {label}
    </Text>
  );
}
