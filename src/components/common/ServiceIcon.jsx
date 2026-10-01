import { createElement } from 'react';
import { iconForService } from '@/constants/icons';
import { cn } from '@/lib/utils';

/**
 * A service's icon from the shared map.
 *
 * `createElement` rather than JSX because the component comes from a lookup:
 * written as `<Icon />` it reads to tooling like a component built during
 * render, which is the thing that would actually be a bug.
 */
export function ServiceIcon({ serviceType, className, ...props }) {
  return createElement(iconForService(serviceType), {
    className: cn('size-5', className),
    'aria-hidden': true,
    ...props
  });
}
