import QRCode from 'qrcode';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/api';

import { Centered, Field } from './Login';

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
  const [error, setError] = useState<string | null>(null);

  if (!qr)
    return (
      <Centered title="Associer une application">
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const { data, error: failed } = await authClient.twoFactor.enable({ password });
            if (failed || !data || data.method !== 'totp')
              return setError('Mot de passe incorrect.');
            setBackupCodes(data.backupCodes);
            setQr(await QRCode.toDataURL(data.totpURI, { margin: 1, width: 220 }));
          }}
        >
          <p className="text-muted-foreground text-sm">
            L’accès exige un code d’une application d’authentification (1Password, Google
            Authenticator…).
          </p>
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
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit">Continuer</Button>
        </form>
      </Centered>
    );

  return (
    <Centered title="Scanner le code">
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const { error: failed } = await authClient.twoFactor.verifyTotp({ code: code.trim() });
          if (failed) setError('Code incorrect : vérifiez l’heure du téléphone et réessayez.');
          else navigate('/videos');
        }}
      >
        <img
          src={qr}
          alt="Code QR à scanner avec l’application d’authentification"
          className="mx-auto"
        />
        <div className="grid gap-1">
          <p className="font-medium text-sm">Codes de secours, à conserver en lieu sûr :</p>
          <pre className="rounded-md bg-muted p-3 text-xs">{backupCodes.join('\n')}</pre>
        </div>
        <Field id="code" label="Premier code affiché par l’application">
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </Field>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit">Activer</Button>
      </form>
    </Centered>
  );
}
