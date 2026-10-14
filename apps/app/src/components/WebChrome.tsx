import type { ReactNode } from 'react';

/** Mobile : la mise en page commune vient des onglets natifs et de <Screen>. */
export function WebChrome({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
