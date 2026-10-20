import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/api';

import { Centered, Field } from './Login';

/** Second facteur : code de l'application d'authentification, ou code de secours. */
export function TwoFactor() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [backup, setBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Centered title="Code de vérification">
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const { error: failed } = backup
            ? await authClient.twoFactor.verifyBackupCode({ code: code.trim() })
            : await authClient.twoFactor.verifyTotp({ code: code.trim() });
          if (failed) setError('Code incorrect ou expiré.');
          else navigate('/videos');
        }}
      >
        <Field id="code" label={backup ? 'Code de secours' : 'Code à 6 chiffres'}>
          <Input
            id="code"
            inputMode={backup ? 'text' : 'numeric'}
            autoComplete="one-time-code"
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </Field>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit">Vérifier</Button>
        <Button type="button" variant="link" onClick={() => setBackup(!backup)}>
          {backup ? 'Utiliser l’application' : 'Utiliser un code de secours'}
        </Button>
      </form>
    </Centered>
  );
}
