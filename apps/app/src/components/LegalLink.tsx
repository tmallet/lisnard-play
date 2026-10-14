import { Link } from 'expo-router';

/** Lien vers les mentions légales et la confidentialité (spec app-shell). */
export function LegalLink() {
  return (
    <Link href="/mentions-legales" className="font-sans-semibold text-chamois text-sm underline">
      Mentions légales et confidentialité
    </Link>
  );
}
