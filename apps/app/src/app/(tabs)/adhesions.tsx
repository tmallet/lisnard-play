import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { MembershipChart } from '@/components/MembershipChart';
import { PageHead } from '@/components/PageHead';
import { Screen } from '@/components/Screen';
import { TimelineCard } from '@/components/TimelineCard';
import { Title } from '@/components/Title';
import { formatDateTime } from '@/lib/format';
import type { Marker } from '@/lib/timeline';
import { useTRPC } from '@/lib/trpc';

const members = new Intl.NumberFormat('fr-FR');

/** Adhésions à Nouvelle Énergie et interventions (spec membership-timeline, ADR 0026). */
export default function Membership() {
  const trpc = useTRPC();
  const timeline = useQuery(
    trpc.membership.timeline.queryOptions(undefined, { refetchInterval: 120_000 }),
  );
  const [selected, setSelected] = useState<Marker | null>(null);
  // Un repère cliqué reste sélectionné : survoler d'autres repères en allant vers le
  // lien de la carte ne doit pas la changer.
  const [pinned, setPinned] = useState(false);
  const data = timeline.data;

  return (
    <Screen wide>
      <PageHead
        title="Adhésions"
        description="Le nombre d’adhérents de Nouvelle Énergie au fil des interventions de David Lisnard."
      />
      <Title highlight="adhésions">Les adhésions au fil des interventions</Title>
      <Text className="font-sans text-base text-blanc/85 leading-relaxed">
        Chaque repère marque une intervention de David Lisnard ; les ronds sont les vidéos de sa
        chaîne. Une hausse au même moment ne prouve pas que l’intervention en est la cause.
      </Text>

      {timeline.isPending ? (
        <Text className="font-sans text-base text-blanc/70">Chargement…</Text>
      ) : !data?.total ? (
        <Text className="font-sans text-base text-blanc/85">
          Les chiffres d’adhésion sont momentanément indisponibles. Réessayez dans un instant.
        </Text>
      ) : (
        <View className="gap-4">
          <View className="gap-1">
            <Text className="font-sans-extrabold text-4xl text-blanc">
              {members.format(data.total.members)}
              <Text className="font-sans-bold text-blanc/85 text-lg"> adhérents</Text>
            </Text>
            <Text className="font-sans text-blanc/70 text-sm">
              {data.stale ? 'Données du ' : 'Mis à jour le '}
              {formatDateTime(data.total.updatedAt)}
              {data.stale ? ' (source momentanément indisponible)' : ''} · Source : {data.source}
            </Text>
          </View>
          <MembershipChart
            days={data.days}
            interventions={data.interventions}
            selectedKey={selected?.key ?? null}
            onPress={(marker) => {
              setSelected(marker);
              setPinned(true);
            }}
            onHover={(marker) => {
              if (!pinned) setSelected(marker);
            }}
          />
          {selected ? (
            <TimelineCard marker={selected} />
          ) : (
            <Text className="font-sans text-blanc/70 text-sm">
              Touchez un repère pour voir l’intervention.
            </Text>
          )}
        </View>
      )}
    </Screen>
  );
}
