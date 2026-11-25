import type { APIRoute } from 'astro';

import { relayToAdmin, withPreviewNumber } from '@/server/admin-relay';

/**
 * Backoffice (ADR 0032) : service séparé, joint par le réseau interne
 * (ADMIN_INTERNAL_URL). En prévisualisation Coolify, `{pr}` devient le numéro de la PR.
 */
const adminUrl = () =>
  withPreviewNumber(process.env.ADMIN_INTERNAL_URL, process.env.COOLIFY_CONTAINER_NAME);

export const ALL: APIRoute = ({ request }) => relayToAdmin(request, adminUrl());
