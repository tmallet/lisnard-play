import { Link } from 'expo-router';

/** Lien vers les mentions légales et la confidentialité (spec app-shell). */
export function LegalLink({ small = false }: { small?: boolean }) {
  return (
    <Link
      href="/mentions-legales"
      className={`font-sans-semibold text-chamois underline ${small ? 'text-xs' : 'text-sm'}`}
    >
      Mentions légales et confidentialité
    </Link>
  );
}
