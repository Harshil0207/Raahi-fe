import { lazy, Suspense, useRef, useState } from 'react';
import { AssistantButton } from './AssistantButton';

/**
 * The assistant, as the rest of the app sees it.
 *
 * Mounted once in the app shell. Until somebody opens it, this is a button and
 * nothing else — the panel, its hook and the markdown renderer are behind a
 * lazy import, so an app that nobody asks for help in pays for a button and a
 * click handler.
 *
 * Nothing about it touches the ride flow. It owns no socket, no route and no
 * shared state, so it cannot delay a ride request or hold a screen open.
 */
const AssistantPanel = lazy(() =>
  import('./AssistantPanel').then((module) => ({ default: module.AssistantPanel }))
);

export function Assistant() {
  const [open, setOpen] = useState(false);
  // Held open across a close so the exit animation has something to animate,
  // and so a reopen does not refetch a thread that is still on screen.
  const [everOpened, setEverOpened] = useState(false);
  const button = useRef(null);

  return (
    <>
      <AssistantButton
        ref={button}
        open={open}
        onClick={() => {
          setOpen((value) => !value);
          setEverOpened(true);
        }}
      />

      {everOpened && (
        // No fallback: the panel is what the button is for, and a spinner in
        // the corner of the screen for a module that is already cached would be
        // a flash of nothing.
        <Suspense fallback={null}>
          <AssistantPanel open={open} onClose={() => setOpen(false)} returnFocusTo={button} />
        </Suspense>
      )}
    </>
  );
}
