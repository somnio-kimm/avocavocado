import { Store } from './store.js';

function v(pat) {
  if (!Store.hapticEnabled) return;
  navigator.vibrate?.(pat);
}

export const Haptic = {
  light()   { v(10); },
  medium()  { v(20); },
  success() { v([10, 50, 10]); },
  error()   { v([40, 30, 40]); },
};
