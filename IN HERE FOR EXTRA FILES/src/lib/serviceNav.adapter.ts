import type { CrossServiceItem } from '~/lib/crossService';
import { SERVICE_LABEL, SERVICE_ICON } from './serviceMeta';
import { unslugToName } from '~/utils/internalLinks';

export type ServiceCard = {
  title: string;
  desc: string;
  href: string;
  icon: string;
  attrs: Record<string, string>;
};

export function toServiceCards(items: CrossServiceItem[], ctx: { currentSuburb: string }): ServiceCard[] {
  const hereName = unslugToName(ctx.currentSuburb);
  return items.map(i => {
    const svc = i.data.service;
    const title = SERVICE_LABEL[svc] || i.label;
    const targetName = unslugToName(i.data.suburb);
    const desc = i.here ? `Available in ${hereName}` : `Available nearby in ${targetName}`;
    return {
      title,
      desc,
      href: i.href,
      icon: SERVICE_ICON[svc] || 'M12 4v16',
      attrs: {
        'data-nearby': String(!i.here),
        'data-service': svc,
        'data-target-suburb': i.data.suburb
      }
    };
  });
}

export function toPopularSuburbs(
  coverage: Record<string, string[]>,
  service: string,
  suburb: string,
  opts: { clusterOf: (s: string) => string | null; limit?: number }
) {
  const { clusterOf, limit = 14 } = opts;
  const cluster = clusterOf(suburb);
  const list = (coverage[service] || [])
    .filter(s => s !== suburb && (!cluster || clusterOf(s) === cluster))
    .sort()
    .slice(0, limit);
  return list.map(s => ({ label: unslugToName(s), href: `/services/${service}/${s}/` }));
}
