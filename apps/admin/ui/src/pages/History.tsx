import { useTable } from '@refinedev/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

import { DataTable } from '@/components/refine-ui/data-table/data-table';
import { ListView, ListViewHeader } from '@/components/refine-ui/views/list-view';
import { Badge } from '@/components/ui/badge';

import type { AdminActionEntry } from '../../../../../packages/db/src/admin';

const LABELS: Record<AdminActionEntry['kind'], string> = {
  hide: 'Masquée',
  unhide: 'Réaffichée',
  request_summary: 'Résumé demandé',
};

const dateTime = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Paris',
});

/** Journal des actions, en lecture seule (spec admin-backoffice). */
export function History() {
  const columns = useMemo<ColumnDef<AdminActionEntry>[]>(
    () => [
      {
        id: 'at',
        header: 'Date',
        enableSorting: false,
        cell: ({ row }) => dateTime.format(new Date(row.original.at)),
      },
      {
        id: 'kind',
        header: 'Action',
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={row.original.kind === 'hide' ? 'destructive' : 'secondary'}>
            {LABELS[row.original.kind]}
          </Badge>
        ),
      },
      {
        id: 'title',
        header: 'Intervention',
        enableSorting: false,
        cell: ({ row }) => <div className="max-w-md whitespace-normal">{row.original.title}</div>,
      },
      {
        id: 'reason',
        header: 'Motif',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.reason ?? '—'}</span>
        ),
      },
    ],
    [],
  );
  const table = useTable<AdminActionEntry>({
    columns,
    refineCoreProps: { resource: 'actions', pagination: { pageSize: 25 } },
  });
  return (
    <ListView>
      <ListViewHeader title="Historique" canCreate={false} />
      <DataTable table={table} />
    </ListView>
  );
}
