import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { projectPlace } from '@/lib/franceMap';
import { useTRPC } from '@/lib/trpc';

import { CampaignMap } from './CampaignMap';
import { PlaceCard } from './PlaceCard';

/** Vue « Déplacements » de l'onglet Campagne (spec intervention-places). */
export function TravelsView() {
  const trpc = useTRPC();
  const query = useQuery(
    trpc.campaign.places.queryOptions(undefined, { refetchInterval: 300_000 }),
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // Seuls les lieux que la carte sait dessiner (métropole et cinq départements
  // d'outre-mer) sont comptés : le chiffre annoncé correspond aux repères affichés.
  const places = (query.data?.places ?? []).filter((p) => projectPlace(p.lat, p.lon) !== null);
  const selected = places.find((p) => p.key === selectedKey) ?? null;
  const close = () => setSelectedKey(null);
  const count = places.reduce((n, p) => n + p.interventions.length, 0);

  if (query.isPending)
    return <Text className="font-sans text-base text-blanc/70">Chargement…</Text>;
  if (query.isError)
    return (
      <Text className="font-sans text-base text-blanc/85">
        La carte n’a pas pu être chargée. Réessayez dans un instant.
      </Text>
    );
  return (
    <View className="gap-4">
      <Text className="font-sans text-base text-blanc/85 leading-relaxed">
        {places.length === 0
          ? 'Aucun déplacement situé pour l’instant.'
          : `${count} ${count > 1 ? 'interventions' : 'intervention'} sur le terrain, dans ${places.length} ${places.length > 1 ? 'lieux' : 'lieu'}.`}
      </Text>
      {places.length > 0 ? (
        <CampaignMap
          places={places}
          selectedKey={selectedKey}
          onSelect={(p) => setSelectedKey(p.key)}
          onClose={close}
        >
          {/* Clé : une nouvelle fiche (et son focus) à chaque lieu. */}
          {selected ? <PlaceCard key={selected.key} place={selected} onClose={close} /> : null}
        </CampaignMap>
      ) : null}
      {!selected && places.length > 0 ? (
        <Text className="font-sans text-blanc/70 text-sm">
          Touchez un lieu pour voir ses interventions.
        </Text>
      ) : null}
      <Text className="font-sans text-blanc/70 text-xs leading-snug">
        Lieux déduits automatiquement des titres et descriptions ; les plateaux de télévision et de
        radio ne sont pas comptés. Un repère en pointillés est approximatif (région ou département).
        Fond de carte : IGN Admin Express, Licence Ouverte.
      </Text>
    </View>
  );
}
