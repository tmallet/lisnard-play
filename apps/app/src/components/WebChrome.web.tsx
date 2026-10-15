import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { APP_NAME } from '@/config/app';
import { NAV_ITEMS } from '@/config/navigation';
import { colors } from '@/theme/colors';

import { Footer } from './Footer';

/** Cloche (trait), en couleur du texte : entrée vers les notifications. */
function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: colors.blanc }}
    >
      <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3H4a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" />
      <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
    </svg>
  );
}

/** Web : en-tête avec liens, contenu, pied de page avec la mention d'indépendance. */
export function WebChrome({ children }: { children: ReactNode }) {
  return (
    <View className="min-h-full flex-1">
      <View role="banner" className="flex-row items-center gap-3 px-6 py-4 md:gap-6">
        {/* Sous 640 px, le nom laisse la place aux quatre entrées ; « Accueil » y mène aussi. */}
        <Link href="/" asChild>
          <Pressable className="mr-auto hidden sm:flex">
            <Text className="font-sans-extrabold text-blanc uppercase tracking-widest">
              {APP_NAME}
            </Text>
          </Pressable>
        </Link>
        <View
          role="navigation"
          className="flex-1 flex-row items-center justify-between gap-3 sm:flex-none sm:justify-start md:gap-5"
        >
          {NAV_ITEMS.map((link) => (
            <Link key={link.href} href={link.href} asChild>
              <Pressable>
                <Text className="font-sans-semibold text-blanc text-sm md:text-base">
                  {link.label}
                </Text>
              </Pressable>
            </Link>
          ))}
          <Link href="/notifications" asChild>
            <Pressable accessibilityLabel="Notifications" className="flex-row items-center gap-1.5">
              <BellIcon />
              <Text className="hidden font-sans-semibold text-blanc md:flex">Notifications</Text>
            </Pressable>
          </Link>
        </View>
      </View>
      <View role="main" className="flex-1">
        {children}
      </View>
      {/* Pied de page fixe dès la largeur md ; sur téléphone, il est en fin de défilement
          et la mention est rappelée en tête de contenu (Screen.web.tsx). */}
      <View className="hidden md:flex">
        <Footer inset />
      </View>
    </View>
  );
}
