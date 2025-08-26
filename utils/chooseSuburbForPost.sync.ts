// src/utils/chooseSuburbForPost.sync.ts
import { repSuburbSync } from './repSuburb.sync';

export function chooseSuburbForPostSync(opts: {
  frontMatterSuburb?: string;
  suburbs?: string[];
  slug?: string;
  cluster?: string;
}): string | null {
  const { frontMatterSuburb, suburbs, slug, cluster } = opts;
  if (frontMatterSuburb) return frontMatterSuburb;
  if (suburbs?.length) return suburbs[0];

  if (slug) {
    const token = slug.split('-').pop();
    if (token && /^[a-z-]+$/.test(token)) return token;
  }

  if (cluster) return repSuburbSync(cluster);
  return null;
}
