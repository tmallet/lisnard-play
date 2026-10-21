import { useInvalidate } from '@refinedev/core';
import { useTable } from '@refinedev/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import { EyeIcon, EyeOffIcon, RefreshCwIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/refine-ui/data-table/data-table';
import {
  DataTableFilterCombobox,
  DataTableFilterDropdownText,
} from '@/components/refine-ui/data-table/data-table-filter';
import { ListView, ListViewHeader } from '@/components/refine-ui/views/list-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

import type { AdminItem } from '../../../../../packages/db/src/admin';

const STATES = [
  { value: 'visible', label: 'Visibles' },
  { value: 'hidden', label: 'Masquées' },
  { value: 'summary_failed', label: 'Résumé en échec' },
  { value: 'summary_requested', label: 'Résumé demandé' },
];

const SUMMARY: Record<
  AdminItem['summary'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  ok: { label: 'Résumé fait', variant: 'secondary' },
  requested: { label: 'Résumé demandé', variant: 'default' },
  failed: { label: 'Résumé en échec', variant: 'destructive' },
  not_speaking: { label: 'Ne s’exprime pas', variant: 'outline' },
  pending: { label: 'Résumé à venir', variant: 'outline' },
  none: { label: 'Sans résumé', variant: 'outline' },
};

/**
 * Vidéos et articles publiés (spec admin-backoffice) : vue liste et tableau de données
 * Refine, filtres par titre et par état ; masquer, réafficher, relancer le résumé.
 */
export function Videos() {
  const invalidate = useInvalidate();
  const [hiding, setHiding] = useState<AdminItem | null>(null);
  const [reason, setReason] = useState('');
  // Action, message de confirmation (ou d'erreur), puis rafraîchissement de la liste.
  const act = useCallback(
    async (action: () => Promise<unknown>, done: string) => {
      try {
        await action();
        toast.success(done);
      } catch {
        toast.error('L’action a échoué. Réessayez.');
      }
      await invalidate({ resource: 'videos', invalidates: ['list'] });
    },
    [invalidate],
  );

  const columns = useMemo<ColumnDef<AdminItem>[]>(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        enableSorting: false,
        header: ({ column, table }) => (
          <div className="flex items-center gap-1">
            <span>Intervention</span>
            <DataTableFilterDropdownText
              column={column}
              table={table}
              defaultOperator="contains"
              operators={['contains']}
              placeholder="Rechercher un titre"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="max-w-xl whitespace-normal">
            <a
              href={row.original.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium hover:underline"
            >
              {row.original.title}
            </a>
            <div className="text-muted-foreground text-xs">
              {row.original.official ? 'Sa chaîne' : row.original.outlet} · {row.original.day}
              {row.original.hiddenReason ? ` · Motif : ${row.original.hiddenReason}` : ''}
            </div>
          </div>
        ),
      },
      {
        id: 'state',
        accessorFn: (v) => (v.hiddenAt ? 'hidden' : 'visible'),
        enableSorting: false,
        header: ({ column, table }) => (
          <div className="flex items-center gap-1">
            <span>État</span>
            <DataTableFilterCombobox
              column={column}
              table={table}
              options={STATES}
              defaultOperator="eq"
              operators={['eq']}
              placeholder="Filtrer"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.hiddenAt ? (
              <Badge variant="destructive">Masquée</Badge>
            ) : (
              <Badge variant="secondary">Visible</Badge>
            )}
            <Badge variant={SUMMARY[row.original.summary].variant}>
              {SUMMARY[row.original.summary].label}
            </Badge>
          </div>
        ),
      },
      {
        id: 'actions',
        enableSorting: false,
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const v = row.original;
          return (
            <div className="flex flex-wrap justify-end gap-2">
              {v.hiddenAt ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    act(() => api.items.unhide.mutate({ id: v.id }), 'Intervention réaffichée.')
                  }
                >
                  <EyeIcon data-icon="inline-start" />
                  Réafficher
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setReason('');
                    setHiding(v);
                  }}
                >
                  <EyeOffIcon data-icon="inline-start" />
                  Masquer
                </Button>
              )}
              {v.summarizable ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={v.summary === 'requested'}
                  onClick={() =>
                    act(
                      () => api.items.requestSummary.mutate({ id: v.id }),
                      'Résumé demandé : le worker le refera au prochain cycle.',
                    )
                  }
                >
                  <RefreshCwIcon data-icon="inline-start" />
                  Relancer le résumé
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [act],
  );

  const table = useTable<AdminItem>({
    columns,
    refineCoreProps: { resource: 'videos', pagination: { pageSize: 25 } },
  });

  return (
    <ListView>
      <ListViewHeader title="Vidéos et articles" canCreate={false} />
      <DataTable table={table} />
      <Dialog open={hiding !== null} onOpenChange={(open) => !open && setHiding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masquer l’intervention</DialogTitle>
            <DialogDescription>
              {hiding?.title} disparaîtra du site et de l’app (flux, recherche, citations, récaps,
              carte). Vous pourrez la réafficher.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="hide-reason">Motif</FieldLabel>
            <Textarea
              id="hide-reason"
              placeholder="Hors campagne, doublon…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <FieldDescription>Facultatif, inscrit à l’historique.</FieldDescription>
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHiding(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                const target = hiding;
                setHiding(null);
                if (target)
                  await act(
                    () => api.items.hide.mutate({ id: target.id, reason }),
                    'Intervention masquée.',
                  );
              }}
            >
              <EyeOffIcon data-icon="inline-start" />
              Masquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ListView>
  );
}
