// src/utils/internalLinksAdapter.ts
/**
 * Cross-service linking adapter.
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

const CROSS_SERVICES = ['spring-cleaning', 'bathroom-deep-clean'] as const;
export type CrossService = (typeof CROSS_SERVICES)[number];

export type CrossServiceItem = {
  label: string;
  href: string;
  here: boolean;
  data: {
    service: CrossService;
    suburb: string;
    source?: 'same-suburb' | 'nearby';
  };
};

function serviceLabel(svc: CrossService): string {
  return svc === 'spring-cleaning' ? 'Spring Cleaning' : 'Bathroom Deep Clean';
}

export async function getCrossServiceItems(suburbSlug: string): Promise<CrossServiceItem[]> {
  const out: CrossServiceItem[] = [];

  for (const svc of CROSS_SERVICES) {
    const coveredHere = isServiceCovered(svc as ServiceId, suburbSlug);

    let targetSuburb = suburbSlug;
    let here = true;

    if (!coveredHere) {
      const near = await nearbyCovered(svc as ServiceId, suburbSlug, 1);
      if (!near || near.length === 0) {
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

export function getCrossServiceLinks(suburbSlug: string): RelatedLink[] {
  return getSuburbCrossLinks(suburbSlug);
}

export function getLocalGuidesLink(suburbSlug: string): string {
  return getLocalBlogLink(suburbSlug);
}

export { getRelatedServiceLinks, unslugToName };
