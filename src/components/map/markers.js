import L from 'leaflet';

/**
 * Leaflet's default marker images are bundled as separate assets that break
 * under Vite's asset pipeline, so every marker here is an inline SVG divIcon.
 *
 * The colours are the same design tokens the rest of the app uses. Leaflet
 * builds these from an HTML string rather than through React, so they read the
 * CSS variables directly — which keeps the map in step with the theme, light or
 * dark, instead of carrying its own hard-coded palette.
 */

const icon = (html, size = 34, anchor = [17, 34]) =>
  L.divIcon({
    html,
    className: 'raahi-marker',
    iconSize: [size, size],
    iconAnchor: anchor
  });

const pin = (fill, ring) => `
  <svg viewBox="0 0 34 44" width="34" height="44" aria-hidden="true">
    <path d="M17 43c0 0-13-14.2-13-23A13 13 0 1 1 30 20c0 8.8-13 23-13 23z"
          fill="${fill}" stroke="${ring}" stroke-width="1.5"/>
    <circle cx="17" cy="19" r="5" fill="${ring}"/>
  </svg>`;

export const pickupIcon = () => icon(pin('var(--accent)', 'var(--accent-contrast)'), 34, [17, 44]);

export const destinationIcon = () => icon(pin('var(--text)', 'var(--background)'), 34, [17, 44]);

// Pulsing dot for the viewer's own position.
export const selfIcon = () =>
  icon(
    `<span style="position:relative;display:grid;place-items:center;width:16px;height:16px">
       <span style="position:absolute;width:16px;height:16px;border-radius:9999px;background:var(--accent);opacity:.45"
             class="animate-ping"></span>
       <span style="position:relative;width:14px;height:14px;border-radius:9999px;background:var(--accent);
                    box-shadow:0 0 0 2px var(--background)"></span>
     </span>`,
    16,
    [8, 8]
  );

// Rider marker, rotated to heading when the device reports one.
export const vehicleIcon = (heading = 0) =>
  icon(
    `<span style="display:block;transform:rotate(${heading}deg);transition:transform .4s ease">
      <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
        <circle cx="16" cy="16" r="14" fill="var(--surface-elevated)" stroke="var(--rider-status)" stroke-width="2"/>
        <path d="M16 8l5 12-5-3-5 3z" fill="var(--rider-status)"/>
      </svg>
    </span>`,
    32,
    [16, 16]
  );
