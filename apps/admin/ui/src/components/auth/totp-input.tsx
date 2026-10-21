import { Input } from '@/components/ui/input';

/**
 * Saisie d'un code TOTP à six chiffres. Champ visible et standard (et non InputOTP de
 * shadcn/ui, dont le champ transparent échappe aux gestionnaires de mots de passe comme
 * Bitwarden) : `one-time-code`, nom `totp`. Validé dès le sixième chiffre.
 */
export function TotpInput({
  id,
  value,
  onChange,
  onComplete,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  invalid?: boolean;
}) {
  return (
    <Input
      id={id}
      name="totp"
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      placeholder="123456"
      autoFocus
      required
      aria-invalid={invalid || undefined}
      className="mx-auto h-12 max-w-48 text-center font-mono text-2xl tracking-[0.4em]"
      value={value}
      onChange={(e) => {
        // Collage ou remplissage automatique : chiffres seulement (« 123 456 » accepté).
        const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
        onChange(digits);
        if (digits.length === 6) onComplete?.(digits);
      }}
    />
  );
}
