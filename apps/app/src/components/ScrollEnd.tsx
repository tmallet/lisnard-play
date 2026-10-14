import { createContext, useContext, useEffect, useRef } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

type Listener = () => void;

/** Distance au bas du contenu (en points) à partir de laquelle on charge la suite. */
const THRESHOLD = 800;

const ScrollEndContext = createContext<Set<Listener> | null>(null);

export const ScrollEndProvider = ScrollEndContext.Provider;

/**
 * Côté Screen : mesure le ScrollView et prévient les abonnés quand le bas du contenu
 * approche. Le contrôle a aussi lieu quand le contenu change de taille, pour qu'une
 * première page plus courte que l'écran déclenche la suivante sans défilement.
 */
export function useScrollEndSource() {
  const listeners = useRef(new Set<Listener>()).current;
  const metrics = useRef({ offset: 0, viewport: 0, content: 0 });

  const check = () => {
    const { offset, viewport, content } = metrics.current;
    if (viewport > 0 && offset + viewport >= content - THRESHOLD)
      for (const listener of listeners) listener();
  };

  return {
    listeners,
    scrollProps: {
      scrollEventThrottle: 100,
      onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        metrics.current.offset = e.nativeEvent.contentOffset.y;
        metrics.current.viewport = e.nativeEvent.layoutMeasurement.height;
        metrics.current.content = e.nativeEvent.contentSize.height;
        check();
      },
      onLayout: (e: LayoutChangeEvent) => {
        metrics.current.viewport = e.nativeEvent.layout.height;
        check();
      },
      onContentSizeChange: (_width: number, height: number) => {
        metrics.current.content = height;
        check();
      },
    },
  };
}

/** Côté contenu : appelle `onEndReached` quand le bas de l'écran approche. */
export function useOnEndReached(onEndReached: () => void) {
  const listeners = useContext(ScrollEndContext);
  const latest = useRef(onEndReached);
  latest.current = onEndReached;
  useEffect(() => {
    if (!listeners) return;
    const listener = () => latest.current();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [listeners]);
}
