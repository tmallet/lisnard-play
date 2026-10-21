import './index.css';

import { Authenticated, Refine } from '@refinedev/core';
import routerProvider, { NavigateToResource } from '@refinedev/react-router';
import { History as HistoryIcon, ShieldCheck, Video } from 'lucide-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router';

import { Layout } from '@/components/refine-ui/layout/layout';
import { ThemeProvider } from '@/components/refine-ui/theme/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { i18nProvider } from '@/lib/i18n';
import { authProvider, dataProvider } from '@/lib/providers';
import { History } from '@/pages/History';
import { Login } from '@/pages/Login';
import { Setup } from '@/pages/Setup';
import { TwoFactor } from '@/pages/TwoFactor';
import { Videos } from '@/pages/Videos';

/**
 * Backoffice (spec admin-backoffice, ADR 0032) : application Refine, mise en page et
 * composants de Refine UI (shadcn/ui). Connexion en deux temps : mot de passe, puis TOTP.
 */
function App() {
  return (
    <BrowserRouter basename="/admin">
      {/* Thème sombre par défaut, comme le site public ; bascule dans l'en-tête. */}
      <ThemeProvider defaultTheme="dark" storageKey="lisnard-admin-theme">
        <TooltipProvider>
          <Refine
            routerProvider={routerProvider}
            dataProvider={dataProvider}
            authProvider={authProvider}
            i18nProvider={i18nProvider}
            resources={[
              { name: 'videos', list: '/videos', meta: { label: 'Vidéos', icon: <Video /> } },
              {
                name: 'actions',
                list: '/historique',
                meta: { label: 'Historique', icon: <HistoryIcon /> },
              },
            ]}
            options={{
              disableTelemetry: true,
              syncWithLocation: true,
              title: { text: 'Lisnard Play', icon: <ShieldCheck /> },
            }}
          >
            <Routes>
              <Route
                element={
                  // Sans « ?to= » : Refine le suivrait après le mot de passe, avant le code TOTP.
                  <Authenticated
                    key="admin"
                    redirectOnFail="/connexion"
                    appendCurrentPathToQuery={false}
                  >
                    <Layout>
                      <Outlet />
                    </Layout>
                  </Authenticated>
                }
              >
                <Route index element={<NavigateToResource resource="videos" />} />
                <Route path="/videos" element={<Videos />} />
                <Route path="/historique" element={<History />} />
              </Route>
              <Route path="/connexion" element={<Login />} />
              <Route path="/code" element={<TwoFactor />} />
              <Route path="/association" element={<Setup />} />
              <Route path="*" element={<Navigate to="/videos" replace />} />
            </Routes>
          </Refine>
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

const root = document.getElementById('root');
if (root)
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
