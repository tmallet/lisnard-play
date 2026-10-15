import { Redirect } from 'expo-router';

/** Ancienne adresse de l'onglet « Adhésions », devenu « Campagne » (ADR 0027). */
export default function MembershipRedirect() {
  return <Redirect href="/campagne" />;
}
