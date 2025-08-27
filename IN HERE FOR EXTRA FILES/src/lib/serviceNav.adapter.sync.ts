// src/lib/serviceNav.adapter.sync.ts
import { nearbyCoveredSingle } from '../utils/nearbyCovered.single';

export type ServiceCardSync = {
  title: string;
  desc?: string;
  href: string;
  nearby?: boolean;
};

export function toServiceCardsSync(
  crossServices: Array<{ title: string; slug: string }>,
  opts: { currentService: string; currentSuburb: string; toHref: (serviceSlug: string, suburbSlug: string) => string }
): ServiceCardSync[] {
  const { currentSuburb, toHref } = opts;
  return crossServices.map(({ title, slug }) => {
    const pick = nearbyCoveredSingle(currentSuburb, slug);
    const target = pick?.suburb || currentSuburb;
    const nearby = !!pick?.nearby;
    return {
      title: nearby ? `${title} (nearby)` : title,
      desc: nearby ? `Closest available to ${currentSuburb}` : `Available in ${currentSuburb}`,
      href: toHref(slug, target),
      nearby
    };
  });
}
