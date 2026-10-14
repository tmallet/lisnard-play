import { focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

import { bindAppStateFocus } from '../focus';

test('retour au premier plan : le gestionnaire de focus suit AppState', () => {
  let listener: ((status: AppStateStatus) => void) | undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, l) => {
    listener = l as (status: AppStateStatus) => void;
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
  bindAppStateFocus();
  listener?.('background');
  expect(focusManager.isFocused()).toBe(false);
  listener?.('active');
  expect(focusManager.isFocused()).toBe(true);
});
