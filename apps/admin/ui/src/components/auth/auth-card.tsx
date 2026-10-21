import { ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/** Cadre des écrans de connexion : nom du site, carte shadcn, mention d'indépendance. */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-4">
      <div className="flex items-center gap-2 font-bold text-lg tracking-[0.2em] uppercase">
        <ShieldCheck className="size-5 text-primary" aria-hidden />
        Lisnard Play
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer ? <CardFooter className="justify-center">{footer}</CardFooter> : null}
      </Card>
      <p className="max-w-sm text-center text-muted-foreground text-xs">
        Administration. Initiative indépendante de soutiens : ce site ne dépend ni de Nouvelle
        Énergie ni de David Lisnard.
      </p>
    </main>
  );
}
