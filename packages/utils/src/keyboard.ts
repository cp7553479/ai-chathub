//import { KeyboardEvent } from 'react';
import { isMacOS } from './platform';

type KeyModEvent = { ctrlKey: boolean, metaKey: boolean; };

export const isCommandPressed = (event: KeyModEvent) => {
  const isMac = isMacOS();

  if (isMac) {
    return event.metaKey; // Use metaKey (Command key) on macOS
  } else {
    return event.ctrlKey; // Use ctrlKey on Windows/Linux
  }
};
