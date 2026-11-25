import { useEffect, useState } from 'react';

/** Date courante, rafraîchie chaque minute quand `enabled` (durée écoulée d'un direct). */
export function useMinuteTick(enabled: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
}
