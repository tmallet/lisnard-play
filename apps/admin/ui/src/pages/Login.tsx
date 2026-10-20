import { useLogin } from '@refinedev/core';
import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Connexion par mot de passe ; le code TOTP est demandé ensuite. */
export function Login() {
  const { mutate: login, isPending, error } = useLogin<{ email: string; password: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <Centered title="Administration">
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          login({ email, password });
        }}
      >
        <Field id="email" label="Adresse">
          <Input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field id="password" label="Mot de passe">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit" disabled={isPending}>
          Se connecter
        </Button>
      </form>
    </Centered>
  );
}

export function Centered({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}

export function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
