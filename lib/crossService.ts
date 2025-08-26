// Static synchronous accessor for precomputed cross-service map.
import crossServiceMap from '~/data/crossServiceMap.json' assert { type: 'json' };
import { getLocalBlogLink } from '~/utils/internalLinks';

export type CrossService = 'spring-cleaning' | 'bathroom-deep-clean';
export interface CrossServiceItem {
  label: string;
  href: string;
  here: boolean;
  data: { service: CrossService; suburb: string; source?: 'same-suburb' | 'nearby' };
}

type MapShape = Record<string, Record<string, CrossServiceItem[]>>;
const MAP = crossServiceMap as MapShape;

export function getCrossServiceItems(suburbSlug: string, currentService: string): CrossServiceItem[] {
  return MAP[suburbSlug]?.[currentService] ?? [];
}

export function getCrossServiceLinks(args: { suburbSlug: string; currentService: string }) {
  const { suburbSlug, currentService } = args;
  return {
    crossServices: getCrossServiceItems(suburbSlug, currentService),
    localGuides: getLocalBlogLink(suburbSlug)
  };
}
