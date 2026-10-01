import { useEffect } from 'react';
import { useSetting, useUserSettings } from '@/hooks/useUserSettings';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const THEME_KEY = 'raahi.theme';
const MOTION_KEY = 'raahi.reducedMotion';

/**
 * Appearance and accessibility, applied to the document.
 *
 * WHY THE PREFERENCE IS IN TWO PLACES. The server is the source of truth — it
 * follows the person to another device, which is the whole point of storing it.
 * But settings arrive over the network, and a page that paints in light and
 * flips to dark a moment later is worse than one that was never themed at all.
 * So the chosen theme is also mirrored into localStorage, where the blocking
 * script in index.html reads it before first paint. The mirror is a cache, not
 * a second opinion: whenever the server's answer arrives it wins.
 *
 * "System" is the part that was missing. The old toggle stored only 'dark' or
 * 'light', so the first time anybody touched it they were pinned to that choice
 * for ever, and changing the phone's own theme afterwards did nothing. Here
 * `system` is a real stored value, and while it is selected the OS preference is
 * followed live.
 */
export function useAppearance() {
  const { loaded } = useUserSettings();

  const theme = useSetting('appearance.theme', readMirror(THEME_KEY, 'system'));
  const motion = useSetting('accessibility.reducedMotion', readMirror(MOTION_KEY, 'system'));
  const largerText = useSetting('accessibility.largerText', false);
  const highContrast = useSetting('accessibility.highContrast', false);

  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const systemReduced = useMediaQuery('(prefers-reduced-motion: reduce)');

  const dark = theme === 'system' ? systemDark : theme === 'dark';
  const reduced = motion === 'system' ? systemReduced : motion === 'on';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    // A data attribute rather than a class because CSS reads it with an
    // attribute selector alongside the media query, so the two paths — "the OS
    // asked" and "this person asked" — produce identical styling.
    document.documentElement.toggleAttribute('data-reduced-motion', reduced);
  }, [reduced]);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-larger-text', largerText);
  }, [largerText]);

  useEffect(() => {
    document.documentElement.toggleAttribute('data-high-contrast', highContrast);
  }, [highContrast]);

  useEffect(() => {
    // Only mirror once the real values have arrived. Writing the fallbacks
    // before then would overwrite a good cached choice with a guess.
    if (!loaded) return;
    writeMirror(THEME_KEY, theme);
    writeMirror(MOTION_KEY, motion);
  }, [loaded, theme, motion]);
}

function readMirror(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    // Private browsing, or storage blocked. The fallback is a sane default
    // rather than a crash on a screen nobody could then use.
    return fallback;
  }
}

function writeMirror(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Nothing to do: the server still has it, and the only cost is a brief
    // flash on the next cold start.
  }
}
