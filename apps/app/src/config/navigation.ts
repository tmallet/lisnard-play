import type { Href } from 'expo-router';

/** Onglets de l'application : source unique pour l'en-tête web et la barre native. */
export const NAV_ITEMS = [
  {
    route: 'index',
    href: '/',
    label: 'Accueil',
    icon: { sf: { default: 'house', selected: 'house.fill' }, md: 'home' },
  },
  {
    route: 'adhesions',
    href: '/adhesions',
    label: 'Adhésions',
    icon: { sf: { default: 'person.3', selected: 'person.3.fill' }, md: 'groups' },
  },
  {
    route: 'a-propos',
    href: '/a-propos',
    label: 'À propos',
    icon: { sf: { default: 'info.circle', selected: 'info.circle.fill' }, md: 'info' },
  },
] as const satisfies readonly {
  route: string;
  href: Href;
  label: string;
  icon: { sf: { default: string; selected: string }; md: string };
}[];
