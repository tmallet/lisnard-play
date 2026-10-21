import { useLogin } from '@refinedev/core';
import { useState } from 'react';

import { AuthCard } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

/** Connexion par mot de passe ; le code TOTP est demandé ensuite. */
export function Login() {
  const { mutate: login, isPending, error } = useLogin<{ email: string; password: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <AuthCard title="Connexion" description="Accès réservé à l’administrateur.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          login({ email, password });
        }}
      >
        <FieldGroup>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="email">Adresse</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              autoFocus
              aria-invalid={error ? true : undefined}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={error ? true : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error ? <FieldError>{error.message}</FieldError> : null}
          </Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner /> : null}
            Se connecter
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
