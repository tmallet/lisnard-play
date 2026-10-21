import QRCode from 'qrcode';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { AuthCard } from '@/components/auth/auth-card';
import { TotpInput } from '@/components/auth/totp-input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { authClient } from '@/lib/api';

/**
 * Association du TOTP, obligatoire avant tout accès : mot de passe, code QR à scanner,
 * codes de secours à conserver, puis premier code pour confirmer.
 */
export function Setup() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!qr)
    return (
      <AuthCard
        title="Associer une application"
        description="L’accès exige un code d’une application d’authentification (1Password, Google Authenticator…)."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            const { data, error: failed } = await authClient.twoFactor.enable({ password });
            setPending(false);
            if (failed || !data || data.method !== 'totp')
              return setError('Mot de passe incorrect.');
            setError(null);
            setBackupCodes(data.backupCodes);
            setQr(await QRCode.toDataURL(data.totpURI, { margin: 1, width: 200 }));
          }}
        >
          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                autoFocus
                aria-invalid={error ? true : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null}
              Continuer
            </Button>
          </FieldGroup>
        </form>
      </AuthCard>
    );

  const activate = async (value: string) => {
    setPending(true);
    const { error: failed } = await authClient.twoFactor.verifyTotp({ code: value.trim() });
    setPending(false);
    if (failed) {
      setError('Code incorrect : vérifiez l’heure du téléphone et réessayez.');
      setCode('');
    } else navigate('/videos');
  };

  return (
    <AuthCard
      title="Scanner le code"
      description="Scannez ce code QR avec votre application, puis saisissez le premier code."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          activate(code);
        }}
      >
        <FieldGroup>
          {/* Fond blanc fixe : le code QR doit rester lisible en thème sombre. */}
          <img
            src={qr}
            alt="Code QR à scanner avec l’application d’authentification"
            className="mx-auto rounded-lg bg-white p-2"
          />
          <Alert>
            <AlertTitle>Codes de secours</AlertTitle>
            <AlertDescription>
              <p>À conserver en lieu sûr : chacun remplace une fois le code de l’application.</p>
              <pre className="mt-2 w-full rounded-md bg-muted p-3 font-mono text-foreground text-xs">
                {backupCodes.join('\n')}
              </pre>
            </AlertDescription>
          </Alert>
          <FieldSeparator />
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="code">Premier code affiché par l’application</FieldLabel>
            <TotpInput
              id="code"
              value={code}
              onChange={setCode}
              onComplete={activate}
              invalid={!!error}
            />
            {error ? (
              <FieldError>{error}</FieldError>
            ) : (
              <FieldDescription>Six chiffres, renouvelés toutes les 30 secondes.</FieldDescription>
            )}
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            Activer
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
