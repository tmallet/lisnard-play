/**
 * Demande d'écoute d'un passage (citations, ADR 0028) : les îlots de la page ne partagent
 * pas d'état React ; le bouton émet un évènement que le lecteur écoute.
 */
export const PLAY_EVENT = 'lisnard:play';

export function requestPlay(startS: number): void {
  const url = new URL(window.location.href);
  url.searchParams.set('t', String(startS));
  window.history.replaceState(window.history.state, '', url);
  window.dispatchEvent(new CustomEvent<number>(PLAY_EVENT, { detail: startS }));
  document.getElementById('lecteur')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
