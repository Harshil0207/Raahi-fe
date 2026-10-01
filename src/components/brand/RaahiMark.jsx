import { MARK_BOX, MARK_VIEWBOX, WHEEL_SHAPES } from '@/constants/brand';
import { cn } from '@/lib/utils';

/**
 * The Raahi mark: the cyclist's front wheel, with the road cut out of it.
 *
 * It is the same artwork the loading animation rides on, cropped to itself
 * rather than redrawn — so the mark in the corner and the wheel going past on
 * the loading screen are the one object, and neither can drift from the other.
 *
 * The centre is a CUT-OUT, not a white shape. One path, even-odd fill: the
 * hole shows whatever is behind the mark, which is why it works unchanged on
 * paper, on ink, and on a photograph, and why it needs no dark-mode variant.
 */
export function RaahiMark({ className, title = 'Raahi', ...props }) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      className={cn('size-6', className)}
      role={title ? 'img' : 'presentation'}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {WHEEL_SHAPES.map((shape, i) => (
        <path
          // The shapes are fixed artwork in a fixed order; there is no key but
          // the index, and nothing reorders them.
                key={i}
          d={shape.d}
          fill={shape.fill}
          fillRule={shape.evenodd ? 'evenodd' : undefined}
        />
      ))}
    </svg>
  );
}

/**
 * The mark on a plate, for the places that want a logo tile.
 *
 * The plate sits BEHIND the mark and the mark keeps its own colour. Drawing
 * the wheel in the surface colour over a green plate instead — which is what
 * this did first — covers the plate with a white disc and leaves only the
 * corners showing, so the result reads as a green ring with something in it
 * rather than as the mark.
 */
export function RaahiTile({ className, radius = '24%', title = 'Raahi', ...props }) {
  const { x, y, size } = MARK_BOX;

  // The plate is a little larger than the disc, so the mark has room to sit in.
  const pad = size * 0.16;

  return (
    <svg
      viewBox={`${x - pad} ${y - pad} ${size + pad * 2} ${size + pad * 2}`}
      className={cn('size-8', className)}
      role={title ? 'img' : 'presentation'}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      <rect
        x={x - pad}
        y={y - pad}
        width={size + pad * 2}
        height={size + pad * 2}
        rx={radius}
        fill="var(--surface-elevated, #fff)"
      />
      {WHEEL_SHAPES.map((shape, i) => (
        <path key={i} d={shape.d} fill={shape.fill} fillRule={shape.evenodd ? 'evenodd' : undefined} />
      ))}
    </svg>
  );
}
