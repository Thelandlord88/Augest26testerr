// src/utils/internalLinksAdapter.ts
/**
 * Cross-service linking adapter.
 *
 * Exposes:
 *  - getCrossServiceItems(suburb): Promise<CrossServiceItem[]>
 *      Builds "Spring Cleaning" and "Bathroom Deep Clean" items.
 *      Uses same-suburb when covered; otherwise falls back to a nearby covered suburb in the same cluster.
 *  - getCrossServiceLinks(suburb): RelatedLink[]
 *      Synchronous quick links wrapper around your internal helper for same-suburb targeted links.
 *  - getLocalGuidesLink(suburb): string
 *      BLOG_BASE-aware cluster "Local guides" URL for the suburb.
 *  - getRelatedServiceLinks(opts): passthrough re-export so existing callers can import from the adapter.
 *
 * Assumptions (present in your repo):
 *  - ~/utils/internalLinks exports:
 *      - isServiceCovered(serviceId, suburbSlug): boolean
 *      - getSuburbCrossLinks(suburbSlug): RelatedLink[]
 *      - getRelatedServiceLinks(options): RelatedLink[]
 *      - getLocalBlogLink(suburbSlug): string
 *      - unslugToName(slug): string
 *  - ~/utils/nearbyCovered exports:
 *      - nearbyCovered(serviceId, suburbSlug, limit?): Promise<string[]>
 */

import type { ServiceId, RelatedLink } from '~/utils/internalLinks';
import {
  isServiceCovered,
  getSuburbCrossLinks,
  getRelatedServiceLinks,
  getLocalBlogLink,
  unslugToName,
} from '~/utils/internalLinks';
import { nearbyCovered } from '~/utils/nearbyCovered';

// Two cross-service items we always try to surface.
const CROSS_SERVICES = ['spring-cleaning', 'bathroom-deep-clean'] as const;
export type CrossService = (typeof CROSS_SERVICES)[number];

export type CrossServiceItem = {
  /** User-facing label, e.g. "Spring Cleaning" or "Bathroom Deep Clean (nearby)" */
  label: string;
  /** Target URL */
  href: string;
  /** true when link is for the same suburb; false when we’re linking to a fallback nearby suburb */
  here: boolean;
  /** Extra metadata (handy for analytics) */
  data: {
    service: CrossService;
    suburb: string; // the suburb in the href (might be the same or the fallback)
    source?: 'same-suburb' | 'nearby';
  };
};

function serviceLabel(svc: CrossService): string {
  return svc === 'spring-cleaning' ? 'Spring Cleaning' : 'Bathroom Deep Clean';
}

/**
 * Build cross-service items for a given suburb.
 * If a given service isn’t covered in this suburb, fall back to the nearest *covered* same-cluster suburb.
 */
export async function getCrossServiceItems(suburbSlug: string): Promise<CrossServiceItem[]> {
  const out: CrossServiceItem[] = [];

  for (const svc of CROSS_SERVICES) {
    const coveredHere = isServiceCovered(svc as ServiceId, suburbSlug);

    let targetSuburb = suburbSlug;
    let here = true;

    if (!coveredHere) {
      const near = await nearbyCovered(svc as ServiceId, suburbSlug, 1);
      if (!near || near.length === 0) {
        // No viable target; skip this service item.
        continue;
      }
      targetSuburb = near[0];
      here = false;
    }

    const label = here ? serviceLabel(svc) : `${serviceLabel(svc)} (nearby)`;

    out.push({
      label,
      href: `/services/${svc}/${targetSuburb}/`,
      here,
      data: {
        service: svc,
        suburb: targetSuburb,
        source: here ? 'same-suburb' : 'nearby',
      },
    });
  }

  return out;
}

/**
 * Synchronous “quick links” for same-suburb cross-service + local guides.
 * This simply delegates to your existing helper so existing semantics are preserved.
 */
export function getCrossServiceLinks(suburbSlug: string): RelatedLink[] {
  return getSuburbCrossLinks(suburbSlug);
}

/** BLOG_BASE-aware local “guides” hub for the suburb’s cluster. */
export function getLocalGuidesLink(suburbSlug: string): string {
  return getLocalBlogLink(suburbSlug);
}

/** Passthrough re-exports for convenience/back-compat with existing imports. */
export { getRelatedServiceLinks, unslugToName };

