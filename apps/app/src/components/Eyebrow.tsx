import { Text } from 'react-native';

/** Surtitre des sites du groupe : libellé chamois en petites capitales. */
export function Eyebrow({ children }: { children: string }) {
  return (
    <Text className="font-sans-bold text-xs uppercase tracking-widest text-chamois">
      {children}
    </Text>
  );
}
