import { useQuery } from '@tanstack/react-query';

import { CardGrid } from '@/components/CardGrid';
import { InterventionCard, type InterventionCardData } from '@/components/InterventionCard';
import { SectionTitle } from '@/components/SectionTitle';
import type { Theme } from '@/lib/format';
import { ApiProvider, useTRPC } from '@/lib/trpc';
import { shouldInvite, usePushAvailability } from '@/lib/usePushAvailability';

/** Rafraîchissement des directs et des interventions à venir (spec intervention-feed). */
const REFRESH_MS = 30_000;

interface Props {
  theme: Theme | null;
  live: InterventionCardData[];
  upcoming: InterventionCardData[];
  /** Heure du rendu serveur (ms) : les données initiales ne sont pas relues aussitôt. */
  renderedAt: number;
}

function Section({
  title,
  items,
  live,
}: {
  title: string;
  items: InterventionCardData[];
  live?: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle live={live}>{title}</SectionTitle>
      <CardGrid>
        {items.map((item) => (
          <li key={item.id}>
            <InterventionCard item={item} />
          </li>
        ))}
      </CardGrid>
    </section>
  );
}

/**
 * Invitation à s'abonner à la place de « En direct » quand aucun direct n'est en cours
 * (spec push-notifications) ; rien si le navigateur est abonné ou ne peut pas l'être.
 */
function NotifyInvite() {
  const availability = usePushAvailability();
  if (!shouldInvite(availability)) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[20px] border border-blanc/15 px-4 py-3">
      <span className="font-sans text-base text-blanc/85">Aucun direct en ce moment.</span>
      <a href="/notifications" className="font-sans-semibold text-base text-chamois underline">
        Être prévenu du prochain
      </a>
    </p>
  );
}

function Sections({ theme, live, upcoming, renderedAt }: Props) {
  const trpc = useTRPC();
  const options = {
    refetchInterval: REFRESH_MS,
    staleTime: 10_000,
    initialDataUpdatedAt: renderedAt,
  } as const;
  const liveQuery = useQuery(
    trpc.interventions.list.queryOptions(
      { status: 'live', theme: theme ?? undefined },
      { ...options, initialData: { items: live, nextCursor: null } },
    ),
  );
  const upcomingQuery = useQuery(
    trpc.interventions.list.queryOptions(
      { status: 'upcoming', theme: theme ?? undefined },
      { ...options, initialData: { items: upcoming, nextCursor: null } },
    ),
  );
  const liveItems = liveQuery.data.items;
  const upcomingItems = upcomingQuery.data.items;
  return (
    <>
      {liveItems.length > 0 ? (
        <Section title="En direct" items={liveItems} live />
      ) : theme ? null : (
        <NotifyInvite />
      )}
      {upcomingItems.length > 0 ? <Section title="À venir" items={upcomingItems} /> : null}
    </>
  );
}

/**
 * Sections « En direct » et « À venir » de l'accueil : rendues par le serveur, puis
 * rafraîchies toutes les 30 secondes et au retour sur l'onglet (spec intervention-feed).
 */
export default function LiveSections(props: Props) {
  return (
    <ApiProvider>
      <Sections {...props} />
    </ApiProvider>
  );
}
