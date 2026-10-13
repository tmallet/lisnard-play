import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { APP_NAME } from '@/config/app';
import { NAV_ITEMS } from '@/config/navigation';

import { Footer } from './Footer';

/** Web : en-tête avec liens, contenu, pied de page avec la mention d'indépendance. */
export function WebChrome({ children }: { children: ReactNode }) {
  return (
    <View className="min-h-full flex-1">
      <View role="banner" className="flex-row items-center gap-6 px-6 py-4">
        <Link href="/" asChild>
          <Pressable className="mr-auto">
            <Text className="font-sans-extrabold text-blanc uppercase tracking-widest">
              {APP_NAME}
            </Text>
          </Pressable>
        </Link>
        <View role="navigation" className="flex-row gap-5">
          {NAV_ITEMS.map((link) => (
            <Link key={link.href} href={link.href} asChild>
              <Pressable>
                <Text className="font-sans-semibold text-blanc">{link.label}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      </View>
      <View role="main" className="flex-1">
        {children}
      </View>
      <Footer inset />
    </View>
  );
}
