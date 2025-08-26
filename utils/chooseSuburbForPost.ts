import { getSuburbsForCluster, normSlug } from '~/utils/clusterMap';
import { representativeOfCluster } from '~/utils/repSuburb';
import slugify from '~/utils/slugify';

export interface PostFrontmatter { suburbSlug?: string; suburbs?: string[]; }

const norm = (s: string) => normSlug(String(s || ''));

export async function chooseSuburbForPost(frontmatter: PostFrontmatter, clusterFromUrl: string, postSlug: string): Promise<string | null> {
  const cluster = norm(clusterFromUrl);
  const subs = getSuburbsForCluster(cluster).map(norm); // existing getSuburbsForCluster is sync (areas inversion)
  if (!subs.length) return representativeOfCluster(cluster);

  if (frontmatter?.suburbSlug) {
    const s = norm(slugify(frontmatter.suburbSlug));
    if (subs.includes(s)) return s;
  }

  if (Array.isArray(frontmatter?.suburbs) && frontmatter.suburbs.length) {
    const s = norm(slugify(frontmatter.suburbs[0]));
    if (subs.includes(s)) return s;
  }

  const tokens = norm(postSlug).split(/[^a-z0-9]+/g).filter(Boolean);
  for (const s of subs) {
    const parts = s.split('-');
    if (parts.every(p => tokens.includes(p))) return s;
  }

  return representativeOfCluster(cluster);
}
