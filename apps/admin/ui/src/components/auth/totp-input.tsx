import { REGEXP_ONLY_DIGITS } from 'input-otp';

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';

/** Saisie d'un code TOTP à six chiffres (InputOTP de shadcn/ui). */
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
    <InputOTP
      id={id}
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      autoFocus
      required
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      aria-invalid={invalid || undefined}
      containerClassName="justify-center"
    >
      <InputOTPGroup>
        <InputOTPSlot index={0} aria-invalid={invalid || undefined} />
        <InputOTPSlot index={1} aria-invalid={invalid || undefined} />
        <InputOTPSlot index={2} aria-invalid={invalid || undefined} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} aria-invalid={invalid || undefined} />
        <InputOTPSlot index={4} aria-invalid={invalid || undefined} />
        <InputOTPSlot index={5} aria-invalid={invalid || undefined} />
      </InputOTPGroup>
    </InputOTP>
  );
}
