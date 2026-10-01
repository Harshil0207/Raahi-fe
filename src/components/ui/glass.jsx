import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';

/**
 * The liquid-glass treatment: a blurred, saturated backdrop bent through an SVG
 * displacement map, with a specular top edge and optional chromatic fringe.
 *
 * Written in-house because `liquid-glass-react` positions its layers with a
 * hard-coded translate(-50%,-50%) and pixel top/left, which only holds together
 * for a single centred fixed element — in normal document flow its layers stack
 * vertically and the content lands off-screen.
 *
 * Use it for things that float over the map or over other content. Do not wrap
 * list rows, long text or whole page backgrounds: glass costs a compositing
 * layer each, and it only reads as premium when it is rare.
 */

const MODES = {
  // baseFrequency / octaves shape the refraction; tint and specular set the rim.
  //
  // These are deliberately low-frequency. High-frequency turbulence at a large
  // displacement scale drags the backdrop into visible coloured blobs across the
  // middle of the panel, which reads as a smudge rather than glass; a broad,
  // gentle field bends the backdrop near the edges and leaves the centre legible.
  standard: { freq: '0.005 0.008', octaves: 1, specular: 0.2 },
  polar: { freq: '0.003 0.013', octaves: 1, specular: 0.26 },
  prominent: { freq: '0.008 0.012', octaves: 2, specular: 0.32 }
};

// Filters are shared rather than one per instance: a screen with a dozen glass
// elements would otherwise carry a dozen identical SVG filters.
const SCALES = [6, 12, 20];
const nearestScale = (n) => SCALES.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a));
const filterId = (mode, scale) => `glass-${mode}-${scale}`;

/** Rendered once near the app root. */
export function GlassFilters() {
  return (
    <svg aria-hidden focusable="false" width="0" height="0" className="absolute">
      <defs>
        {Object.entries(MODES).flatMap(([mode, cfg]) =>
          SCALES.map((scale) => (
            <filter key={filterId(mode, scale)} id={filterId(mode, scale)} x="-15%" y="-15%" width="130%" height="130%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency={cfg.freq}
                numOctaves={cfg.octaves}
                seed="7"
                result="noise"
              />
              <feGaussianBlur in="noise" stdDeviation="4" result="soft" />
              <feDisplacementMap
                in="SourceGraphic"
                in2="soft"
                scale={scale}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          ))
        )}
      </defs>
    </svg>
  );
}

export function GlassSurface({
  children,
  as: Tag = 'div',
  cornerRadius = 18,
  padding,
  blurAmount = 14,
  saturation = 150,
  displacementScale = 12,
  aberrationIntensity = 0,
  elasticity = 0,
  mode = 'standard',
  refract = true,
  className,
  style,
  ...props
}) {
  const cfg = MODES[mode] || MODES.standard;
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  const [tilt, setTilt] = useState(null);

  // Elasticity follows the pointer over this element only — no global listener,
  // and nothing at all on touch or with reduced motion, where it means nothing.
  useEffect(() => {
    const el = ref.current;
    if (!el || !elasticity || reduced) return;
    if (window.matchMedia('(hover: none)').matches) return;

    const move = (e) => {
      const r = el.getBoundingClientRect();
      setTilt({
        x: ((e.clientX - r.left) / r.width - 0.5) * elasticity * 14,
        y: ((e.clientY - r.top) / r.height - 0.5) * elasticity * 14
      });
    };
    const reset = () => setTilt(null);

    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', reset);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', reset);
    };
  }, [elasticity, reduced]);

  const warp = refract ? ` url(#${filterId(mode, nearestScale(displacementScale))})` : '';
  const backdrop = `blur(${blurAmount}px) saturate(${saturation}%)${warp}`;

  return (
    <Tag
      ref={ref}
      className={cn('relative', className)}
      style={{ borderRadius: cornerRadius, ...style }}
      {...props}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-[inherit]"
        style={{
          backdropFilter: backdrop,
          WebkitBackdropFilter: backdrop,
          background: `rgb(var(--glass-tint) / var(--glass-alpha))`
        }}
      />

      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          border: '1px solid var(--glass-border)',
          boxShadow: `inset 0 1px 0 var(--glass-specular), inset 0 -1px 0 rgb(255 255 255 / ${cfg.specular * 0.2}), var(--shadow-float)`,
          transform: tilt ? `translate(${tilt.x}px, ${tilt.y}px)` : undefined,
          transition: 'transform .2s var(--ease-out-soft)'
        }}
      />

      {aberrationIntensity > 0 && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-screen"
          style={{
            background: `linear-gradient(118deg, rgb(120 150 255 / ${0.04 * aberrationIntensity}) 0%, transparent 30%, transparent 70%, rgb(255 140 190 / ${0.035 * aberrationIntensity}) 100%)`
          }}
        />
      )}

      <div className="relative" style={{ padding }}>
        {children}
      </div>
    </Tag>
  );
}

/** Glass tuned for a tappable control, with a press response. */
export function GlassButton({ className, cornerRadius = 999, children, ...props }) {
  return (
    <GlassSurface
      as="button"
      type="button"
      cornerRadius={cornerRadius}
      blurAmount={16}
      displacementScale={6}
      mode="polar"
      className={cn(
        'transition-transform duration-150 active:scale-[0.97] disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </GlassSurface>
  );
}
