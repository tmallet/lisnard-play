import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { AuthCard } from '@/components/auth/auth-card';
import { TotpInput } from '@/components/auth/totp-input';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { authClient } from '@/lib/api';

/** Second facteur : code de l'application d'authentification, ou code de secours. */
export function TwoFactor() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [backup, setBackup] = useState(false);
  const [pending, setPending] = useState(false);
  // Le sixième chiffre et la touche Entrée lancent chacun la vérification.
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async (value: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    const { error: failed } = backup
      ? await authClient.twoFactor.verifyBackupCode({ code: value.trim() })
      : await authClient.twoFactor.verifyTotp({ code: value.trim() });
    inFlight.current = false;
    setPending(false);
    if (failed) {
      setError('Code incorrect ou expiré.');
      setCode('');
    } else navigate('/videos');
  };

  return (
    <AuthCard
      title="Code de vérification"
      description={
        backup
          ? 'Saisissez l’un de vos codes de secours.'
          : 'Saisissez le code affiché par votre application d’authentification.'
      }
      footer={
        <Button
          type="button"
          variant="link"
          onClick={() => {
            setBackup(!backup);
            setCode('');
            setError(null);
          }}
        >
          {backup ? 'Utiliser l’application' : 'Utiliser un code de secours'}
        </Button>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          verify(code);
        }}
      >
        <FieldGroup>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="code" className={backup ? undefined : 'sr-only'}>
              {backup ? 'Code de secours' : 'Code à 6 chiffres'}
            </FieldLabel>
            {backup ? (
              <Input
                id="code"
                autoComplete="one-time-code"
                required
                autoFocus
                aria-invalid={error ? true : undefined}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            ) : (
              <TotpInput
                id="code"
                value={code}
                onChange={setCode}
                onComplete={verify}
                invalid={!!error}
              />
            )}
            {error ? (
              <FieldError className="text-center">{error}</FieldError>
            ) : backup ? null : (
              <FieldDescription className="text-center">
                Le code change toutes les 30 secondes.
              </FieldDescription>
            )}
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            Vérifier
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
